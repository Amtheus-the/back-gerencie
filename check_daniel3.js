const { Sequelize } = require('sequelize');
const seq = new Sequelize('u410205205_gerencie', 'u410205205_rootgerencie', 'Gerencie1@', {
  host: 'srv1722.hstgr.io', port: 3306, dialect: 'mysql', logging: false,
});
const UID = 'dafdc7f0-bcfa-4b31-ab46-614b55f17afe';

async function run() {
  // Despesas de junho/26 no novo sistema
  const desp = await seq.query(
    'SELECT descricao, valor, data, dedutivel FROM despesas WHERE user_id = ? AND data LIKE "2026-06%" ORDER BY data',
    { replacements: [UID], type: seq.QueryTypes.SELECT }
  );
  console.log(`=== DESPESAS JUNHO novo (${desp.length}) ===`);
  let total = 0;
  desp.forEach(d => { console.log(d.data, d.dedutivel?'[DED]':'     ', 'R$'+d.valor, d.descricao); total += parseFloat(d.valor); });
  console.log('Total:', total.toFixed(2));

  // Rendimentos PF de junho
  const pfJun = await seq.query(
    'SELECT SUM(valor) as total FROM faturamentos WHERE user_id = ? AND tipo_pessoa = "PF" AND data LIKE "2026-06%"',
    { replacements: [UID], type: seq.QueryTypes.SELECT }
  );
  console.log('\nRendimentos PF junho:', pfJun[0].total);

  await seq.close();
}
run().catch(e => { console.error(e.message); process.exit(1); });
