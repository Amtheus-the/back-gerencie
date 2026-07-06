const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const pagamentos = require('../pagamentos_daniel.json');

const NOVO_USER_ID = 'dafdc7f0-bcfa-4b31-ab46-614b55f17afe';

const seq = new Sequelize('u410205205_gerencie', 'u410205205_rootgerencie', 'Gerencie1@', {
  host: 'srv1722.hstgr.io', port: 3306, dialect: 'mysql', logging: false,
});

async function run() {
  await seq.authenticate();

  // Buscar despesas já existentes no novo sistema para não duplicar
  const existentes = await seq.query(
    'SELECT descricao, valor, data FROM despesas WHERE user_id = ?',
    { replacements: [NOVO_USER_ID], type: seq.QueryTypes.SELECT }
  );
  const existSet = new Set(existentes.map(e => `${e.descricao}|${e.valor}|${e.data}`));
  console.log(`Despesas já no banco: ${existentes.length}`);

  let inseridos = 0, pulados = 0, erros = [];

  for (const p of pagamentos) {
    const descricao = p.descricao || 'Despesa';
    const valor = parseFloat(p.valor);
    const data = p.data_vencimento;
    const isDedutivel = p.utilizado_deducao ? 1 : 0;

    // Chave de deduplicação
    const key = `${descricao}|${valor}|${data}`;
    if (existSet.has(key)) { pulados++; continue; }

    try {
      await seq.query(
        'INSERT INTO despesas (id, descricao, valor, categoria, data, tipo, dedutivel, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        { replacements: [uuidv4(), descricao, valor, 'Outros', data, 'variavel', isDedutivel, NOVO_USER_ID], type: seq.QueryTypes.INSERT }
      );
      inseridos++;
    } catch(e) {
      erros.push(`${descricao}: ${e.message}`);
    }
  }

  console.log(`\nInseridos: ${inseridos}`);
  console.log(`Pulados (já existiam): ${pulados}`);
  if (erros.length) erros.forEach(e => console.log('ERRO:', e));

  // Verificar total junho
  const jun = await seq.query(
    'SELECT COUNT(*) as n, SUM(valor) as total FROM despesas WHERE user_id = ? AND data LIKE "2026-06%"',
    { replacements: [NOVO_USER_ID], type: seq.QueryTypes.SELECT }
  );
  console.log('\nDespesas junho no banco novo:', jun[0]);

  await seq.close();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
