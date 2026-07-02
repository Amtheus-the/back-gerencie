/**
 * Model de Paciente
 * Cadastro de pacientes para facilitar lançamentos
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Paciente = sequelize.define('Paciente', {
  dataCadastro: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'dataCadastro'
  },
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cpfCnpj: {
    type: DataTypes.STRING(18),
    allowNull: true,
    comment: 'CPF ou CNPJ (formato: 000.000.000-00 ou 00.000.000/0000-00)'
  },
  tipoPessoa: {
    type: DataTypes.ENUM('PF', 'PJ'),
    allowNull: false,
    defaultValue: 'PF'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmailOrEmpty(value) {
        if (value && value.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new Error('E-mail inválido');
        }
      }
    }
  },
  telefone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  cep: {
    type: DataTypes.STRING(9),
    allowNull: true
  },
  logradouro: {
    type: DataTypes.STRING,
    allowNull: true
  },
  numero: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  complemento: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bairro: {
    type: DataTypes.STRING,
    allowNull: true
  },
  dataNascimento: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'data_nascimento'
  },
  cidade: {
    type: DataTypes.STRING,
    allowNull: true
  },
  estado: {
    type: DataTypes.STRING(2),
    allowNull: true
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  odontogramaData: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'odontograma_data',
    comment: 'Status dos dentes { "18": { status, procedimento, obs }, ... }'
  },
  anamneseData: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'anamnese_data',
    comment: 'Respostas da anamnese preenchida pelo dentista'
  },
  anamneseUpdatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'anamnese_updated_at',
    comment: 'Data do último preenchimento da anamnese'
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id'
  },
  clinica_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'clinicas',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'ID da clínica à qual o paciente pertence',
    field: 'clinica_id'
  }
}, {
  tableName: 'pacientes',
  underscored: true,
  timestamps: true
});

module.exports = Paciente;
