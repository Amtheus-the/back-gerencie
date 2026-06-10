/**
 * Model de Análise
 * Armazena o histórico de análises tributárias realizadas
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Analise = sequelize.define('Analise', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  estruturaAtual: {
    type: DataTypes.STRING,
    allowNull: true
  },
  estruturaRecomendada: {
    type: DataTypes.STRING,
    allowNull: false
  },
  recomendacao: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Texto completo da recomendação da IA'
  },
  faturamentoMedio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  despesasMedias: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  margemLucro: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  economiaEstimada: {
    type: DataTypes.STRING,
    allowNull: true
  },
  periodo: {
    type: DataTypes.JSON,
    allowNull: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'analises',
  underscored: true,
  timestamps: true
});

module.exports = Analise;
