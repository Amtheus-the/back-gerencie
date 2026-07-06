const { Sequelize } = require('sequelize');
const seq = new Sequelize('u410205205_gerencie', 'u410205205_rootgerencie', 'Gerencie1@', {
  host: 'srv1722.hstgr.io', port: 3306, dialect: 'mysql', logging: false,
});
const UID = 'dafdc7f0-bcfa-4b31-ab46-614b55f17afe';

async function run() {
  // Faturamentos por mês (últimos 12)
  const porMes = await seq.query(
    'SELECT DATE_FORMAT(data, "%Y-%m") as mes, tipo_pessoa, SUM(valor) as total, COUNT(*) as n FROM faturamentos WHERE user_id = ? AND data >= "2025-07-01" GROUP BY mes, tipo_pessoa ORDER BY mes',
    { replacements: [UID], type: seq.QueryTypes.SELECT }
  );
  console.log('\n=== FATURAMENTOS POR MÊS (novo) ===');
  let rbt12 = 0;
  porMes.forEach(x => { console.log(x.mes, x.tipo_pessoa, 'R$'+x.total, '('+x.n+')'); rbt12 += parseFloat(x.total); });
  console.log('RBT12 calculado:', rbt12.toFixed(2));

  // Despesas
  const desp = await seq.query(
    'SELECT COUNT(*) as n, SUM(valor) as total FROM despesas WHERE user_id = ?',
    { replacements: [UID], type: seq.QueryTypes.SELECT }
  );
  console.log('\n=== DESPESAS (novo) ===', desp[0]);

  await seq.close();
}
run().catch(e => { console.error(e.message); process.exit(1); });
