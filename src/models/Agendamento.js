const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Agendamento = sequelize.define('Agendamento', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clinica_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  paciente_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  procedimento_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Primeiro procedimento da lista — mantido por compatibilidade (título do evento, etc). A lista completa fica em "procedimentos".'
  },
  procedimentos: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Lista completa de IDs de procedimentos do agendamento, quando mais de um foi escolhido'
  },
  data_hora: {
    type: DataTypes.DATE,
    allowNull: false
  },
  duracao_minutos: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lancamento_feito: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  google_event_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'ID do evento correspondente no Google Calendar do dentista'
  }
}, {
  tableName: 'agendamentos',
  timestamps: true
});

module.exports = Agendamento;
