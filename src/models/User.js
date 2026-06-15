/**
 * Model de Usuário
 * Representa os dentistas/usuários do sistema
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  senha_ecac: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Senha do eCAC para automação do robô'
  },
  role: {
    type: DataTypes.ENUM('dentista', 'secretaria', 'dentista_parceiro'),
    allowNull: false,
    defaultValue: 'dentista',
    comment: 'Papel do usuário no sistema'
  },
  cor: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Cor do dentista na agenda'
  },
  permissoes: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Permissões de acesso da secretaria definidas pelo dentista'
  },
  criadoPorId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'criado_por_id',
    comment: 'ID do dentista que criou esta secretaria'
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
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  senha: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cro: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Número do CRO (Conselho Regional de Odontologia)'
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cpf: {
    type: DataTypes.STRING(14),
    allowNull: true
  },
  cnpj: {
    type: DataTypes.STRING(18),
    allowNull: true
  },
  foto: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profissao: {
    type: DataTypes.STRING,
    defaultValue: 'Dentista',
    allowNull: true
  },
  nomeClinica: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nome da clínica odontológica'
  },
  primeiroAcesso: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Flag para exibir chatbot da Aline no primeiro acesso'
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Define se o usuário é administrador do sistema'
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'clinica_id',
    references: {
      model: 'clinicas',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'ID da clínica à qual o usuário pertence'
  },
  emailToken: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Token de validação de e-mail'
  },
  emailTokenExpires: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Timestamp de expiração do token de e-mail'
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Token para recuperação de senha'
  },
  passwordResetExpires: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Timestamp de expiração do token de recuperação'
  },
}, {
  tableName: 'users',
  underscored: true, // Usa snake_case no banco de dados
  timestamps: true, // Usa created_at e updated_at
  hooks: {
    // Hook para criptografar senha antes de salvar
    beforeCreate: async (user) => {
      if (user.senha) {
        user.senha = await bcrypt.hash(user.senha, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('senha')) {
        user.senha = await bcrypt.hash(user.senha, 10);
      }
    }
  }
});

/**
 * Método para verificar senha
 */
User.prototype.verificarSenha = async function(senha) {
  console.log('🔐 [User.js] verificarSenha chamado');
  console.log('📝 Senha fornecida:', senha);
  console.log('🔒 Hash no banco:', this.senha);
  console.log('🔒 Tamanho do hash:', this.senha ? this.senha.length : 0);
  
  const resultado = await bcrypt.compare(senha, this.senha);
  console.log('✅ Resultado da comparação:', resultado);
  
  return resultado;
};

/**
 * Remove senha do JSON
 */
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.senha;
  return values;
};

module.exports = User;
