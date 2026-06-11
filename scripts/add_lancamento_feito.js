require('dotenv').config();
const { sequelize } = require('../src/models');

async function run() {
  try {
    await sequelize.query(`
      ALTER TABLE agendamentos
      ADD COLUMN IF NOT EXISTS lancamento_feito TINYINT(1) NOT NULL DEFAULT 0
    `);
    console.log('OK coluna lancamento_feito adicionada');
  } catch (e) {
    console.log('Coluna já existe ou erro:', e.message);
  }
  process.exit(0);
}
run();
