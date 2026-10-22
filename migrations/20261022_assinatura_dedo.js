// Assinatura com o dedo na tela (anamnese): guarda as provas da assinatura em documentos_paciente.
const tenta = async (sequelize, sql, jaFeito) => {
  try { await sequelize.query(sql); } catch (e) { if (!jaFeito.test(e.message)) throw e; }
};
const COLS = [
  ['metodo_assinatura', 'VARCHAR(20) NULL'],
  ['user_agent', 'VARCHAR(300) NULL'],
  ['hash_documento', 'CHAR(64) NULL'],
  ['assinatura_url', 'VARCHAR(500) NULL'],
];
exports.up = async (sequelize) => {
  for (const [nome, tipo] of COLS) await tenta(sequelize, `ALTER TABLE documentos_paciente ADD COLUMN ${nome} ${tipo}`, /Duplicate column/i);
  await tenta(sequelize, 'ALTER TABLE documentos_paciente ADD INDEX idx_documentos_hash (hash_documento)', /Duplicate key name/i);
};
exports.down = async (sequelize) => {
  await tenta(sequelize, 'ALTER TABLE documentos_paciente DROP INDEX idx_documentos_hash', /check that column\/key exists|Can't DROP/i);
  for (const [nome] of COLS) await tenta(sequelize, `ALTER TABLE documentos_paciente DROP COLUMN ${nome}`, /check that column\/key exists|Can't DROP/i);
};
