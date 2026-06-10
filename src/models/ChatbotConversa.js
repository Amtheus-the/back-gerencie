
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatbotConversa = sequelize.define('ChatbotConversa', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  mensagem: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sender: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  contador_mensagens: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  bloqueado: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  data_envio: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'chatbot_conversas',
  timestamps: false,
});

module.exports = ChatbotConversa;
