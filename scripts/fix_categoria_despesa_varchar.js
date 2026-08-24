require('dotenv').config();
const { sequelize } = require('../src/models');

async function run() {
  await sequelize.query("ALTER TABLE despesas MODIFY COLUMN categoria VARCHAR(255) NOT NULL");
  console.log('✅ Coluna categoria agora é VARCHAR(255) — aceita qualquer nome do Plano de Contas');
  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
