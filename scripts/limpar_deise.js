require('dotenv').config();
process.env.DB_HOST = 'srv1722.hstgr.io';
const { sequelize } = require('../src/models');
const ID = 'c957de3e-d6f2-4144-a61f-8247b53a7d49';

async function run() {
  const [a] = await sequelize.query(`DELETE FROM agendamentos WHERE user_id='${ID}'`);
  const [f] = await sequelize.query(`DELETE FROM faturamentos WHERE user_id='${ID}'`);
  const [p] = await sequelize.query(`DELETE FROM pacientes WHERE user_id='${ID}'`);
  console.log('Limpo. Pronto para re-migrar.');
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
