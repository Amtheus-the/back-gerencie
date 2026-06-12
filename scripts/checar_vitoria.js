const mysql = require('mysql2/promise');

mysql.createConnection({ host:'srv1722.hstgr.io', user:'u410205205_rootgerencie', password:'Gerencie1@', database:'u410205205_gerencie' })
.then(async db => {
  const [rows] = await db.query(
    `SELECT DATE_FORMAT(data, '%Y-%m') as mes, tipo_rendimento, SUM(valor) as total, COUNT(*) as qtd
     FROM faturamentos WHERE user_id = 'e0e70c63-eaae-46a0-902e-1f065fac799f'
     GROUP BY mes, tipo_rendimento ORDER BY mes`
  );
  rows.forEach(r => console.log(r.mes, '|', r.tipo_rendimento, '| R$', parseFloat(r.total).toFixed(2), '(', r.qtd, ')'));

  // Detalhes de junho 2026
  console.log('\n--- Detalhes Junho 2026 ---');
  const [jun] = await db.query(
    `SELECT descricao, valor, data, tipo_rendimento FROM faturamentos
     WHERE user_id = 'e0e70c63-eaae-46a0-902e-1f065fac799f'
     AND DATE_FORMAT(data, '%Y-%m') = '2026-06' ORDER BY data`
  );
  jun.forEach(r => console.log(r.data, r.tipo_rendimento, 'R$', r.valor, '-', r.descricao?.substring(0, 50)));

  await db.end();
}).catch(e => console.error(e.message));
