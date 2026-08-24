/**
 * Model de DespesaRecorrente
 * Template de uma despesa fixa que se repete todo mês — a geração das
 * despesas de cada mês (registros em Despesa) é feita a partir daqui.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DespesaRecorrente = sequelize.define('DespesaRecorrente', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  descricao: {
    type: DataTypes.STRING,
    allowNull: false
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 }
  },
  categoria: {
    type: DataTypes.STRING,
    allowNull: false
  },
  planoContaId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'plano_contas', key: 'id' },
    comment: 'Referência ao plano de contas'
  },
  diaVencimento: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 28 },
    comment: 'Dia do mês em que a despesa é lançada (1-28, evita problema com meses curtos)'
  },
  dataInicio: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Primeira ocorrência'
  },
  duracaoMeses: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Quantidade de meses que a recorrência dura — null = sem prazo definido'
  },
  ativa: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'false quando cancelada — não gera mais despesas novas, mas as já geradas continuam'
  },
  canceladaEm: {
    type: DataTypes.DATE,
    allowNull: true
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'clinicas', key: 'id' }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  }
}, {
  tableName: 'despesas_recorrentes',
  underscored: true,
  timestamps: true
});

module.exports = DespesaRecorrente;
