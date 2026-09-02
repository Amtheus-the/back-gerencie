require('dotenv').config();
const { sequelize } = require('../src/models');

async function run() {
  try {
    await sequelize.query("ALTER TABLE clinicas ADD COLUMN atende_odontologia BOOLEAN NOT NULL DEFAULT TRUE");
    console.log('✅ Coluna atende_odontologia adicionada em clinicas');
  } catch (e) {
    if (e.message.includes('Duplicate column name')) {
      console.log('⏭  Coluna atende_odontologia já existe');
    } else throw e;
  }

  try {
    await sequelize.query("ALTER TABLE clinicas ADD COLUMN atende_estetica BOOLEAN NOT NULL DEFAULT FALSE");
    console.log('✅ Coluna atende_estetica adicionada em clinicas');
  } catch (e) {
    if (e.message.includes('Duplicate column name')) {
      console.log('⏭  Coluna atende_estetica já existe');
    } else throw e;
  }

  try {
    await sequelize.query('ALTER TABLE pacientes ADD COLUMN estetica_data JSON NULL');
    console.log('✅ Coluna estetica_data adicionada em pacientes');
  } catch (e) {
    if (e.message.includes('Duplicate column name')) {
      console.log('⏭  Coluna estetica_data já existe');
    } else throw e;
  }

  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
