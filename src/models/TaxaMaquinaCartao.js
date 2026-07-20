/**
 * Model de Taxa por Parcela de Máquina de Cartão
 * Cada linha representa a taxa cobrada por uma máquina em uma quantidade de parcelas específica
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TaxaMaquinaCartao = sequelize.define('TaxaMaquinaCartao', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  maquinaId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'maquina_id'
  },
  parcelas: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 21 }
  },
  taxaPercentual: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    field: 'taxa_percentual',
    comment: 'Taxa normal (recebimento no prazo padrão da operadora)'
  },
  taxaAntecipacaoPercentual: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'taxa_antecipacao_percentual',
    comment: 'Taxa cobrada quando o dentista opta por receber antecipado'
  },
}, {
  tableName: 'taxas_maquina_cartao',
  underscored: true,
  timestamps: true
});

module.exports = TaxaMaquinaCartao;
