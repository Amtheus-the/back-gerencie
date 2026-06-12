require('dotenv').config();
const { sequelize } = require('../src/models');

const alterações = [
  "ALTER TABLE users ADD COLUMN role ENUM('dentista','secretaria') NOT NULL DEFAULT 'dentista'",
  "ALTER TABLE users ADD COLUMN permissoes JSON NULL",
  "ALTER TABLE users ADD COLUMN criado_por_id VARCHAR(36) NULL",
  "ALTER TABLE users ADD COLUMN secretaria_id INT NULL",
  "ALTER TABLE users MODIFY COLUMN id VARCHAR(36) NOT NULL",
];

async function run() {
  for (const sql of alterações) {
    const match = sql.match(/ADD COLUMN (\w+)|MODIFY COLUMN (\w+)/);
    const coluna = match ? (match[1] || match[2]) : sql;
    try {
      await sequelize.query(sql);
      console.log(`✅ ${coluna} ok`);
    } catch (e) {
      if (e.message.includes('Duplicate column') || e.message.includes('already exists')) {
        console.log(`⏭ ${coluna} já existe`);
      } else {
        console.error(`❌ ${coluna}: ${e.message}`);
      }
    }
  }
  console.log('Pronto!');
  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
