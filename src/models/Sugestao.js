const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sugestao = sequelize.define('Sugestao', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'clinicas', key: 'id' },
  },
  titulo: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  categoria: {
    type: DataTypes.ENUM('funcionalidade', 'melhoria', 'bug', 'outro'),
    defaultValue: 'melhoria',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pendente', 'em_analise', 'planejado', 'implementado', 'recusado'),
    defaultValue: 'pendente',
    allowNull: false,
  },
  respostaAdmin: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'resposta_admin',
  },
}, {
  tableName: 'sugestoes',
  underscored: true,
  timestamps: true,
});

module.exports = Sugestao;
