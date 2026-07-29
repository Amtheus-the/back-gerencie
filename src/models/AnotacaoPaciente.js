const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Histórico de observações/anotações do dentista sobre o paciente,
// registradas conforme as consultas vão acontecendo (não sobrescreve, acumula).
const AnotacaoPaciente = sequelize.define('AnotacaoPaciente', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clinicaId: { type: DataTypes.UUID, allowNull: false, field: 'clinica_id' },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id', comment: 'Dentista/usuário que registrou a anotação' },
  pacienteId: { type: DataTypes.UUID, allowNull: false, field: 'paciente_id' },
  texto: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'anotacoes_paciente', timestamps: true, underscored: true });

module.exports = AnotacaoPaciente;
