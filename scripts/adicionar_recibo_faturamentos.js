/**
 * Migration: adicionar campos de recibo na tabela faturamentos
 * O recibo é anexado por lançamento PF (Carnê Leão / Receita Saúde)
 *
 * Executar:
 *   node backend/scripts/adicionar_recibo_faturamentos.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../src/config/database');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados');

    // Verifica se as colunas já existem
    const [cols] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faturamentos'
        AND COLUMN_NAME IN ('recibo_url','recibo_nome','recibo_tamanho')
    `);

    const existing = cols.map(c => c.COLUMN_NAME);

    if (!existing.includes('recibo_url')) {
      await sequelize.query(`ALTER TABLE faturamentos ADD COLUMN recibo_url VARCHAR(1000) NULL COMMENT 'Caminho local (ou S3) do recibo Carnê Leão'`);
      console.log('✅ Coluna recibo_url adicionada');
    }
    if (!existing.includes('recibo_nome')) {
      await sequelize.query(`ALTER TABLE faturamentos ADD COLUMN recibo_nome VARCHAR(500) NULL COMMENT 'Nome original do arquivo de recibo'`);
      console.log('✅ Coluna recibo_nome adicionada');
    }
    if (!existing.includes('recibo_tamanho')) {
      await sequelize.query(`ALTER TABLE faturamentos ADD COLUMN recibo_tamanho INT NULL COMMENT 'Tamanho do arquivo de recibo em bytes'`);
      console.log('✅ Coluna recibo_tamanho adicionada');
    }

    if (existing.length === 3) {
      console.log('ℹ️  Colunas já existem — nada a fazer');
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
})();
