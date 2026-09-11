/**
 * Importa os pacientes da GT Odontologia exportados do Dontus (Relatório de Pacientes → Excel).
 *
 * Uso:
 *   node scripts/importar_pacientes_gt_dontus.js "<caminho-do-xlsx>"          → dry-run (só mostra)
 *   node scripts/importar_pacientes_gt_dontus.js "<caminho-do-xlsx>" --commit → grava no banco
 *
 * Só traz o CADASTRO do paciente (nome, contato, endereço, nascimento). Nada de
 * odontograma / histórico / financeiro / anamnese.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.DB_HOST = 'srv1722.hstgr.io'; // produção

const fs = require('fs');
const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const { sequelize, Paciente } = require('../src/models');

const CLINICA_ID = 'bff19a2c-dc0a-41bc-a3b0-e4d1601393f0'; // Gt Odontologia Especializada
const USER_ID = 'cfc82973-226e-4dff-b825-cb66d2d8c5a9';    // Bárbara Gonçalves

const arquivo = process.argv[2];
const COMMIT = process.argv.includes('--commit');
if (!arquivo || !fs.existsSync(arquivo)) {
  console.error('Informe o caminho do .xlsx. Ex: node scripts/importar_pacientes_gt_dontus.js "C:/.../paciente.xlsx"');
  process.exit(1);
}

// ── Extrai sheet1.xml do xlsx (que é um zip) ──
function lerSheetXml(xlsxPath) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-'));
  fs.copyFileSync(xlsxPath, path.join(tmp, 'p.zip'));
  execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${path.join(tmp, 'p.zip')}' -DestinationPath '${tmp}' -Force"`);
  const sheet = fs.readFileSync(path.join(tmp, 'xl', 'worksheets', 'sheet1.xml'), 'utf8');
  fs.rmSync(tmp, { recursive: true, force: true });
  return sheet;
}

function parseLinhas(xml) {
  const rowRe = /<x:row[^>]*>([\s\S]*?)<\/x:row>/g;
  const cellRe = /<x:c r="([A-Z]+)\d+"[^>]*?>(?:<x:v>([\s\S]*?)<\/x:v>)?<\/x:c>/g;
  const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  let m, rows = [];
  while ((m = rowRe.exec(xml))) {
    let c, cells = {};
    while ((c = cellRe.exec(m[1]))) cells[c[1]] = c[2] !== undefined ? unesc(c[2]) : '';
    rows.push(cells);
  }
  // rows[0] = cabeçalho: A DataCadastro, B NumeroFicha, C Nome, D DataNascimento,
  // E CPF, F RG, G Email, H Endereco, I Celular, J Telefone, K Profissao, L Origem,
  // M NomeResponsavel, N CPFResponsavel, O Declarante
  return rows.slice(1).map((r) => ({
    dataCadastro: r.A, numeroFicha: r.B, nome: r.C, dataNascimento: r.D,
    cpf: r.E, rg: r.F, email: r.G, endereco: r.H, celular: r.I, telefone: r.J,
    profissao: r.K, origem: r.L, nomeResponsavel: r.M, cpfResponsavel: r.N,
  }));
}

// ── Helpers de normalização ──
const soDigitos = (s) => (s || '').replace(/\D/g, '');

function fmtCpf(v) {
  const d = soDigitos(v);
  if (d.length !== 11) return null;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function fmtTelefone(cel, tel) {
  const d = soDigitos(cel) || soDigitos(tel);
  if (!d) return null;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

function fmtData(v) {
  const s = (v || '').trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function fmtDataHora(v) {
  const iso = fmtData(v);
  return iso ? new Date(iso + 'T00:00:00') : null;
}

// "Rua X, 123 - Compl - Bairro - Cidade / UF - 00000000"
function parseEndereco(raw) {
  const out = { cep: null, logradouro: null, numero: null, complemento: null, bairro: null, cidade: null, estado: null };
  if (!raw || !raw.trim()) return out;
  let partes = raw.split(' - ').map((p) => p.trim()).filter((p) => p !== '');
  if (!partes.length) return out;

  // CEP no fim
  if (/^\d{5}-?\d{3}$/.test(partes[partes.length - 1])) {
    out.cep = soDigitos(partes.pop()).replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }
  // Cidade / UF (ou só UF) no fim
  if (partes.length) {
    const ultimo = partes[partes.length - 1];
    if (ultimo.includes('/')) {
      const [cid, uf] = ultimo.split('/').map((x) => x.trim());
      if (/^[A-Za-z]{2}$/.test(uf)) { out.cidade = cid || null; out.estado = uf.toUpperCase(); partes.pop(); }
    } else if (/^[A-Za-z]{2}$/.test(ultimo)) {
      out.estado = ultimo.toUpperCase(); partes.pop();
    }
  }
  // Primeira parte: logradouro[, numero]
  if (partes.length) {
    const primeira = partes.shift();
    const mNum = primeira.match(/^(.*?),\s*(\d+[A-Za-z]?)\s*$/);
    if (mNum) { out.logradouro = mNum[1].trim(); out.numero = mNum[2]; }
    else { out.logradouro = primeira.replace(/,\s*$/, '').trim(); }
  }
  // O que sobrou no meio: última parte = bairro, resto = complemento
  if (partes.length) {
    out.bairro = partes.pop();
    if (partes.length) out.complemento = partes.join(' - ');
  }
  return out;
}

function montarObs(p) {
  const linhas = [];
  if ((p.rg || '').trim()) linhas.push(`RG: ${p.rg.trim()}`);
  if ((p.profissao || '').trim()) linhas.push(`Profissão: ${p.profissao.trim()}`);
  const origem = (p.origem || '').trim();
  if (origem && origem !== '-') linhas.push(`Origem: ${origem}`);
  const resp = (p.nomeResponsavel || '').trim();
  if (resp) {
    const cpfR = fmtCpf(p.cpfResponsavel);
    linhas.push(`Responsável: ${resp}${cpfR ? ` (CPF ${cpfR})` : ''}`);
  }
  if ((p.numeroFicha || '').trim()) linhas.push(`Nº ficha Dontus: ${p.numeroFicha.trim()}`);
  linhas.push('Importado do Dontus em 10/09/2026');
  return linhas.join('\n');
}

function emailValido(e) {
  const v = (e || '').trim();
  return v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

(async () => {
  await sequelize.authenticate();
  console.log('✅ Banco conectado (produção)\n');

  const brutos = parseLinhas(lerSheetXml(arquivo));
  console.log(`Planilha: ${brutos.length} linhas de paciente\n`);

  const existentes = await Paciente.findAll({
    where: { clinica_id: CLINICA_ID },
    attributes: ['nome'],
    raw: true,
  });
  const jaTem = new Set(existentes.map((e) => (e.nome || '').trim().toLowerCase()));

  const registros = [];
  const pulados = [];
  for (const p of brutos) {
    const nome = (p.nome || '').trim();
    if (!nome) { pulados.push('(sem nome)'); continue; }
    if (jaTem.has(nome.toLowerCase())) { pulados.push(`${nome} (já existe)`); continue; }

    const end = parseEndereco(p.endereco);
    registros.push({
      nome,
      cpfCnpj: fmtCpf(p.cpf),
      email: emailValido(p.email),
      telefone: fmtTelefone(p.celular, p.telefone),
      dataNascimento: fmtData(p.dataNascimento),
      dataCadastro: fmtDataHora(p.dataCadastro) || new Date(),
      cep: end.cep,
      logradouro: end.logradouro,
      numero: end.numero,
      complemento: end.complemento,
      bairro: end.bairro,
      cidade: end.cidade,
      estado: end.estado,
      observacoes: montarObs(p),
      ativo: true,
      user_id: USER_ID,
      clinica_id: CLINICA_ID,
    });
  }

  console.log('── PRÉVIA ──');
  registros.forEach((r, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${r.nome}`);
    console.log(`    cpf=${r.cpfCnpj || '-'}  nasc=${r.dataNascimento || '-'}  tel=${r.telefone || '-'}  email=${r.email || '-'}`);
    console.log(`    end=${[r.logradouro, r.numero, r.complemento, r.bairro, r.cidade, r.estado, r.cep].filter(Boolean).join(' | ') || '-'}`);
  });
  if (pulados.length) console.log('\nPulados:', pulados.join('; '));
  console.log(`\nTotal a inserir: ${registros.length}`);

  if (!COMMIT) {
    console.log('\n(dry-run — rode de novo com --commit para gravar)');
    await sequelize.close();
    return;
  }

  const t = await sequelize.transaction();
  try {
    for (const r of registros) {
      await Paciente.create(r, { transaction: t });
    }
    await t.commit();
    console.log(`\n✅ ${registros.length} pacientes inseridos na Gt Odontologia Especializada.`);
  } catch (err) {
    await t.rollback();
    console.error('❌ Erro (rollback):', err.message);
    process.exitCode = 1;
  }
  await sequelize.close();
})();
