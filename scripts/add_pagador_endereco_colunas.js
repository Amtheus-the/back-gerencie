require('dotenv').config();
const { sequelize } = require('../src/models');

const COLUNAS = [
  ['pagador_cep', "VARCHAR(9) NULL"],
  ['pagador_logradouro', "VARCHAR(255) NULL"],
  ['pagador_numero', "VARCHAR(10) NULL"],
  ['pagador_complemento', "VARCHAR(255) NULL"],
  ['pagador_bairro', "VARCHAR(255) NULL"],
  ['pagador_cidade', "VARCHAR(255) NULL"],
  ['pagador_estado', "VARCHAR(2) NULL"],
];

async function run() {
  for (const [coluna, definicao] of COLUNAS) {
    try {
      await sequelize.query(`ALTER TABLE faturamentos ADD COLUMN ${coluna} ${definicao}`);
      console.log(`✅ Coluna ${coluna} adicionada`);
    } catch (e) {
      if (e.message.includes('Duplicate column name')) {
        console.log(`⏭  Coluna ${coluna} já existe`);
      } else {
        console.error(`❌ Erro na coluna ${coluna}:`, e.message);
      }
    }
  }
  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
