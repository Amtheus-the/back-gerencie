require('dotenv').config();
const { User } = require('../src/models');
const { Op } = require('sequelize');

async function run() {
  const users = await User.findAll({ where: { role: { [Op.ne]: 'dentista' } } });
  let corrigidos = 0;
  for (const u of users) {
    if (typeof u.permissoes === 'string') {
      try {
        const obj = JSON.parse(u.permissoes);
        u.permissoes = obj;
        await u.save();
        console.log('✅ Corrigido:', u.nome, u.email);
        corrigidos++;
      } catch (e) {
        console.error('❌ Erro ao corrigir', u.email, ':', e.message);
      }
    }
  }
  console.log(`Total corrigidos: ${corrigidos}`);
  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
