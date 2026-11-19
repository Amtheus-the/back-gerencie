// NFS-e Nacional (obrigatória p/ Simples Nacional desde 01/11/2026): chave por clínica + código de tributação nacional.
const tenta = async (sequelize, sql, jaFeito) => {
  try { await sequelize.query(sql); } catch (e) { if (!jaFeito.test(e.message)) throw e; }
};
const COLS = [
  ['nfse_nacional', 'TINYINT(1) NOT NULL DEFAULT 0'],
  ['codigo_tributacao_nacional', 'VARCHAR(8) NULL'],
];
exports.up = async (sequelize) => {
  for (const [nome, tipo] of COLS) await tenta(sequelize, `ALTER TABLE clinicas ADD COLUMN ${nome} ${tipo}`, /Duplicate column/i);
};
exports.down = async (sequelize) => {
  for (const [nome] of COLS) await tenta(sequelize, `ALTER TABLE clinicas DROP COLUMN ${nome}`, /check that column\/key exists|Can't DROP/i);
};
