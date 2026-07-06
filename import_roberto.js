/**
 * Importa dados do ROBERTO AZEVEDO SILVA do backup_roberto.json
 * para o banco novo (u410205205_gerencie em srv1722.hstgr.io).
 */

const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const backup = require('../backup_roberto.json');

const NOVO_USER_ID    = '6faba01a-77c0-4880-905a-51b2d3acf6f4';
const NOVO_CLINICA_ID = '8bcbac6b-cd82-41c6-8be5-b7697642b26c';

const seq = new Sequelize('u410205205_gerencie', 'u410205205_rootgerencie', 'Gerencie1@', {
  host: 'srv1722.hstgr.io',
  port: 3306,
  dialect: 'mysql',
  logging: false,
});

function mapFormaPagamento(fp) {
  if (!fp) return 'Outros';
  const m = {
    'Dinheiro': 'Dinheiro',
    'Cartão de Débito': 'Cartão de Débito',
    'Cartão de Crédito': 'Cartão de Crédito',
    'Pix': 'PIX',
    'PIX': 'PIX',
    'Transferência': 'Transferência',
    'Cheque': 'Cheque',
  };
  return m[fp] || 'Outros';
}

async function run() {
  await seq.authenticate();
  console.log('Conectado ao banco novo.\n');

  let pacienteMap = {};
  let stats = { pacientes: 0, procedimentos: 0, planoContas: 0, faturamentos: 0, erros: [] };

  // ─── 1. PACIENTES ───────────────────────────────────────────────────────
  console.log(`Importando ${backup.pacientes.length} pacientes...`);
  for (const p of backup.pacientes) {
    const novoId = uuidv4();
    pacienteMap[p.id] = novoId;

    if (p.cpf) {
      const [existing] = await seq.query(
        'SELECT id FROM pacientes WHERE cpf_cnpj = ? AND clinica_id = ? LIMIT 1',
        { replacements: [p.cpf, NOVO_CLINICA_ID], type: seq.QueryTypes.SELECT }
      );
      if (existing) { pacienteMap[p.id] = existing.id; continue; }
    }

    try {
      await seq.query(`
        INSERT INTO pacientes
          (id, nome, cpf_cnpj, tipo_pessoa, email, telefone, cep, logradouro, numero,
           bairro, cidade, estado, data_nascimento, ativo, user_id, clinica_id,
           created_at, updated_at)
        VALUES (?, ?, ?, 'PF', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, {
        replacements: [
          novoId, p.nome, p.cpf || null, p.email || null, p.telefone || null,
          p.cep || null, p.rua || null, p.numero || null, p.bairro || null,
          p.municipio || null, p.estado || null, p.data_nascimento || null,
          p.status ? 1 : 0, NOVO_USER_ID, NOVO_CLINICA_ID,
        ],
        type: seq.QueryTypes.INSERT,
      });
      stats.pacientes++;
    } catch (e) {
      stats.erros.push(`Paciente ${p.nome}: ${e.message}`);
    }
  }
  console.log(`  ✓ ${stats.pacientes} pacientes inseridos\n`);

  // ─── 2. PROCEDIMENTOS ───────────────────────────────────────────────────
  console.log(`Importando ${backup.procedimentos.length} procedimentos...`);
  for (const p of backup.procedimentos) {
    const [existing] = await seq.query(
      'SELECT id FROM procedimentos WHERE nome = ? AND user_id = ? LIMIT 1',
      { replacements: [p.nome, NOVO_USER_ID], type: seq.QueryTypes.SELECT }
    );
    if (existing) continue;

    try {
      await seq.query(`
        INSERT INTO procedimentos
          (id, nome, descricao, valor_padrao, ativo, user_id, clinica_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, {
        replacements: [
          uuidv4(), p.nome, p.descricao || null, p.valor_padrao_clinica || null,
          p.ativo ? 1 : 0, NOVO_USER_ID, NOVO_CLINICA_ID,
        ],
        type: seq.QueryTypes.INSERT,
      });
      stats.procedimentos++;
    } catch (e) {
      stats.erros.push(`Procedimento ${p.nome}: ${e.message}`);
    }
  }
  console.log(`  ✓ ${stats.procedimentos} procedimentos inseridos\n`);

  // ─── 3. PLANO DE CONTAS ─────────────────────────────────────────────────
  console.log(`Importando ${backup.plano_de_contas.length} contas...`);
  let codigoCounter = 1;
  for (const c of backup.plano_de_contas) {
    const [existing] = await seq.query(
      'SELECT id FROM plano_contas WHERE nome = ? AND user_id = ? LIMIT 1',
      { replacements: [c.nome, NOVO_USER_ID], type: seq.QueryTypes.SELECT }
    );
    if (existing) continue;

    const isDedutivel = c.tipo === 'dedutivel';
    const codigo = `D${String(codigoCounter++).padStart(2, '0')}`;

    try {
      await seq.query(`
        INSERT INTO plano_contas
          (id, codigo, nome, tipo, dedutivel, ativo, user_id, created_at, updated_at)
        VALUES (?, ?, ?, 'despesa', ?, 1, ?, NOW(), NOW())
      `, {
        replacements: [uuidv4(), codigo, c.nome, isDedutivel ? 1 : 0, NOVO_USER_ID],
        type: seq.QueryTypes.INSERT,
      });
      stats.planoContas++;
    } catch (e) {
      stats.erros.push(`PlanoContas ${c.nome}: ${e.message}`);
    }
  }
  console.log(`  ✓ ${stats.planoContas} contas inseridas\n`);

  // ─── 4. FATURAMENTOS (rendimentos) ──────────────────────────────────────
  console.log(`Importando ${backup.rendimentos.length} faturamentos...`);
  const pacientesById = {};
  for (const p of backup.pacientes) pacientesById[p.id] = p;

  for (const r of backup.rendimentos) {
    const [existing] = await seq.query(
      'SELECT id FROM faturamentos WHERE descricao = ? AND data = ? AND valor = ? AND user_id = ? LIMIT 1',
      { replacements: [r.descricao, r.data, r.valor, NOVO_USER_ID], type: seq.QueryTypes.SELECT }
    );
    if (existing) continue;

    const pacNome = r.paciente_id && pacientesById[r.paciente_id]
      ? pacientesById[r.paciente_id].nome : 'Paciente não identificado';
    const pacCpf = r.paciente_id && pacientesById[r.paciente_id]
      ? pacientesById[r.paciente_id].cpf : null;
    const pacienteIdNovo = r.paciente_id ? pacienteMap[r.paciente_id] || null : null;

    // tipo_rendimento "Recibo" => PF / nota não emitida. "Nota Fiscal" => PJ / emitida.
    const isNotaFiscal = r.tipo_rendimento === 'Nota Fiscal';

    try {
      await seq.query(`
        INSERT INTO faturamentos
          (id, descricao, valor, data, forma_pagamento, paciente, cpf, tipo_pessoa,
           paciente_id, recibo_url, nota_emitida, user_id, clinica_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, {
        replacements: [
          uuidv4(), r.descricao, r.valor, r.data, mapFormaPagamento(r.forma_pagamento),
          pacNome, pacCpf || r.cpf || null, isNotaFiscal ? 'PJ' : 'PF',
          pacienteIdNovo, r.recibo || null, isNotaFiscal ? 1 : 0,
          NOVO_USER_ID, NOVO_CLINICA_ID,
        ],
        type: seq.QueryTypes.INSERT,
      });
      stats.faturamentos++;
    } catch (e) {
      stats.erros.push(`Faturamento id=${r.id}: ${e.message}`);
    }
  }
  console.log(`  ✓ ${stats.faturamentos} faturamentos inseridos\n`);

  console.log('═══════════════════════════════════════');
  console.log('MIGRAÇÃO ROBERTO AZEVEDO — CONCLUÍDA');
  console.log('═══════════════════════════════════════');
  console.log(`Pacientes:     ${stats.pacientes}`);
  console.log(`Procedimentos: ${stats.procedimentos}`);
  console.log(`Plano contas:  ${stats.planoContas}`);
  console.log(`Faturamentos:  ${stats.faturamentos}`);
  if (stats.erros.length > 0) {
    console.log(`\nErros (${stats.erros.length}):`);
    stats.erros.forEach(e => console.log('  ✗', e));
  }

  await seq.close();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
