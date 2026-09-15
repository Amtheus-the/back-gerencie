require('dotenv').config();
process.env.DB_HOST = 'srv1722.hstgr.io';
const { sequelize } = require('../src/models');

async function run() {
  try {
    await sequelize.query('ALTER TABLE agendamentos ADD COLUMN orcamento_id CHAR(36) NULL');
    console.log('✅ Coluna orcamento_id adicionada em agendamentos');
  } catch (e) {
    if (e.message.includes('Duplicate column name')) {
      console.log('⏭  Coluna orcamento_id já existe');
    } else throw e;
  }
}

run().then(() => process.exit(0)).catch(e => { console.error('❌', e.message); process.exit(1); });
