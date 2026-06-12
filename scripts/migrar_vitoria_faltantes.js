// Migra apenas os 6 rendimentos sem forma_pagamento que falharam
const { Client } = require('pg');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const PG_URL = 'postgresql://u4aocqmekiloko:p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008@cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/ddcojs3bgb93c';
const MYSQL_CONFIG = { host: 'srv1722.hstgr.io', user: 'u410205205_rootgerencie', password: 'Gerencie1@', database: 'u410205205_gerencie' };
const NOVA_CLINICA_ID = 'd89ededf-7f53-4925-abbf-2b79eca9fe59';
const NOVO_USER_ID    = 'e0e70c63-eaae-46a0-902e-1f065fac799f';
const VELHO_USER_ID   = 364;

async function run() {
  const pg = new Client({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const { rows: rendimentos } = await pg.query(
    `SELECT * FROM rendimentos WHERE usuario_id = $1 AND (forma_pagamento IS NULL OR forma_pagamento = '') ORDER BY data`,
    [VELHO_USER_ID]
  );
  console.log(`Rendimentos sem forma_pagamento: ${rendimentos.length}`);
  await pg.end();

  const db = await mysql.createConnection(MYSQL_CONFIG);
  let ok = 0;
  for (const r of rendimentos) {
    const id = uuidv4();
    const data = r.data ? (r.data instanceof Date ? r.data.toISOString().split('T')[0] : String(r.data).split('T')[0]) : null;
    const valor = parseFloat(r.valor) || 0;
    const descricao = r.descricao || 'Migrado do sistema antigo';
    await db.query(
      `INSERT INTO faturamentos (id, clinica_id, user_id, descricao, valor, data, forma_pagamento, cpf, tipo_rendimento, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Pix', ?, ?, NOW(), NOW())`,
      [id, NOVA_CLINICA_ID, NOVO_USER_ID, descricao, valor, data, r.cpf || null, r.tipo_rendimento || 'Recibo']
    );
    ok++;
  }
  console.log(`✅ ${ok} registros migrados`);
  await db.end();
}

run().catch(e => console.error('❌', e.message));
