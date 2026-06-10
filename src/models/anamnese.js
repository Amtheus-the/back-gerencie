/**
 * Modelo de Anamnese
 * Representa modelos de questionários personalizados
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Anamnese = sequelize.define('Anamnese', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'clinica_id',
    comment: 'ID da clínica proprietária do modelo'
  },
  titulo: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Título do modelo de anamnese'
  },
  perguntas: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Estrutura do questionário (array de perguntas)'
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at',
    defaultValue: DataTypes.NOW
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'anamneses',
  timestamps: true
});

module.exports = Anamnese;
