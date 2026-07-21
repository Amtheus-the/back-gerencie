const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Receitas/atestados gerados pelo sistema e enviados pra assinatura digital
// qualificada (ICP-Brasil) do dentista via Autentique.
const DocumentoClinico = sequelize.define('DocumentoClinico', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clinicaId: { type: DataTypes.UUID, allowNull: false, field: 'clinica_id' },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id', comment: 'Dentista que deve assinar' },
  pacienteId: { type: DataTypes.UUID, allowNull: true, field: 'paciente_id' },
  tipo: { type: DataTypes.ENUM('receita', 'atestado', 'declaracao'), allowNull: false },
  titulo: { type: DataTypes.STRING(255), allowNull: true },
  status: { type: DataTypes.ENUM('pendente', 'assinado'), defaultValue: 'pendente' },
  autentiqueId: { type: DataTypes.STRING(100), allowNull: true, field: 'autentique_id' },
  assinadoEm: { type: DataTypes.DATE, allowNull: true, field: 'assinado_em' },
}, { tableName: 'documentos_clinicos', timestamps: true, underscored: true });

module.exports = DocumentoClinico;
