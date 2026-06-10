/**
 * Migration: remover coluna tipo_pessoa da tabela users
 * tipoPessoa passa a ser fonte única em clinicas.tipo_pessoa
 *
 * Executar:
 *   node backend/scripts/remover_tipo_pessoa_users.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { sequelize } = require('../src/config/database');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados');

    // Verifica se a coluna ainda existe
    const [cols] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'users'
        AND COLUMN_NAME  = 'tipo_pessoa'
    `);

    if (cols.length === 0) {
      console.log('ℹ️  Coluna tipo_pessoa não encontrada em users — nada a fazer');
      process.exit(0);
    }

    await sequelize.query(`ALTER TABLE users DROP COLUMN tipo_pessoa`);
    console.log('✅ Coluna tipo_pessoa removida da tabela users');

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
})();
