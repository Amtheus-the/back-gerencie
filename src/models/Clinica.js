/**
 * Modelo de Clínica
 * Representa as clínicas odontológicas (nível superior aos usuários)
 */

const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const Clinica = sequelize.define('Clinica', {
  asaasCustomerId: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'asaas_customer_id',
    comment: 'ID do cliente no Asaas'
  },
  asaasSubscriptionId: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'asaas_subscription_id',
    comment: 'ID da assinatura ativa no Asaas'
  },
  metodoPagamento: {
    type: DataTypes.ENUM('CREDIT_CARD', 'PIX'),
    allowNull: true,
    field: 'metodo_pagamento',
    comment: 'Método de pagamento da assinatura atual'
  },
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nome: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Nome da clínica odontológica'
  },
  tipoPessoa: {
    type: DataTypes.ENUM('PF', 'PJ', 'HIBRIDO'),
    allowNull: false,
    defaultValue: 'PF',
    field: 'tipo_pessoa',
    comment: 'Tipo de pessoa: PF (Pessoa Física), PJ (Pessoa Jurídica) ou HIBRIDO'
  },
  cpf: {
    type: DataTypes.STRING(14),
    allowNull: true,
    unique: true,
    comment: 'CPF do profissional (se PF)'
  },
  cnpj: {
    type: DataTypes.STRING(18),
    allowNull: true,
    unique: true,
    comment: 'CNPJ da clínica (se PJ)'
  },
  telefone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Telefone principal da clínica'
  },
  telefoneSecundario: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'telefone_secundario',
    comment: 'Telefone secundário da clínica'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    },
    comment: 'Email da clínica (pode ser diferente dos usuários)'
  },
  cep: {
    type: DataTypes.STRING(9),
    allowNull: true,
    comment: 'CEP do endereço'
  },
  endereco: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Endereço completo da clínica'
  },
  numero: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Número do endereço'
  },
  complemento: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Complemento do endereço'
  },
  bairro: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Bairro'
  },
  cidade: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Cidade'
  },
  estado: {
    type: DataTypes.STRING(2),
    allowNull: true,
    comment: 'Estado (UF)'
  },
  logo: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL ou caminho da logo da clínica'
  },
  assinatura: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    comment: 'URL ou caminho da assinatura digitalizada do dentista'
  },
  site: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Site da clínica'
  },
  instagram: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Instagram da clínica'
  },
  facebook: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Facebook da clínica'
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observações gerais sobre a clínica'
  },
  plano: {
    type: DataTypes.ENUM('FREE', 'BASICO', 'PRO', 'ENTERPRISE'),
    allowNull: false,
    defaultValue: 'FREE',
    comment: 'Plano de assinatura da clínica'
  },
  dataAssinatura: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'data_assinatura',
    comment: 'Data de início da assinatura'
  },
  dataVencimento: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'data_vencimento',
    comment: 'Data de vencimento da assinatura'
  },
  limiteUsuarios: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'limite_usuarios',
    comment: 'Número máximo de usuários permitidos no plano'
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Indica se a clínica está ativa'
  },
  motivoInativo: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'motivo_inativo',
    comment: 'Motivo da desativação (se inativa)'
  },
  dataInativacao: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'data_inativacao',
    comment: 'Data em que a clínica foi desativada'
  },
  // ─── Configurações Fiscais ───
  codigoServico: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'codigo_servico',
    comment: 'Código do serviço para emissão de NFS-e (ex: 04693)'
  },
  descricaoPadraoNota: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'descricao_padrao_nota',
    comment: 'Descrição padrão que vai na nota fiscal'
  },
  inscricaoMunicipal: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'inscricao_municipal',
    comment: 'Inscrição Municipal da clínica'
  }
}, {
  tableName: 'clinicas',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['cpf'],
      where: {
        cpf: {
          [Op.ne]: null
        }
      }
    },
    {
      unique: true,
      fields: ['cnpj'],
      where: {
        cnpj: {
          [Op.ne]: null
        }
      }
    },
    {
      fields: ['nome']
    },
    {
      fields: ['ativo']
    }
  ]
});

module.exports = Clinica;
