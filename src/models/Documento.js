/**
 * Modelo de Documento
 * Armazena notas fiscais, recibos e outros documentos dos usuários
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Documento = sequelize.define('Documento', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id',
    comment: 'ID do usuário dono do documento'
  },
  tipo: {
    type: DataTypes.ENUM('nota_fiscal', 'recibo', 'comprovante', 'contrato', 'outros'),
    allowNull: false,
    defaultValue: 'outros',
    comment: 'Tipo do documento'
  },
  titulo: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Título/nome do documento'
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Descrição adicional do documento'
  },
  nomeArquivo: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'nome_arquivo',
    comment: 'Nome original do arquivo'
  },
  caminhoArquivo: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    field: 'caminho_arquivo',
    comment: 'Caminho do arquivo no servidor ou URL'
  },
  tamanhoArquivo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'tamanho_arquivo',
    comment: 'Tamanho do arquivo em bytes'
  },
  tipoMime: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'tipo_mime',
    comment: 'Tipo MIME do arquivo (application/pdf, image/png, etc)'
  },
  uploadPorAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'upload_por_admin',
    comment: 'Indica se o documento foi enviado pelo admin'
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'admin_id',
    comment: 'ID do admin que fez o upload (se aplicável)'
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Valor relacionado ao documento (se aplicável)'
  },
  dataReferencia: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'data_referencia',
    comment: 'Data de referência do documento (data da nota, recibo, etc)'
  },
  faturamentoId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'faturamentos',
      key: 'id'
    },
    field: 'faturamento_id',
    comment: 'ID do faturamento relacionado (opcional)'
  },
  despesaId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'despesas',
      key: 'id'
    },
    field: 'despesa_id',
    comment: 'ID da despesa relacionada (opcional)'
  },
  visualizado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica se o usuário já visualizou o documento'
  },
  dataVisualizacao: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'data_visualizacao',
    comment: 'Data em que o usuário visualizou o documento'
  }
}, {
  tableName: 'documentos',
  underscored: true,
  timestamps: true
});

module.exports = Documento;
