const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentoPaciente = sequelize.define('DocumentoPaciente', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clinicaId: { type: DataTypes.UUID, allowNull: false, field: 'clinica_id' },
  pacienteId: { type: DataTypes.UUID, allowNull: false, field: 'paciente_id' },
  termoId: { type: DataTypes.UUID, allowNull: false, field: 'termo_id' },
  token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  status: { type: DataTypes.ENUM('pendente', 'assinado', 'recusado'), defaultValue: 'pendente' },
  nomeAssinante: { type: DataTypes.STRING, allowNull: true, field: 'nome_assinante' },
  cpfAssinante: { type: DataTypes.STRING(14), allowNull: true, field: 'cpf_assinante' },
  ipAssinante: { type: DataTypes.STRING(45), allowNull: true, field: 'ip_assinante' },
  assinadoEm: { type: DataTypes.DATE, allowNull: true, field: 'assinado_em' },
  enviadoVia: { type: DataTypes.ENUM('whatsapp', 'email', 'link'), defaultValue: 'link', field: 'enviado_via' },
  autentiqueId: { type: DataTypes.STRING(100), allowNull: true, field: 'autentique_id' },
  respostas: { type: DataTypes.JSON, allowNull: true, comment: 'Respostas do paciente às perguntas do termo (CAMPO/SIMNAO)' },
  pdfPreenchidoUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'pdf_preenchido_url', comment: 'URL do PDF final com as respostas preenchidas' },
}, { tableName: 'documentos_paciente', timestamps: true, underscored: true });

module.exports = DocumentoPaciente;
