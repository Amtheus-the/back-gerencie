require('dotenv').config();
process.env.DB_HOST = 'srv1722.hstgr.io';
const bcrypt = require('bcryptjs');
const { sequelize } = require('../src/models');
const { v4: uuidv4 } = require('uuid');

const ADMINS = [
  {
    nome:  'NATALIA FEIJO',
    email: 'vnataliavision@gmail.com',
    cpf:   '462.963.838-51',
  },
];

async function run() {
  await sequelize.authenticate();
  console.log('✅ Banco conectado');

  const senhaHash = await bcrypt.hash('Admin@2025', 10);

  for (const a of ADMINS) {
    const id = uuidv4();
    await sequelize.query(`
      INSERT INTO users (id, nome, email, senha, cpf, role, is_admin, ativo, primeiro_acesso, created_at, updated_at)
      VALUES ('${id}', '${a.nome}', '${a.email}', '${senhaHash}', '${a.cpf}', 'admin', 1, 1, 1, NOW(), NOW())
    `);
    console.log(`✅ Admin criado: ${a.nome} — ${a.email}`);
  }

  console.log('\n📧 Senha inicial de todos: Admin@2025');
}

run().catch(e => console.error('❌', e.message)).finally(() => process.exit(0));
