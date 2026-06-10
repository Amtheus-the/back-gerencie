const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Orcamento = sequelize.define('Orcamento', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  agendamento_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  paciente_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
    clinica_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('fechado', 'nao_fechado', 'retornar', 'pendente'),
      allowNull: false
    },
  procedimentos: {
    type: DataTypes.JSON,
    allowNull: false
  },
  valores: {
    type: DataTypes.JSON,
    allowNull: false
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'orcamentos',
  timestamps: true
});

module.exports = Orcamento;
