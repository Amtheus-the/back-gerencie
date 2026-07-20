/**
 * Model de Máquina de Cartão
 * Cadastro das maquininhas de cartão da clínica, com taxas próprias por parcela
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MaquinaCartao = sequelize.define('MaquinaCartao', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'clinica_id'
  },
  nome: {
    type: DataTypes.STRING(120),
    allowNull: false,
    comment: 'Apelido da máquina, ex: "Stone", "Cielo Loja 2"'
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
}, {
  tableName: 'maquinas_cartao',
  underscored: true,
  timestamps: true
});

module.exports = MaquinaCartao;
