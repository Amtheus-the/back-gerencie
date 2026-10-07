const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Token pessoal pra conectar o Gerencie a ferramentas externas (ex: Claude via MCP).
// O token em si nunca é guardado — só o hash SHA-256, e ele é mostrado uma única vez na criação.
const ApiToken = sequelize.define('ApiToken', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
  clinicaId: { type: DataTypes.UUID, allowNull: false, field: 'clinica_id' },
  nome: { type: DataTypes.STRING(80), allowNull: false },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'token_hash' },
  prefixo: { type: DataTypes.STRING(16), allowNull: false },
  ultimoUsoEm: { type: DataTypes.DATE, allowNull: true, field: 'ultimo_uso_em' },
  revogadoEm: { type: DataTypes.DATE, allowNull: true, field: 'revogado_em' },
}, {
  tableName: 'api_tokens',
  timestamps: true,
  underscored: true,
});

module.exports = ApiToken;
