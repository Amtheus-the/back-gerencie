/**
 * Model de Despesa
 * Representa as despesas do consultório
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Despesa = sequelize.define('Despesa', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  descricao: {
    type: DataTypes.STRING,
    allowNull: false
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  categoria: {
    type: DataTypes.ENUM(
      'Aluguel',
      'Equipamentos',
      'Materiais',
      'Salários',
      'Impostos',
      'Marketing',
      'Manutenção',
      'Outros'
    ),
    allowNull: false
  },
  data: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM('fixa', 'variavel'),
    defaultValue: 'variavel'
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dedutivel: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica se a despesa é dedutível do IR'
  },
  planoContaId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'plano_contas',
      key: 'id'
    },
    comment: 'Referência ao plano de contas'
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
  tableName: 'despesas',
  underscored: true,
  timestamps: true
});

Despesa.belongsTo(require('./PlanoContas'), {
  foreignKey: 'planoContaId',
  as: 'planoConta'
});

module.exports = Despesa;
