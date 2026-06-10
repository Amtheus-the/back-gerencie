/**
 * Model de Plano de Contas
 * Representa o plano de contas para classificação de receitas e despesas
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlanoContas = sequelize.define('PlanoContas', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  codigo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Código da conta (ex: 1.1, 2.3.1)'
  },
  nome: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Nome descritivo da conta'
  },
  tipo: {
    type: DataTypes.ENUM('receita', 'despesa'),
    allowNull: false,
    comment: 'Tipo de conta: receita ou despesa'
  },
  dedutivel: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica se despesa é dedutível do IR (aplica-se apenas a despesas)'
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Descrição detalhada da conta'
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Indica se a conta está ativa'
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
  tableName: 'plano_contas',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['user_id', 'tipo', 'ativo']
    },
    {
      fields: ['codigo']
    }
  ]
});

module.exports = PlanoContas;
