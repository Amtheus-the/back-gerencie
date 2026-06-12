require('dotenv').config();
const { sequelize } = require('../src/models');

async function run() {
  try {
    await sequelize.query('ALTER TABLE clinicas ADD COLUMN asaas_subscription_id VARCHAR(64) NULL');
    console.log('asaas_subscription_id adicionado');
  } catch (e) {
    if (e.message.includes('Duplicate column')) console.log('asaas_subscription_id já existe');
    else throw e;
  }
  try {
    await sequelize.query("ALTER TABLE clinicas ADD COLUMN metodo_pagamento ENUM('CREDIT_CARD','PIX') NULL");
    console.log('metodo_pagamento adicionado');
  } catch (e) {
    if (e.message.includes('Duplicate column')) console.log('metodo_pagamento já existe');
    else throw e;
  }
  console.log('Pronto!');
  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
