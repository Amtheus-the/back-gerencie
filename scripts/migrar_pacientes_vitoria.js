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

  const { rows: pacientes } = await pg.query(
    `SELECT * FROM pacientes WHERE usuario_id = $1 ORDER BY nome`,
    [VELHO_USER_ID]
  );
  console.log(`📋 Pacientes encontrados: ${pacientes.length}`);
  await pg.end();

  const db = await mysql.createConnection(MYSQL_CONFIG);
  let ok = 0, err = 0;

  for (const p of pacientes) {
    try {
      const id = uuidv4();
      const dataNasc = p.data_nascimento
        ? (p.data_nascimento instanceof Date ? p.data_nascimento.toISOString().split('T')[0] : String(p.data_nascimento).split('T')[0])
        : null;
      const dataCad = p.data_cadastro
        ? (p.data_cadastro instanceof Date ? p.data_cadastro.toISOString().split('T')[0] : String(p.data_cadastro).split('T')[0])
        : null;

      await db.query(
        `INSERT INTO pacientes
           (id, clinica_id, user_id, nome, cpf_cnpj, tipo_pessoa, email, telefone,
            cep, logradouro, numero, bairro, cidade, estado,
            data_nascimento, ativo, dataCadastro, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'PF', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          id, NOVA_CLINICA_ID, NOVO_USER_ID,
          p.nome || '',
          p.cpf || null,
          p.email || null,
          p.telefone || null,
          p.cep || null,
          p.rua || null,
          p.numero || null,
          p.bairro || null,
          p.municipio || null,
          p.estado || null,
          dataNasc,
          p.status ? 1 : 0,
          dataCad,
        ]
      );
      ok++;
    } catch (e) {
      err++;
      console.error(`  ❌ ${p.nome}: ${e.message}`);
    }
  }

  console.log(`✅ Pacientes migrados: ${ok} ok, ${err} erros`);
  await db.end();
}

run().catch(e => console.error('❌ Fatal:', e.message));
