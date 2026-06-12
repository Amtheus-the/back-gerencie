/**
 * Remove os pagamentos da tabela faturamentos e insere em despesas (lugar correto)
 */
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const MYSQL_CONFIG = { host: 'srv1722.hstgr.io', user: 'u410205205_rootgerencie', password: 'Gerencie1@', database: 'u410205205_gerencie' };
const NOVA_CLINICA_ID = 'd89ededf-7f53-4925-abbf-2b79eca9fe59';
const NOVO_USER_ID    = 'e0e70c63-eaae-46a0-902e-1f065fac799f';

async function run() {
  const db = await mysql.createConnection(MYSQL_CONFIG);

  // Busca os pagamentos incorretamente em faturamentos
  const [pagamentos] = await db.query(
    `SELECT * FROM faturamentos WHERE user_id = ? AND tipo_rendimento = 'Pagamento'`,
    [NOVO_USER_ID]
  );
  console.log(`Pagamentos em faturamentos para mover: ${pagamentos.length}`);

  let ok = 0, err = 0;
  for (const p of pagamentos) {
    try {
      const id = uuidv4();
      const data = p.data
        ? (p.data instanceof Date ? p.data.toISOString().split('T')[0] : String(p.data).split('T')[0])
        : null;

      await db.query(
        `INSERT INTO despesas (id, clinica_id, user_id, descricao, valor, categoria, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'Outros', ?, NOW(), NOW())`,
        [id, NOVA_CLINICA_ID, NOVO_USER_ID, p.descricao || 'Migrado do sistema antigo', p.valor, data]
      );
      ok++;
    } catch (e) {
      err++;
      console.error('  ❌', e.message, p.descricao);
    }
  }
  console.log(`✅ Inseridos em despesas: ${ok} ok, ${err} erros`);

  // Remove os pagamentos da tabela faturamentos
  const [del] = await db.query(
    `DELETE FROM faturamentos WHERE user_id = ? AND tipo_rendimento = 'Pagamento'`,
    [NOVO_USER_ID]
  );
  console.log(`🗑️  Removidos de faturamentos: ${del.affectedRows}`);

  // Verificação final
  const [check] = await db.query(
    `SELECT DATE_FORMAT(data, '%Y-%m') as mes, SUM(valor) as total FROM faturamentos
     WHERE user_id = ? AND DATE_FORMAT(data, '%Y-%m') = '2026-06' GROUP BY mes`,
    [NOVO_USER_ID]
  );
  console.log('Faturamentos jun/2026 após correção:', check);

  const [checkD] = await db.query(
    `SELECT DATE_FORMAT(data, '%Y-%m') as mes, SUM(valor) as total FROM despesas
     WHERE user_id = ? AND DATE_FORMAT(data, '%Y-%m') = '2026-06' GROUP BY mes`,
    [NOVO_USER_ID]
  );
  console.log('Despesas jun/2026 após correção:', checkD);

  await db.end();
}

run().catch(e => console.error('❌ Fatal:', e.message));
