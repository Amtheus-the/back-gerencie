// Script para adicionar a coluna 'assinatura' na tabela clinicas
const { sequelize } = require('../src/config/database');

async function adicionarColunaAssinatura() {
  try {
    await sequelize.query(`ALTER TABLE "Clinicas" ADD COLUMN "assinatura" VARCHAR(1000);`);
    console.log('Coluna assinatura adicionada com sucesso!');
  } catch (err) {
    console.error('Erro ao adicionar coluna assinatura:', err);
  } finally {
    await sequelize.close();
  }
}
adicionarColunaAssinatura();
