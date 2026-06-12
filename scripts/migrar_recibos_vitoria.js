/**
 * Copia as URLs dos recibos do sistema antigo (S3) para os faturamentos da Vitória no MySQL
 * Matching por: data + valor
 */
const { Client } = require('pg');
const mysql = require('mysql2/promise');

const PG_URL = 'postgresql://u4aocqmekiloko:p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008@cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/ddcojs3bgb93c';
const MYSQL_CONFIG = { host: 'srv1722.hstgr.io', user: 'u410205205_rootgerencie', password: 'Gerencie1@', database: 'u410205205_gerencie' };
const NOVO_USER_ID = 'e0e70c63-eaae-46a0-902e-1f065fac799f';

async function run() {
  const pg = new Client({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const { rows: rendimentos } = await pg.query(
    `SELECT id, valor, data, descricao, recibo FROM rendimentos
     WHERE usuario_id = 364 AND recibo IS NOT NULL AND recibo <> ''
     ORDER BY data`,
  );
  console.log(`Rendimentos com recibo: ${rendimentos.length}`);
  await pg.end();

  const db = await mysql.createConnection(MYSQL_CONFIG);

  let ok = 0, sem_match = 0;
  for (const r of rendimentos) {
    const data = r.data instanceof Date ? r.data.toISOString().split('T')[0] : String(r.data).split('T')[0];
    const valor = parseFloat(r.valor);

    // Extrai nome do arquivo da URL
    const partes = r.recibo.split('/');
    const nomeArquivo = partes[partes.length - 1];

    // Tenta match por data + valor
    const [rows] = await db.query(
      `SELECT id FROM faturamentos WHERE user_id = ? AND DATE(data) = ? AND valor = ? AND (recibo_url IS NULL OR recibo_url = '') LIMIT 1`,
      [NOVO_USER_ID, data, valor]
    );

    if (rows.length) {
      await db.query(
        `UPDATE faturamentos SET recibo_url = ?, recibo_nome = ? WHERE id = ?`,
        [r.recibo, nomeArquivo, rows[0].id]
      );
      ok++;
    } else {
      sem_match++;
      console.log(`  ⚠️  Sem match: R$${valor} em ${data} — ${r.descricao?.substring(0, 40)}`);
    }
  }

  console.log(`✅ Recibos atualizados: ${ok}`);
  console.log(`⚠️  Sem match: ${sem_match}`);
  await db.end();
}

run().catch(e => console.error('❌ Fatal:', e.message));
