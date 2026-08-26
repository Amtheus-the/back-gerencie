require('dotenv').config();
const { sequelize } = require('../src/models');

async function run() {
  try {
    await sequelize.query('ALTER TABLE agendamentos ADD COLUMN procedimentos JSON NULL');
    console.log('✅ Coluna procedimentos adicionada em agendamentos');
  } catch (e) {
    if (e.message.includes('Duplicate column name')) {
      console.log('⏭  Coluna procedimentos já existe');
    } else throw e;
  }
  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
