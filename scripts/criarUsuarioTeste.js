const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../src/models');

async function criarUsuarioTeste() {
  try {
    // Conectar ao banco
    await sequelize.authenticate();
    console.log('✅ Conectado ao PostgreSQL');

    // Verificar se já existe
    const usuarioExistente = await User.findOne({ 
      where: { email: 'demo@exemplo.com' } 
    });

    if (usuarioExistente) {
      console.log('⚠️  Usuário demo@exemplo.com já existe!');
      process.exit(0);
    }

    // Criar usuário de teste
    const usuario = await User.create({
      nome: 'Dr. João Silva',
      email: 'demo@exemplo.com',
      senha: '123456', // Será automaticamente criptografada pelo hook do modelo
      cro: '12345-SP',
      telefone: '(11) 99999-9999',
      ativo: true
    });

    console.log('✅ Usuário criado com sucesso!');
    console.log('📧 Email:', usuario.email);
    console.log('🔑 Senha: 123456');
    console.log('👤 Nome:', usuario.nome);
    console.log('📋 CRO:', usuario.cro);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
    process.exit(1);
  }
}

criarUsuarioTeste();
