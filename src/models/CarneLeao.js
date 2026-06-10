/**
 * Modelo de Carnê Leão
 * Controla o status mensal do Carnê Leão por clínica (PF/HÍBRIDO)
 * O admin processa manualmente no eCAC e anexa o comprovante aqui
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CarneLeao = sequelize.define('CarneLeao', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  clinicaId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'clinica_id',
    references: { model: 'clinicas', key: 'id' },
    comment: 'Clínica (PF/HÍBRIDO) a qual pertence este registro'
  },

  mes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 12 },
    comment: 'Mês de competência (1–12)'
  },

  ano: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 2020, max: 2100 },
    comment: 'Ano de competência'
  },

  valorFaturamentoPf: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'valor_faturamento_pf',
    comment: 'Total de faturamentos PF naquele mês'
  },

  valorImposto: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'valor_imposto',
    comment: 'Imposto calculado pela tabela progressiva'
  },

  status: {
    type: DataTypes.ENUM('pendente', 'processado', 'pago'),
    allowNull: false,
    defaultValue: 'pendente',
    comment: 'pendente = ainda não foi ao eCAC; processado = emitido, aguardando pagamento; pago = DARF pago'
  },

  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observações do admin (protocolo eCAC, data de vencimento DARF, etc.)'
  },

  arquivoUrl: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    field: 'arquivo_url',
    comment: 'Caminho local (ou S3 key futuramente) do comprovante/DARF'
  },

  arquivoNome: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'arquivo_nome',
    comment: 'Nome original do arquivo enviado'
  },

  arquivoTamanho: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'arquivo_tamanho',
    comment: 'Tamanho do arquivo em bytes'
  },

  processadoEm: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'processado_em',
    comment: 'Data em que o admin processou (emitiu no eCAC)'
  }
}, {
  tableName: 'carne_leao',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['clinica_id'] },
    { fields: ['mes', 'ano'] },
    { unique: true, fields: ['clinica_id', 'mes', 'ano'], name: 'unique_clinica_mes_ano' }
  ]
});

module.exports = CarneLeao;
