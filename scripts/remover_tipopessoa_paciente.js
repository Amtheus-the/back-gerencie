require('dotenv').config();
const { sequelize } = require('../src/models');

async function run() {
  try {
    await sequelize.query('ALTER TABLE pacientes DROP COLUMN tipo_pessoa');
    console.log('✅ Coluna tipo_pessoa removida de pacientes');
  } catch (e) {
    if (e.message.includes("check that column/key exists") || e.message.includes('Unknown column')) {
      console.log('⏭  Coluna já não existe');
    } else {
      console.error('❌ Erro:', e.message);
    }
  }
  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
