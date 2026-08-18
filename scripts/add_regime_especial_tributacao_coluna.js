require('dotenv').config();
const { sequelize } = require('../src/models');

async function run() {
  const sql = "ALTER TABLE clinicas ADD COLUMN regime_especial_tributacao VARCHAR(2) NULL";
  try {
    await sequelize.query(sql);
    console.log('✅ regime_especial_tributacao');
  } catch (e) {
    if (e.message.includes('Duplicate column') || e.message.includes('already exists')) {
      console.log('⏭  regime_especial_tributacao já existe');
    } else {
      console.error('❌', e.message);
    }
  }
  console.log('Pronto!');
  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
