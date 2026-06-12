const { Client } = require('pg');
const pg = new Client({
  connectionString: 'postgresql://u4aocqmekiloko:p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008@cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/ddcojs3bgb93c',
  ssl: { rejectUnauthorized: false }
});

pg.connect().then(async () => {
  const { rows } = await pg.query(
    "SELECT id, email, nome FROM usuarios WHERE email ILIKE '%vitoria%' OR email ILIKE '%cervigni%' OR nome ILIKE '%vitoria%' OR nome ILIKE '%cervigni%'"
  );
  console.log('Busca vitoria:', JSON.stringify(rows, null, 2));

  const { rows: tot } = await pg.query('SELECT COUNT(*) FROM usuarios');
  console.log('Total usuarios:', tot[0].count);

  // Lista todos para checar
  const { rows: todos } = await pg.query('SELECT id, email, nome FROM usuarios ORDER BY id LIMIT 50');
  console.log('Todos usuarios:');
  todos.forEach(u => console.log(' -', u.email, '|', u.nome));

  await pg.end();
}).catch(e => console.error(e.message));
