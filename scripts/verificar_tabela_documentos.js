/**
 * Script para verificar a estrutura da tabela documentos
 */

require('dotenv').config();
const { sequelize } = require('../src/config/database');

async function verificarTabela() {
  try {
    console.log('🔍 Verificando estrutura da tabela documentos...\n');

    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'documentos'
      ORDER BY ordinal_position;
    `);

    if (results.length === 0) {
      console.log('❌ Tabela documentos não existe!');
      process.exit(1);
    }

    console.log('✅ Tabela documentos encontrada!');
    console.log('\n📋 Colunas da tabela:\n');
    
    results.forEach(col => {
      console.log(`   ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | Nullable: ${col.is_nullable}`);
    });

    console.log('\n');
    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

verificarTabela();
