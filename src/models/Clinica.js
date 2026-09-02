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
      isEmailOrEmpty(value) {
        if (value && value.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new Error('E-mail inválido');
        }
      }
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
    // LONGTEXT porque na prática isso guarda a imagem inteira em base64 (data
    // URI), não uma URL curta — um VARCHAR truncava a imagem silenciosamente.
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Logo da clínica em base64 (data URI)'
  },
  assinatura: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Assinatura digitalizada do dentista em base64 (data URI)'
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
  inadimplente: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Tem cobrança vencida no Asaas — bloqueia acesso ao sistema (exceto tela de pagamento)'
  },
  inadimplenteDesde: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'inadimplente_desde',
    comment: 'Quando a inadimplência foi detectada'
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
  atendeOdontologia: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'atende_odontologia',
    comment: 'Se a clínica atende odontologia — controla a exibição do Odontograma na ficha do paciente'
  },
  atendeEstetica: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'atende_estetica',
    comment: 'Se a clínica atende estética — controla a exibição do Mapa Estético na ficha do paciente'
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
  },
  itemListaServico: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'item_lista_servico',
    comment: 'Código do serviço na lista LC 116/2003 (ex: 0401) — usado pela Focus NFe, diferente do cTribNac usado em codigoServico'
  },
  codigoMunicipioIbge: {
    type: DataTypes.STRING(7),
    allowNull: true,
    field: 'codigo_municipio_ibge',
    comment: 'Código IBGE (7 dígitos) da cidade da clínica — exigido pela Focus NFe pra emitir NFS-e'
  },
  regimeTributario: {
    type: DataTypes.STRING(2),
    allowNull: true,
    field: 'regime_tributario',
    comment: '1=Simples Nacional, 2=Simples c/ excesso, 3=Normal, 4=MEI — exigido pra cadastrar a empresa na Focus NFe'
  },
  aliquotaIssqn: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'aliquota_issqn',
    comment: 'Alíquota do ISSQN (%) — exigida por municípios com provedor Ginfes/ABRASF (ex: São Bernardo do Campo), não usada em São Paulo'
  },
  codigoTributarioMunicipio: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'codigo_tributario_municipio',
    comment: 'Código de serviço próprio do município (formato varia por cidade) — exigido por municípios com provedor Ginfes/ABRASF, além do item_lista_servico padrão LC116'
  },
  regimeEspecialTributacao: {
    type: DataTypes.STRING(2),
    allowNull: true,
    field: 'regime_especial_tributacao',
    comment: '05=MEI do Simples Nacional, 06=ME ou EPP do Simples Nacional — exigido por municípios Ginfes/ABRASF quando a empresa é optante do Simples Nacional'
  },
  focusNfeToken: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'focus_nfe_token',
    comment: 'Token de produção da empresa na Focus NFe (devolvido no cadastro da empresa) — usado pra emitir/consultar/cancelar NFS-e dessa clínica'
  },
  // ─── Marketing ───
  mensagemAniversario: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'mensagem_aniversario',
    comment: 'Mensagem personalizada de aniversário para pacientes (use {{paciente}} para o nome). Se vazio, usa a mensagem padrão do sistema.'
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
