/**
 * Model de Despesa
 * Representa as despesas do consultório
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Despesa = sequelize.define('Despesa', {
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
    validate: {
      min: 0
    }
  },
  categoria: {
    // Era ENUM fixo, mas o Plano de Contas permite categorias personalizadas
    // com qualquer nome — um ENUM travado nos 8 valores antigos fazia o MySQL
    // (fora do modo estrito) aceitar e gravar em branco qualquer nome fora
    // da lista, apagando a categoria silenciosamente.
    type: DataTypes.STRING,
    allowNull: false
  },
  data: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM('fixa', 'variavel'),
    defaultValue: 'variavel'
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dedutivel: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica se a despesa é dedutível do IR'
  },
  usadoCarneLeao: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'usado_carne_leao',
    comment: 'Indica se a despesa foi usada no Carnê-Leão'
  },
  comprovanteUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'comprovante_url'
  },
  comprovanteNome: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'comprovante_nome'
  },
  comprovanteTamanho: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'comprovante_tamanho'
  },
  planoContaId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'plano_contas',
      key: 'id'
    },
    comment: 'Referência ao plano de contas'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'despesas',
  underscored: true,
  timestamps: true
});

Despesa.belongsTo(require('./PlanoContas'), {
  foreignKey: 'planoContaId',
  as: 'planoConta'
});

module.exports = Despesa;
