/**
 * Model de Faturamento
 * Representa os faturamentos/receitas do consultório
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Faturamento = sequelize.define('Faturamento', {
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
  data: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  formaPagamento: {
    type: DataTypes.ENUM(
      'Dinheiro',
      'Cartão de Crédito',
      'Cartão de Débito',
      'PIX',
      'Transferência',
      'Cheque',
      'Outros'
    ),
    allowNull: false
  },
  paciente: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cpf: {
    type: DataTypes.STRING(14),
    allowNull: true,
    comment: 'CPF do beneficiário (formato: 000.000.000-00)'
  },
  procedimento: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Nome do procedimento realizado'
  },
  tipoPessoa: {
    type: DataTypes.ENUM('PF', 'PJ'),
    allowNull: false,
    defaultValue: 'PF'
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Campos do Pagador (quando diferente do beneficiário)
  pagadorNome: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Nome do pagador (quando diferente do beneficiário)'
  },
  pagadorCpf: {
    type: DataTypes.STRING(18),
    allowNull: true,
    comment: 'CPF/CNPJ do pagador'
  },
  pagadorTipoPessoa: {
    type: DataTypes.ENUM('PF', 'PJ'),
    allowNull: true,
    comment: 'Tipo de pessoa do pagador'
  },
  // Foreign Keys opcionais para relacionamentos
  pacienteId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'pacientes',
      key: 'id'
    }
  },
  procedimentoId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'procedimentos',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // ─── Recibo Carnê Leão / Receita Saúde (anexado pelo admin por lançamento PF) ───
  reciboUrl: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    field: 'recibo_url',
    comment: 'Caminho local (ou S3 key) do recibo'
  },
  reciboNome: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'recibo_nome',
    comment: 'Nome original do arquivo de recibo'
  },
  reciboTamanho: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'recibo_tamanho',
    comment: 'Tamanho do arquivo em bytes'
  },
  // ─── Declaração fiscal ───
  declarar: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'declarar',
    comment: 'Se false, lançamento é apenas controle interno — não entra nos cálculos de imposto'
  },
  // ─── Nota Fiscal ───
  notaEmitida: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'nota_emitida',
    comment: 'Indica se a nota fiscal foi emitida'
  },
  numeroNota: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'numero_nota',
    comment: 'ID/número da nota fiscal na Nuvem Fiscal'
  },
  notaFiscalId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'nota_fiscal_id',
  },
  notaFiscalUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'nota_fiscal_url',
    comment: 'URL do PDF da nota fiscal (NuvemFiscal ou S3)'
  },
  comprovanteUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'comprovante_url',
  },
  comprovanteNome: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'comprovante_nome',
  },
  comprovanteTamanho: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'comprovante_tamanho',
  },
}, {
  tableName: 'faturamentos',
  underscored: true,
  timestamps: true
});

module.exports = Faturamento;
