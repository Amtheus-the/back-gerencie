// Orçamento detalhado: itens com dentes, desconto, forma de pagamento, validade e profissional.
// Coluna única (JSON) e opcional: orçamentos antigos continuam funcionando só com procedimentos/valores.
const tenta = async (sequelize, sql, jaFeito) => {
  try { await sequelize.query(sql); } catch (e) { if (!jaFeito.test(e.message)) throw e; }
};
exports.up = async (sequelize) => {
  await tenta(sequelize, 'ALTER TABLE orcamentos ADD COLUMN detalhes JSON NULL', /Duplicate column/i);
};
exports.down = async (sequelize) => {
  await tenta(sequelize, 'ALTER TABLE orcamentos DROP COLUMN detalhes', /check that column\/key exists|Can't DROP/i);
};
