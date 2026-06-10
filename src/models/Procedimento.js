/**
 * Model de Procedimento
 * Cadastro de procedimentos odontológicos para facilitar lançamentos
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Procedimento = sequelize.define('Procedimento', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  codigo: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Código do procedimento (ex: TUSS, próprio)'
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  valorPadrao: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Valor padrão sugerido para o procedimento'
  },
  categoria: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Categoria do procedimento (ex: Prevenção, Restauração, Endodontia)'
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'clinicas',
      key: 'id'
    },
    field: 'clinica_id'
  }
}, {
  tableName: 'procedimentos',
  underscored: true,
  timestamps: true
});

module.exports = Procedimento;
