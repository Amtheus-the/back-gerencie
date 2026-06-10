/**
 * Script para adicionar campo isAdmin aos usuários existentes
 * Execute este script para atualizar o banco de dados
 */

const { sequelize, User } = require('../src/models');

async function adicionarCampoAdmin() {
  try {
    console.log('🔄 Iniciando migração: adicionando campo isAdmin...');

    // Sincronizar modelo (adiciona coluna se não existir)
    await User.sync({ alter: true });

    console.log('✅ Campo isAdmin adicionado com sucesso!');
    console.log('');
    console.log('💡 Para criar um usuário administrador, você pode:');
    console.log('   1. Executar o script criar_admin.js');
    console.log('   2. Ou atualizar manualmente no banco de dados:');
    console.log('      UPDATE users SET "isAdmin" = true WHERE email = \'seu-email@exemplo.com\';');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

adicionarCampoAdmin();
