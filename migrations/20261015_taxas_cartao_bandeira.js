// Taxas de cartão por bandeira e modalidade (crédito/débito). Idempotente no up; down reverte tudo.
const tenta = async (sequelize, sql, jaFeito) => {
  try { await sequelize.query(sql); } catch (e) { if (!jaFeito.test(e.message)) throw e; }
};

exports.up = async (sequelize) => {
  await tenta(sequelize, "ALTER TABLE taxas_maquina_cartao ADD COLUMN bandeira VARCHAR(30) NOT NULL DEFAULT ''", /Duplicate column/i);
  await tenta(sequelize, "ALTER TABLE taxas_maquina_cartao ADD COLUMN modalidade ENUM('credito','debito') NOT NULL DEFAULT 'credito'", /Duplicate column/i);
  await tenta(sequelize, 'ALTER TABLE taxas_maquina_cartao ADD UNIQUE KEY uq_maquina_modalidade_bandeira_parcelas (maquina_id, modalidade, bandeira, parcelas)', /Duplicate key name/i);
  await tenta(sequelize, 'ALTER TABLE taxas_maquina_cartao DROP INDEX uq_maquina_parcelas', /check that column\/key exists|Can't DROP/i);
  await tenta(sequelize, 'ALTER TABLE faturamentos ADD COLUMN bandeira_cartao VARCHAR(30) NULL', /Duplicate column/i);
};

exports.down = async (sequelize) => {
  // só desfaz com segurança se não houver taxa por bandeira/débito (senão a chave antiga falharia por duplicidade)
  const [{ n }] = await sequelize.query("SELECT COUNT(*) n FROM taxas_maquina_cartao WHERE bandeira <> '' OR modalidade <> 'credito'", { type: 'SELECT' });
  if (Number(n) > 0) throw new Error(`Há ${n} taxa(s) por bandeira/débito cadastradas; apague-as antes de desfazer.`);
  await tenta(sequelize, 'ALTER TABLE taxas_maquina_cartao ADD UNIQUE KEY uq_maquina_parcelas (maquina_id, parcelas)', /Duplicate key name/i);
  await tenta(sequelize, 'ALTER TABLE taxas_maquina_cartao DROP INDEX uq_maquina_modalidade_bandeira_parcelas', /check that column\/key exists|Can't DROP/i);
  await tenta(sequelize, 'ALTER TABLE taxas_maquina_cartao DROP COLUMN modalidade', /check that column\/key exists|Can't DROP/i);
  await tenta(sequelize, 'ALTER TABLE taxas_maquina_cartao DROP COLUMN bandeira', /check that column\/key exists|Can't DROP/i);
  await tenta(sequelize, 'ALTER TABLE faturamentos DROP COLUMN bandeira_cartao', /check that column\/key exists|Can't DROP/i);
};
