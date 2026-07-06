const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Termo = sequelize.define('Termo', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clinicaId: { type: DataTypes.UUID, allowNull: true, field: 'clinica_id' },
  titulo: { type: DataTypes.STRING, allowNull: false },
  tipo: { type: DataTypes.ENUM('responsabilidade', 'anamnese', 'outro'), defaultValue: 'responsabilidade' },
  conteudo: { type: DataTypes.TEXT('long'), allowNull: false },
  padrao: { type: DataTypes.BOOLEAN, defaultValue: false },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'termos', timestamps: true, underscored: true });

module.exports = Termo;
