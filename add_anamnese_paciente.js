const { Sequelize } = require('sequelize');

const seq = new Sequelize('u410205205_gerencie', 'u410205205_rootgerencie', 'Gerencie1@', {
  host: 'srv1722.hstgr.io', port: 3306, dialect: 'mysql', logging: false,
});

async function run() {
  await seq.authenticate();
  console.log('Conectado.');

  const queries = [
    "ALTER TABLE pacientes ADD COLUMN anamnese_data JSON NULL COMMENT 'Respostas da anamnese preenchida'",
    "ALTER TABLE pacientes ADD COLUMN anamnese_updated_at DATETIME NULL COMMENT 'Data do último preenchimento da anamnese'",
  ];

  for (const q of queries) {
    try {
      await seq.query(q);
      console.log('✅', q.split(' ADD COLUMN ')[1].split(' ')[0]);
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('ℹ️  Coluna já existe:', q.split(' ADD COLUMN ')[1].split(' ')[0]);
      } else throw e;
    }
  }

  await seq.close();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
