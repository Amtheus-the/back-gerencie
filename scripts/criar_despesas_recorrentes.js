require('dotenv').config();
const { sequelize } = require('../src/models');

async function run() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS despesas_recorrentes (
      id CHAR(36) NOT NULL PRIMARY KEY,
      descricao VARCHAR(255) NOT NULL,
      valor DECIMAL(10,2) NOT NULL,
      categoria VARCHAR(255) NOT NULL,
      plano_conta_id CHAR(36) NULL,
      dia_vencimento INT NOT NULL,
      data_inicio DATE NOT NULL,
      duracao_meses INT NULL,
      ativa TINYINT(1) NOT NULL DEFAULT 1,
      cancelada_em DATETIME NULL,
      observacoes TEXT NULL,
      clinica_id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      INDEX idx_despesas_recorrentes_clinica (clinica_id),
      INDEX idx_despesas_recorrentes_ativa (ativa)
    )
  `);
  console.log('✅ Tabela despesas_recorrentes criada');

  try {
    await sequelize.query('ALTER TABLE despesas ADD COLUMN recorrencia_id CHAR(36) NULL');
    console.log('✅ Coluna recorrencia_id adicionada em despesas');
  } catch (e) {
    if (e.message.includes('Duplicate column name')) {
      console.log('⏭  Coluna recorrencia_id já existe');
    } else throw e;
  }

  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
