const { sequelize } = require('../src/config/database');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Conectado ao banco.');

    await sequelize.query(`
      ALTER TABLE clinicas
        ADD COLUMN IF NOT EXISTS asaas_subscription_id VARCHAR(64) NULL,
        ADD COLUMN IF NOT EXISTS metodo_pagamento ENUM('CREDIT_CARD','PIX') NULL;
    `);

    console.log('Colunas adicionadas com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

run();
