/**
 * Script de Migração - Adicionar Campo CPF no Faturamento
 * Executa a migração para adicionar a coluna cpf na tabela faturamentos
 */

const { sequelize } = require('../src/config/database');

async function adicionarCampoCPF() {
  try {
    console.log('🔄 Iniciando migração: Adicionar campo CPF no faturamento...');

    // Executar a migração
    await sequelize.query(`
      ALTER TABLE faturamentos 
      ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) NULL 
      COMMENT 'CPF do paciente (formato: 000.000.000-00)';
    `);

    console.log('✅ Campo CPF adicionado com sucesso!');
    console.log('📋 Detalhes:');
    console.log('   - Tabela: faturamentos');
    console.log('   - Campo: cpf');
    console.log('   - Tipo: VARCHAR(14)');
    console.log('   - Obrigatório: NÃO (NULL permitido)');
    console.log('   - Formato: 000.000.000-00');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao adicionar campo CPF:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  }
}

// Executar migração
adicionarCampoCPF();
