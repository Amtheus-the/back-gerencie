const { sequelize } = require('../src/config/database');

async function run() {
  try {
    await sequelize.authenticate();
    await sequelize.query(`
      ALTER TABLE documentos
      ADD COLUMN IF NOT EXISTS autentique_id VARCHAR(100) NULL;
    `);
    console.log('✅ Coluna autentique_id adicionada');
  } catch (e) {
    console.error('Erro:', e.message);
  } finally {
    await sequelize.close();
  }
}

run();
