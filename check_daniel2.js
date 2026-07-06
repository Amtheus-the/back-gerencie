const { Sequelize } = require('sequelize');
const seq = new Sequelize('u410205205_gerencie', 'u410205205_rootgerencie', 'Gerencie1@', {
  host: 'srv1722.hstgr.io', port: 3306, dialect: 'mysql', logging: false,
});
const UID = 'dafdc7f0-bcfa-4b31-ab46-614b55f17afe';

async function run() {
  // PJ por mês (tudo)
  const pj = await seq.query(
    'SELECT DATE_FORMAT(data, "%Y-%m") as mes, SUM(valor) as total FROM faturamentos WHERE user_id = ? AND tipo_pessoa = "PJ" GROUP BY mes ORDER BY mes',
    { replacements: [UID], type: seq.QueryTypes.SELECT }
  );
  console.log('=== PJ FATURAMENTOS TODOS OS MESES (novo) ===');
  let rbt12 = 0;
  pj.forEach(x => {
    const inRBT = x.mes >= '2025-07' && x.mes <= '2026-06';
    if (inRBT) rbt12 += parseFloat(x.total);
    console.log(x.mes, 'R$'+x.total, inRBT ? '<- RBT12' : '');
  });
  console.log('RBT12 PJ calculado:', rbt12.toFixed(2));

  // Comparar com backup
  const backup = require('./backup_daniel.json');
  const pjBackup = {};
  backup.rendimentos.filter(r => r.tipo_rendimento === 'Nota Fiscal').forEach(r => {
    const m = r.data.substring(0,7);
    pjBackup[m] = (pjBackup[m]||0)+parseFloat(r.valor);
  });
  console.log('\n=== PJ POR MÊS NO BACKUP ANTIGO ===');
  Object.keys(pjBackup).sort().forEach(m => console.log(m, 'R$'+pjBackup[m].toFixed(2)));

  await seq.close();
}
run().catch(e => { console.error(e.message); process.exit(1); });
