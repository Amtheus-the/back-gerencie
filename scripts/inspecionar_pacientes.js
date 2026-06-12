// Inspeciona estrutura e dados de pacientes da Vitória no sistema antigo
const { Client } = require('pg');

const PG_URL = 'postgresql://u4aocqmekiloko:p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008@cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/ddcojs3bgb93c';

async function run() {
  const pg = new Client({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const { rows: cols } = await pg.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='pacientes' ORDER BY ordinal_position`
  );
  console.log('Colunas pacientes:', cols.map(c => c.column_name).join(', '));

  const { rows: pacientes } = await pg.query(
    `SELECT * FROM pacientes WHERE usuario_id = $1 ORDER BY nome LIMIT 5`,
    [364]
  );
  console.log(`\nTotal query (amostra 5):`, pacientes.length);
  if (pacientes.length) console.log('Exemplo:', JSON.stringify(pacientes[0], null, 2));

  const { rows: tot } = await pg.query(`SELECT COUNT(*) FROM pacientes WHERE usuario_id = 364`);
  console.log('Total pacientes Vitória:', tot[0].count);

  await pg.end();
}

run().catch(e => console.error('❌', e.message));
