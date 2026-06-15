/**
 * Índice dos Models
 * Centraliza e estabelece relacionamentos entre os models
 */


const { sequelize } = require('../config/database');
const Clinica = require('./Clinica');
const User = require('./User');
const Despesa = require('./Despesa');
const Faturamento = require('./Faturamento');
const Analise = require('./Analise');
const Paciente = require('./Paciente');
const Procedimento = require('./Procedimento');
const PlanoContas = require('./PlanoContas');
const Documento = require('./Documento');
const Orcamento = require('./Orcamento');
const Agendamento = require('./Agendamento');
const CarneLeao = require('./CarneLeao');
const Sugestao  = require('./Sugestao');

// Relacionamentos do Orcamento
Orcamento.belongsTo(Agendamento, { foreignKey: 'agendamento_id', as: 'agendamento' });
Agendamento.hasOne(Orcamento, { foreignKey: 'agendamento_id', as: 'orcamento' });

Orcamento.belongsTo(Paciente, { foreignKey: 'paciente_id', as: 'paciente' });
Paciente.hasMany(Orcamento, { foreignKey: 'paciente_id', as: 'orcamentos' });

// ========================================
// RELACIONAMENTOS HIERÁRQUICOS
// ========================================

// Uma clínica tem muitos registros de Carnê Leão
Clinica.hasMany(CarneLeao, {
  foreignKey: 'clinicaId',
  as: 'carneLeao',
  onDelete: 'CASCADE'
});
CarneLeao.belongsTo(Clinica, {
  foreignKey: 'clinicaId',
  as: 'clinica'
});

// Uma clínica tem muitos usuários
Clinica.hasMany(User, {
  foreignKey: 'clinicaId',
  as: 'usuarios',
  onDelete: 'SET NULL'
});
User.belongsTo(Clinica, {
  foreignKey: 'clinicaId',
  as: 'clinica'
});

// Uma clínica tem muitos faturamentos
Clinica.hasMany(Faturamento, {
  foreignKey: 'clinicaId',
  as: 'faturamentos',
  onDelete: 'CASCADE'
});
Faturamento.belongsTo(Clinica, {
  foreignKey: 'clinicaId',
  as: 'clinica'
});

// Uma clínica tem muitas despesas
Clinica.hasMany(Despesa, {
  foreignKey: 'clinicaId',
  as: 'despesas',
  onDelete: 'CASCADE'
});
Despesa.belongsTo(Clinica, {
  foreignKey: 'clinicaId',
  as: 'clinica'
});

// Uma clínica tem muitos documentos
Clinica.hasMany(Documento, {
  foreignKey: 'clinicaId',
  as: 'documentos',
  onDelete: 'CASCADE'
});
Documento.belongsTo(Clinica, {
  foreignKey: 'clinicaId',
  as: 'clinica'
});

// Uma clínica tem muitos pacientes
Clinica.hasMany(Paciente, {
  foreignKey: 'clinicaId',
  as: 'pacientes',
  onDelete: 'CASCADE'
});
Paciente.belongsTo(Clinica, {
  foreignKey: 'clinicaId',
  as: 'clinica'
});

// Uma clínica tem muitos procedimentos
Clinica.hasMany(Procedimento, {
  foreignKey: 'clinicaId',
  as: 'procedimentos',
  onDelete: 'CASCADE'
});
Procedimento.belongsTo(Clinica, {
  foreignKey: 'clinicaId',
  as: 'clinica'
});

// Uma clínica tem muitas análises
Clinica.hasMany(Analise, {
  foreignKey: 'clinicaId',
  as: 'analises',
  onDelete: 'CASCADE'
});
Analise.belongsTo(Clinica, {
  foreignKey: 'clinicaId',
  as: 'clinica'
});

// ========================================
// RELACIONAMENTOS DE USUÁRIO (Mantidos)
// ========================================

// Relacionamentos

// Um usuário tem muitas despesas
User.hasMany(Despesa, {
  foreignKey: 'userId',
  as: 'despesas',
  onDelete: 'CASCADE'
});
Despesa.belongsTo(User, {
  foreignKey: 'userId',
  as: 'usuario'
});

// Um usuário tem muitos faturamentos
User.hasMany(Faturamento, {
  foreignKey: 'userId',
  as: 'faturamentos',
  onDelete: 'CASCADE'
});
Faturamento.belongsTo(User, {
  foreignKey: 'userId',
  as: 'usuario'
});

// Um usuário tem muitas análises
User.hasMany(Analise, {
  foreignKey: 'userId',
  as: 'analises',
  onDelete: 'CASCADE'
});
Analise.belongsTo(User, {
  foreignKey: 'userId',
  as: 'usuario'
});

// Um usuário tem muitos pacientes
User.hasMany(Paciente, {
  foreignKey: 'userId',
  as: 'pacientes',
  onDelete: 'CASCADE'
});
Paciente.belongsTo(User, {
  foreignKey: 'userId',
  as: 'usuario'
});

// Um usuário tem muitos procedimentos
User.hasMany(Procedimento, {
  foreignKey: 'userId',
  as: 'procedimentos',
  onDelete: 'CASCADE'
});
Procedimento.belongsTo(User, {
  foreignKey: 'userId',
  as: 'usuario'
});

// Um usuário tem muitas contas no plano de contas
User.hasMany(PlanoContas, {
  foreignKey: 'userId',
  as: 'planoContas',
  onDelete: 'CASCADE'
});
PlanoContas.belongsTo(User, {
  foreignKey: 'userId',
  as: 'usuario'
});

// Um usuário tem muitos documentos
User.hasMany(Documento, {
  foreignKey: 'userId',
  as: 'documentos',
  onDelete: 'CASCADE'
});
Documento.belongsTo(User, {
  foreignKey: 'userId',
  as: 'usuario'
});

// Documento pode estar relacionado a um faturamento
Faturamento.hasMany(Documento, {
  foreignKey: 'faturamentoId',
  as: 'documentos'
});
Documento.belongsTo(Faturamento, {
  foreignKey: 'faturamentoId',
  as: 'faturamento'
});

// Documento pode estar relacionado a uma despesa
Despesa.hasMany(Documento, {
  foreignKey: 'despesaId',
  as: 'documentos'
});
Documento.belongsTo(Despesa, {
  foreignKey: 'despesaId',
  as: 'despesa'
});



// Relacionamento: Agendamento pertence a um Procedimento
Agendamento.belongsTo(Procedimento, {
  foreignKey: 'procedimento_id',
  as: 'procedimento'
});

// Relacionamento: Agendamento pertence a um Paciente
Agendamento.belongsTo(Paciente, {
  foreignKey: 'paciente_id',
  as: 'paciente'
});

// Relacionamento: Agendamento pertence ao usuário que o criou
Agendamento.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'usuario'
});

// Importar o model Anamnese
const Anamnese = require('./anamnese');

// Relacionamento: Clinica tem muitos modelos de Anamnese
Clinica.hasMany(Anamnese, {
  foreignKey: 'clinicaId',
  as: 'anamneses',
  onDelete: 'CASCADE'
});
Anamnese.belongsTo(Clinica, {
  foreignKey: 'clinicaId',
  as: 'clinica'
});

// Sugestão pertence a User e Clinica
Sugestao.belongsTo(User,    { foreignKey: 'userId',    as: 'usuario' });
Sugestao.belongsTo(Clinica, { foreignKey: 'clinicaId', as: 'clinica' });
User.hasMany   (Sugestao, { foreignKey: 'userId',    as: 'sugestoes' });
Clinica.hasMany(Sugestao, { foreignKey: 'clinicaId', as: 'sugestoes' });

module.exports = {
  sequelize,
  Clinica,
  User,
  Despesa,
  Faturamento,
  Analise,
  Paciente,
  Procedimento,
  PlanoContas,
  Documento,
  Agendamento,
  Orcamento,
  Anamnese,
  CarneLeao,
  Sugestao
};
