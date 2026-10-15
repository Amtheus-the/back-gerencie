// Taxas de cartão por bandeira e por modalidade (crédito/débito). Idempotente.
//  - taxas_maquina_cartao.bandeira  ('' = padrão/todas as bandeiras) e .modalidade
//  - troca a chave única (maquina, parcelas) por (maquina, modalidade, bandeira, parcelas)
//  - faturamentos.bandeira_cartao (qual bandeira foi usada no recebimento)
// Compatível com o backend antigo: as linhas existentes viram crédito/padrão.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.DB_HOST = 'srv1722.hstgr.io';
const { sequelize } = require('../src/models');

const tenta = async (sql, jaExiste) => {
  try { await sequelize.query(sql); console.log('✅', sql.slice(0, 90)); }
  catch (e) { if (jaExiste.test(e.message)) console.log('• já aplicado:', sql.slice(0, 60)); else throw e; }
};

(async () => {
  await sequelize.authenticate();
  await tenta("ALTER TABLE taxas_maquina_cartao ADD COLUMN bandeira VARCHAR(30) NOT NULL DEFAULT ''", /Duplicate column/i);
  await tenta("ALTER TABLE taxas_maquina_cartao ADD COLUMN modalidade ENUM('credito','debito') NOT NULL DEFAULT 'credito'", /Duplicate column/i);
  await tenta('ALTER TABLE taxas_maquina_cartao ADD UNIQUE KEY uq_maquina_modalidade_bandeira_parcelas (maquina_id, modalidade, bandeira, parcelas)', /Duplicate key name/i);
  await tenta('ALTER TABLE taxas_maquina_cartao DROP INDEX uq_maquina_parcelas', /check that column\/key exists|Can't DROP/i);
  await tenta('ALTER TABLE faturamentos ADD COLUMN bandeira_cartao VARCHAR(30) NULL', /Duplicate column/i);
  await sequelize.close();
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
