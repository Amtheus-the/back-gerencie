const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Horário travado na agenda (dia todo ou um intervalo específico) — o dentista
// não pode ser agendado nesse período. Não usa o model Agendamento porque
// aquele está amarrado a paciente/procedimento/financeiro/WhatsApp/Google Calendar.
const BloqueioAgenda = sequelize.define('BloqueioAgenda', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clinicaId: { type: DataTypes.UUID, allowNull: false, field: 'clinica_id' },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id', comment: 'Dentista cuja agenda está bloqueada' },
  dataInicio: { type: DataTypes.DATE, allowNull: false, field: 'data_inicio' },
  dataFim: { type: DataTypes.DATE, allowNull: false, field: 'data_fim' },
  diaTodo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'dia_todo' },
  motivo: { type: DataTypes.STRING(255), allowNull: true },
}, { tableName: 'bloqueios_agenda', timestamps: true, underscored: true });

module.exports = BloqueioAgenda;
