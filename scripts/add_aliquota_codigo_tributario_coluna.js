require('dotenv').config();
const { sequelize } = require('../src/models');

const alterações = [
  "ALTER TABLE clinicas ADD COLUMN aliquota_issqn DECIMAL(5,2) NULL",
  "ALTER TABLE clinicas ADD COLUMN codigo_tributario_municipio VARCHAR(30) NULL",
];

async function run() {
  for (const sql of alterações) {
    const match = sql.match(/ADD COLUMN (\w+)/);
    const coluna = match ? match[1] : sql.slice(0, 50);
    try {
      await sequelize.query(sql);
      console.log(`✅ ${coluna}`);
    } catch (e) {
      if (e.message.includes('Duplicate column') || e.message.includes('already exists')) {
        console.log(`⏭  ${coluna} já existe`);
      } else {
        console.error(`❌ ${coluna}: ${e.message}`);
      }
    }
  }
  console.log('Pronto!');
  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
