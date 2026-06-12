require('dotenv').config();
const { sequelize } = require('../src/models');

const alterações = [
  // faturamentos
  "ALTER TABLE faturamentos ADD COLUMN nota_emitida TINYINT(1) NOT NULL DEFAULT 0",
  "ALTER TABLE faturamentos ADD COLUMN nota_fiscal_id VARCHAR(255) NULL",
  "ALTER TABLE faturamentos ADD COLUMN nota_fiscal_url VARCHAR(500) NULL",
  "ALTER TABLE faturamentos ADD COLUMN tipo_rendimento VARCHAR(50) NULL",
  "ALTER TABLE faturamentos ADD COLUMN comprovante_url VARCHAR(500) NULL",
  "ALTER TABLE faturamentos ADD COLUMN comprovante_nome VARCHAR(255) NULL",
  "ALTER TABLE faturamentos ADD COLUMN comprovante_tamanho INT NULL",
  "ALTER TABLE faturamentos ADD COLUMN numero_nota VARCHAR(100) NULL",

  // despesas
  "ALTER TABLE despesas ADD COLUMN comprovante_url VARCHAR(500) NULL",
  "ALTER TABLE despesas ADD COLUMN comprovante_nome VARCHAR(255) NULL",
  "ALTER TABLE despesas ADD COLUMN comprovante_tamanho INT NULL",

  // agendamentos
  "ALTER TABLE agendamentos ADD COLUMN confirmado_whatsapp TINYINT(1) DEFAULT 0",
  "ALTER TABLE agendamentos ADD COLUMN valor DECIMAL(10,2) NULL",

  // clinicas
  "ALTER TABLE clinicas ADD COLUMN codigo_servico VARCHAR(20) NULL",
  "ALTER TABLE clinicas ADD COLUMN descricao_padrao_nota TEXT NULL",
  "ALTER TABLE clinicas ADD COLUMN inscricao_municipal VARCHAR(50) NULL",
  "ALTER TABLE clinicas ADD COLUMN regime_tributario VARCHAR(50) NULL",
  "ALTER TABLE clinicas ADD COLUMN nuvemfiscal_empresa_id VARCHAR(100) NULL",
  "ALTER TABLE clinicas ADD COLUMN asaas_subscription_id VARCHAR(64) NULL",
  "ALTER TABLE clinicas ADD COLUMN metodo_pagamento ENUM('CREDIT_CARD','PIX') NULL",

  // pacientes
  "ALTER TABLE pacientes ADD COLUMN avaliacao_padrao TEXT NULL",

  // users
  "ALTER TABLE users ADD COLUMN role ENUM('dentista','secretaria') NOT NULL DEFAULT 'dentista'",
  "ALTER TABLE users ADD COLUMN permissoes JSON NULL",
  "ALTER TABLE users ADD COLUMN criado_por_id VARCHAR(36) NULL",
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

  // Teste final
  console.log('\nTestando queries...');
  const { Faturamento, Despesa, Agendamento, Paciente, Clinica, User } = require('../src/models');
  try {
    await Promise.all([Faturamento.findOne(), Despesa.findOne(), Agendamento.findOne(), Paciente.findOne(), Clinica.findOne(), User.findOne()]);
    console.log('✅ Todas as queries OK!');
  } catch (e) {
    console.error('❌ Ainda tem erro:', e.message);
  }

  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
