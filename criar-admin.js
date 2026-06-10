/**
 * Script para criar usuário admin no banco de dados
 * Uso: node criar-admin.js
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const User = require('./src/models/User');

async function criarAdmin() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados.');

    const email = 'admin@gerencie.com';   // ← altere se quiser
    const senha = 'Admin@123';            // ← altere para uma senha segura
    const nome  = 'Administrador';

    // Verifica se já existe
    const existe = await User.findOne({ where: { email } });
    if (existe) {
      console.log(`⚠️  Usuário com email "${email}" já existe.`);
      console.log('   isAdmin:', existe.isAdmin, '| ativo:', existe.ativo);

      // Garante que está marcado como admin e ativo
      await existe.update({ isAdmin: true, ativo: true });
      console.log('✅ Usuário atualizado para isAdmin=true e ativo=true.');
      process.exit(0);
    }

    // Cria o admin (o hook beforeCreate já faz o hash da senha)
    const admin = await User.create({
      nome,
      email,
      senha,
      tipoPessoa: 'PF',
      isAdmin: true,
      ativo: true,
      primeiroAcesso: false,
    });

    console.log('✅ Admin criado com sucesso!');
    console.log('   ID:    ', admin.id);
    console.log('   Nome:  ', admin.nome);
    console.log('   Email: ', admin.email);
    console.log('   Senha: ', senha, '(salva como hash bcrypt)');
    console.log('\n🔑 Acesse o sistema com:');
    console.log('   Email:', email);
    console.log('   Senha:', senha);

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

criarAdmin();
