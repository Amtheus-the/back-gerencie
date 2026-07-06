const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const backup = require('./backup_daniel.json');

const NOVO_USER_ID    = 'dafdc7f0-bcfa-4b31-ab46-614b55f17afe';
const NOVO_CLINICA_ID = 'dc2db02e-2752-4016-a68d-22c6d654cdf4';

const seq = new Sequelize('u410205205_gerencie', 'u410205205_rootgerencie', 'Gerencie1@', {
  host: 'srv1722.hstgr.io', port: 3306, dialect: 'mysql', logging: false,
});

function mapFP(fp) {
  if (!fp) return 'Outros';
  const m = { 'Dinheiro':'Dinheiro','Cartão de Débito':'Cartão de Débito','Cartão de Crédito':'Cartão de Crédito','Pix':'PIX','PIX':'PIX','Transferência':'Transferência','Cheque':'Cheque' };
  return m[fp] || 'Outros';
}

async function run() {
  await seq.authenticate();
  console.log('Conectado.\n');
  const stats = { pacientes:0, procedimentos:0, planoContas:0, faturamentos:0, erros:[] };
  const pacienteMap = {};
  const pacientesById = {};
  for (const p of backup.pacientes) pacientesById[p.id] = p;

  // 1. PACIENTES
  console.log(`Importando ${backup.pacientes.length} pacientes...`);
  for (const p of backup.pacientes) {
    const novoId = uuidv4();
    pacienteMap[p.id] = novoId;
    if (p.cpf) {
      const [ex] = await seq.query('SELECT id FROM pacientes WHERE cpf_cnpj = ? AND clinica_id = ? LIMIT 1', { replacements: [p.cpf, NOVO_CLINICA_ID], type: seq.QueryTypes.SELECT });
      if (ex) { pacienteMap[p.id] = ex.id; continue; }
    }
    try {
      await seq.query(`INSERT INTO pacientes (id,nome,cpf_cnpj,tipo_pessoa,email,telefone,cep,logradouro,numero,bairro,cidade,estado,data_nascimento,ativo,user_id,clinica_id,created_at,updated_at) VALUES (?,?,?,'PF',?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
        { replacements: [novoId,p.nome,p.cpf||null,p.email||null,p.telefone||null,p.cep||null,p.rua||null,p.numero||null,p.bairro||null,p.municipio||null,p.estado||null,p.data_nascimento||null,p.status?1:0,NOVO_USER_ID,NOVO_CLINICA_ID], type: seq.QueryTypes.INSERT });
      stats.pacientes++;
    } catch(e) { stats.erros.push(`Paciente ${p.nome}: ${e.message}`); }
  }
  console.log(`  ✓ ${stats.pacientes} pacientes inseridos\n`);

  // 2. PROCEDIMENTOS (0 neste caso)
  console.log(`Sem procedimentos para importar.\n`);

  // 3. PLANO DE CONTAS
  console.log(`Importando ${backup.plano_de_contas.length} contas...`);
  let cod = 1;
  for (const c of backup.plano_de_contas) {
    const [ex] = await seq.query('SELECT id FROM plano_contas WHERE nome = ? AND user_id = ? LIMIT 1', { replacements: [c.nome, NOVO_USER_ID], type: seq.QueryTypes.SELECT });
    if (ex) continue;
    try {
      await seq.query(`INSERT INTO plano_contas (id,codigo,nome,tipo,dedutivel,ativo,user_id,created_at,updated_at) VALUES (?,?,?,'despesa',?,1,?,NOW(),NOW())`,
        { replacements: [uuidv4(), `D${String(cod++).padStart(2,'0')}`, c.nome, c.tipo==='dedutivel'?1:0, NOVO_USER_ID], type: seq.QueryTypes.INSERT });
      stats.planoContas++;
    } catch(e) { stats.erros.push(`PlanoContas ${c.nome}: ${e.message}`); }
  }
  console.log(`  ✓ ${stats.planoContas} contas inseridas\n`);

  // 4. FATURAMENTOS
  console.log(`Importando ${backup.rendimentos.length} faturamentos...`);
  for (const r of backup.rendimentos) {
    const [ex] = await seq.query('SELECT id FROM faturamentos WHERE descricao = ? AND data = ? AND valor = ? AND user_id = ? LIMIT 1', { replacements: [r.descricao, r.data, r.valor, NOVO_USER_ID], type: seq.QueryTypes.SELECT });
    if (ex) continue;

    const isNF = r.tipo_rendimento === 'Nota Fiscal';
    const pacNome = r.paciente_id && pacientesById[r.paciente_id] ? pacientesById[r.paciente_id].nome : 'Paciente não identificado';
    const pacCpf  = r.paciente_id && pacientesById[r.paciente_id] ? pacientesById[r.paciente_id].cpf : null;
    const pacIdNovo = r.paciente_id ? pacienteMap[r.paciente_id] || null : null;

    try {
      await seq.query(`INSERT INTO faturamentos (id,descricao,valor,data,forma_pagamento,paciente,cpf,tipo_pessoa,paciente_id,recibo_url,nota_emitida,user_id,clinica_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
        { replacements: [uuidv4(),r.descricao,r.valor,r.data,mapFP(r.forma_pagamento),pacNome,pacCpf||r.cpf||null,isNF?'PJ':'PF',pacIdNovo,r.recibo||null,isNF?1:0,NOVO_USER_ID,NOVO_CLINICA_ID], type: seq.QueryTypes.INSERT });
      stats.faturamentos++;
    } catch(e) { stats.erros.push(`Fat id=${r.id}: ${e.message}`); }
  }
  console.log(`  ✓ ${stats.faturamentos} faturamentos inseridos\n`);

  console.log('═══════════════════════════════════════');
  console.log('MIGRAÇÃO DANIEL CAETANO VAZ — CONCLUÍDA');
  console.log('═══════════════════════════════════════');
  console.log(`Pacientes:     ${stats.pacientes}`);
  console.log(`Plano contas:  ${stats.planoContas}`);
  console.log(`Faturamentos:  ${stats.faturamentos}`);
  if (stats.erros.length) { console.log(`\nErros (${stats.erros.length}):`); stats.erros.forEach(e => console.log('  ✗', e)); }

  await seq.close();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
