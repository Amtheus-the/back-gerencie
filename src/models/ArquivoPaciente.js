const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Pastas e arquivos (fotos, raio-x, contratos, etc) anexados ao paciente.
// Uma linha com nomeArquivo/url nulos representa uma pasta vazia (criada
// antes de qualquer upload, pra aparecer na lista mesmo sem arquivos).
const ArquivoPaciente = sequelize.define('ArquivoPaciente', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clinicaId: { type: DataTypes.UUID, allowNull: false, field: 'clinica_id' },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id', comment: 'Quem enviou o arquivo / criou a pasta' },
  pacienteId: { type: DataTypes.UUID, allowNull: false, field: 'paciente_id' },
  pasta: { type: DataTypes.STRING(150), allowNull: false, defaultValue: 'Geral' },
  nomeArquivo: { type: DataTypes.STRING(500), allowNull: true, field: 'nome_arquivo', comment: 'Nome original do arquivo — nulo pra pasta vazia' },
  url: { type: DataTypes.STRING(1000), allowNull: true },
  tamanho: { type: DataTypes.INTEGER, allowNull: true },
  tipo: { type: DataTypes.STRING(100), allowNull: true, comment: 'MIME type' },
}, { tableName: 'arquivos_paciente', timestamps: true, underscored: true });

module.exports = ArquivoPaciente;
