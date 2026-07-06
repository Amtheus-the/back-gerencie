const { Sequelize } = require('sequelize');

const seq = new Sequelize('u410205205_gerencie', 'u410205205_rootgerencie', 'Gerencie1@', {
  host: 'srv1722.hstgr.io', port: 3306, dialect: 'mysql', logging: false,
});

async function run() {
  await seq.authenticate();
  console.log('Conectado.');

  try {
    await seq.query("ALTER TABLE faturamentos ADD COLUMN declarar TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Se 0, apenas controle interno — não entra nos cálculos de imposto'");
    console.log('✅ Coluna declarar adicionada com sucesso.');
  } catch (e) {
    if (e.message.includes('Duplicate column')) {
      console.log('ℹ️  Coluna declarar já existe.');
    } else {
      throw e;
    }
  }

  const [rows] = await seq.query("SELECT COUNT(*) as total FROM faturamentos WHERE declarar IS NULL");
  console.log('Registros com declarar NULL:', rows[0].total);

  await seq.close();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
