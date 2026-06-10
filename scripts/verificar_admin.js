/**
 * Script para verificar usuários administradores no sistema
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Força a senha como string
const sequelize = new Sequelize(
  process.env.DB_NAME || 'gerencie_db',
  process.env.DB_USER || 'postgres',
  String(process.env.DB_PASSWORD || ''),
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function verificarAdmin() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados\n');

    // Buscar todos os usuários
    const [usuarios] = await sequelize.query(`
      SELECT id, nome, email, is_admin, ativo
      FROM users
      ORDER BY is_admin DESC, id;
    `);

    console.log('=== USUÁRIOS NO SISTEMA ===\n');
    
    if (usuarios.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado no banco de dados');
    } else {
      usuarios.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`Nome: ${user.nome}`);
        console.log(`Email: ${user.email}`);
        console.log(`É Admin: ${user.is_admin ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`Ativo: ${user.ativo ? '✅ SIM' : '❌ NÃO'}`);
        console.log('---\n');
      });

      const admins = usuarios.filter(u => u.is_admin);
      console.log(`\n📊 Total de usuários: ${usuarios.length}`);
      console.log(`👑 Total de admins: ${admins.length}`);

      if (admins.length === 0) {
        console.log('\n⚠️  ATENÇÃO: Nenhum usuário administrador encontrado!');
        console.log('💡 Execute o script de criar admin: node scripts/criar_admin.js');
      }
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

verificarAdmin();
