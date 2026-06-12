/**
 * Migração: dados financeiros da Vitória (ID 364 no PostgreSQL antigo) → MySQL novo
 *
 * Vitória nova:
 *   clinica_id: d89ededf-7f53-4925-abbf-2b79eca9fe59
 *   user_id:    e0e70c63-eaae-46a0-902e-1f065fac799f
 */

const { Client } = require('pg');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const PG_URL = 'postgresql://u4aocqmekiloko:p526a99af94647c79e371b203d85763879b30c65a33b494e02ac6a81c634ee008@cbhk6rs82poqi7.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/ddcojs3bgb93c';

const MYSQL_CONFIG = {
  host: 'srv1722.hstgr.io',
  user: 'u410205205_rootgerencie',
  password: 'Gerencie1@',
  database: 'u410205205_gerencie',
};

const NOVA_CLINICA_ID = 'd89ededf-7f53-4925-abbf-2b79eca9fe59';
const NOVO_USER_ID    = 'e0e70c63-eaae-46a0-902e-1f065fac799f';
const VELHO_USER_ID   = 364; // vitoria@gmail.com no sistema antigo

async function run() {
  // ─── PostgreSQL ───────────────────────────────────────────────
  const pg = new Client({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  console.log('✅ PostgreSQL conectado');

  // Inspeciona colunas
  const { rows: rendCols } = await pg.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='rendimentos' ORDER BY ordinal_position`
  );
  console.log('Colunas rendimentos:', rendCols.map(c => c.column_name).join(', '));

  const { rows: pagCols } = await pg.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='pagamentos' ORDER BY ordinal_position`
  );
  console.log('Colunas pagamentos:', pagCols.map(c => c.column_name).join(', '));

  // Busca rendimentos da Vitória
  const { rows: rendimentos } = await pg.query(
    `SELECT * FROM rendimentos WHERE usuario_id = $1 ORDER BY data`,
    [VELHO_USER_ID]
  );
  console.log(`📥 Rendimentos encontrados: ${rendimentos.length}`);
  if (rendimentos.length) console.log('  Exemplo:', JSON.stringify(rendimentos[0]));

  // Busca pagamentos da Vitória
  const { rows: pagamentos } = await pg.query(
    `SELECT * FROM pagamentos WHERE usuario_id = $1 ORDER BY data_vencimento`,
    [VELHO_USER_ID]
  );
  console.log(`📤 Pagamentos encontrados: ${pagamentos.length}`);
  if (pagamentos.length) console.log('  Exemplo:', JSON.stringify(pagamentos[0]));

  await pg.end();

  // ─── MySQL ────────────────────────────────────────────────────
  const db = await mysql.createConnection(MYSQL_CONFIG);
  console.log('✅ MySQL conectado');

  // Colunas das tabelas destino
  const [fatColsRows] = await db.query('SHOW COLUMNS FROM faturamentos');
  console.log('Colunas faturamentos MySQL:', fatColsRows.map(c => c.Field).join(', '));

  // Mapeia rendimentos → faturamentos (receitas)
  let okRend = 0, errRend = 0;
  for (const r of rendimentos) {
    try {
      const id = uuidv4();
      const data = r.data
        ? (r.data instanceof Date ? r.data.toISOString().split('T')[0] : String(r.data).split('T')[0])
        : null;
      const valor = parseFloat(r.valor) || 0;
      const descricao = r.descricao || r.procedimento || r.categoria || 'Migrado do sistema antigo';

      const formaP = r.forma_pagamento || 'Pix';
      const cpf    = r.cpf || null;
      const tipoR  = r.tipo_rendimento || 'Recibo';

      await db.query(
        `INSERT INTO faturamentos
           (id, clinica_id, user_id, descricao, valor, data, forma_pagamento, cpf, tipo_rendimento, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [id, NOVA_CLINICA_ID, NOVO_USER_ID, descricao, valor, data, formaP, cpf, tipoR]
      );
      okRend++;
    } catch (e) {
      errRend++;
      console.error('  ❌ Rendimento erro:', e.message);
    }
  }
  console.log(`✅ Rendimentos migrados: ${okRend} ok, ${errRend} erros`);

  // Tenta migrar pagamentos
  try {
    const [pagColsRows] = await db.query('SHOW COLUMNS FROM pagamentos');
    console.log('Colunas pagamentos MySQL:', pagColsRows.map(c => c.Field).join(', '));

    let okPag = 0, errPag = 0;
    for (const p of pagamentos) {
      try {
        const id = uuidv4();
        const data = p.data_vencimento
          ? (p.data_vencimento instanceof Date ? p.data_vencimento.toISOString().split('T')[0] : String(p.data_vencimento).split('T')[0])
          : null;
        const valor = parseFloat(p.valor) || 0;
        const descricao = p.descricao || p.categoria || 'Migrado do sistema antigo';

        await db.query(
          `INSERT INTO pagamentos
             (id, clinica_id, user_id, descricao, valor, data_pagamento, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pago', NOW(), NOW())`,
          [id, NOVA_CLINICA_ID, NOVO_USER_ID, descricao, valor, data]
        );
        okPag++;
      } catch (e) {
        errPag++;
        console.error('  ❌ Pagamento erro:', e.message, JSON.stringify(p).substring(0, 100));
      }
    }
    console.log(`✅ Pagamentos migrados: ${okPag} ok, ${errPag} erros`);
  } catch (e) {
    // Tabela pagamentos pode ter nome/estrutura diferente no novo sistema
    console.log('⚠️  Tabela pagamentos:', e.message);
    console.log('   Tentando como faturamentos com tipo=despesa...');

    let okPag = 0, errPag = 0;
    for (const p of pagamentos) {
      try {
        const id = uuidv4();
        const data = p.data_vencimento
          ? (p.data_vencimento instanceof Date ? p.data_vencimento.toISOString().split('T')[0] : String(p.data_vencimento).split('T')[0])
          : null;
        const valor = parseFloat(p.valor) || 0;
        const descricao = p.descricao || p.categoria || 'Migrado do sistema antigo';

        await db.query(
          `INSERT INTO faturamentos
             (id, clinica_id, user_id, descricao, valor, data, tipo_rendimento, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'Pagamento', NOW(), NOW())`,
          [id, NOVA_CLINICA_ID, NOVO_USER_ID, descricao, valor, data]
        );
        okPag++;
      } catch (e2) {
        errPag++;
        console.error('  ❌ Pagamento (despesa) erro:', e2.message);
      }
    }
    console.log(`✅ Pagamentos→despesas migrados: ${okPag} ok, ${errPag} erros`);
  }

  await db.end();
  console.log('🎉 Migração concluída!');
}

run().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
