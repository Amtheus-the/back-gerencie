/**
 * Controller do Dashboard da Clínica
 * Retorna métricas específicas da clínica
 */


const { User, Paciente, Agendamento, Procedimento } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

exports.getMetricasClinica = async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const clinicaId = req.user.clinicaId;
    if (!clinicaId) {
      return res.status(400).json({ success: false, message: 'Usuário sem clínica vinculada.' });
    }

    // === INATIVAÇÃO AUTOMÁTICA DE PACIENTES SEM AGENDAMENTO HÁ 6 MESES ===
    // Inativação automática (mantém)
    const pacientesAtivosLista = await Paciente.findAll({
      where: { clinicaId, ativo: true },
      attributes: ['id', 'nome', 'dataCadastro', 'createdAt', 'dataNascimento', 'telefone'],
      raw: true
    });
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
    const idsParaInativar = [];
    for (const paciente of pacientesAtivosLista) {
      const ultimoAg = await Agendamento.findOne({
        where: { paciente_id: paciente.id },
        order: [['data_hora', 'DESC']],
        attributes: ['data_hora'],
        raw: true
      });
      let ultimaData = paciente.dataCadastro;
      if (ultimoAg && ultimoAg.data_hora) {
        ultimaData = ultimoAg.data_hora;
      }
      if (new Date(ultimaData) < seisMesesAtras) {
        idsParaInativar.push(paciente.id);
      }
    }
    if (idsParaInativar.length > 0) {
      await Paciente.update({ ativo: false }, { where: { id: idsParaInativar } });
    }

    // NOVO: Buscar todos os pacientes inativos há mais de 6 meses sem agendamento
    let pacientesRetencao = [];
    const pacientesInativos = await Paciente.findAll({
      where: { clinicaId, ativo: false },
      attributes: ['id', 'nome', 'dataCadastro', 'createdAt', 'dataNascimento', 'telefone'],
      raw: true
    });
    for (const paciente of pacientesInativos) {
      const ultimoAg = await Agendamento.findOne({
        where: { paciente_id: paciente.id },
        order: [['data_hora', 'DESC']],
        attributes: ['data_hora'],
        raw: true
      });
      let ultimaData = paciente.dataCadastro;
      if (ultimoAg && ultimoAg.data_hora) {
        ultimaData = ultimoAg.data_hora;
      }
      if (new Date(ultimaData) < seisMesesAtras) {
        pacientesRetencao.push({
          id: paciente.id,
          nome: paciente.nome,
          telefone: paciente.telefone,
          dataUltimoAgendamento: ultimoAg ? ultimoAg.data_hora : null
        });
      }
    }

    // Definir datas do período logo no início
    const dataAtual = new Date();
    const mesConsulta = mes || (dataAtual.getMonth() + 1);
    const anoConsulta = ano || dataAtual.getFullYear();
    const dataInicio = new Date(anoConsulta, mesConsulta - 1, 1);
    const dataFim = new Date(anoConsulta, mesConsulta, 0);

    // === TOP PROCEDIMENTOS POR VALOR ===
    // Busca todos os agendamentos da clínica no período
    const agendamentos = await Agendamento.findAll({
      where: {
        clinica_id: clinicaId,
        data_hora: {
          [Op.between]: [dataInicio, dataFim]
        }
      },
      attributes: ['id', 'paciente_id', 'data_hora', 'procedimento_id'],
      raw: true
    });

    // Conta e soma por procedimento
    const procIds = agendamentos.map(a => a.procedimento_id);
    let topProcedimentos = [];
    if (procIds.length > 0) {
      // Busca nome e valor dos procedimentos
      const procedimentos = await Procedimento.findAll({
        where: { id: procIds },
        attributes: ['id', 'nome', 'valorPadrao'],
        raw: true
      });
      // Soma valores por procedimento
      const somaPorProc = {};
      agendamentos.forEach(a => {
        const proc = procedimentos.find(p => p.id === a.procedimento_id);
        if (!proc) return;
        if (!somaPorProc[proc.nome]) {
          somaPorProc[proc.nome] = { nome: proc.nome, valor: 0 };
        }
        somaPorProc[proc.nome].valor += Number(proc.valorPadrao || 0);
      });
      topProcedimentos = Object.values(somaPorProc)
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5); // Top 5
    }

    // === FLUXO DE PACIENTES (NOVOS E RETORNOS) ===
    // Para cada paciente, pega o primeiro agendamento do mês como "novo", os demais como "retorno"
    const agPorPaciente = {};
    agendamentos.forEach(a => {
      if (!agPorPaciente[a.paciente_id]) agPorPaciente[a.paciente_id] = [];
      agPorPaciente[a.paciente_id].push(a);
    });
    let novos = 0;
    let retornos = 0;
    Object.values(agPorPaciente).forEach(ags => {
      if (ags.length > 0) {
        novos += 1; // O primeiro agendamento do paciente no mês
        retornos += ags.length - 1; // O resto são retornos
      }
    });
    const totalAtendimentos = agendamentos.length;


    // Usuários
    const totalUsuarios = await User.count({ where: { clinicaId } });
    const usuariosAtivos = await User.count({ where: { clinicaId, ativo: true } });
    const novosUsuariosMes = await User.count({
      where: {
        clinicaId,
        createdAt: {
          [Op.between]: [dataInicio, dataFim]
        }
      }
    });

    // Pacientes
    const totalPacientes = await Paciente.count({ where: { clinicaId } });
    const pacientesAtivos = await Paciente.count({ where: { clinicaId, ativo: true } });
    const novosPacientesMes = await Paciente.count({
      where: {
        clinicaId,
        createdAt: {
          [Op.between]: [dataInicio, dataFim]
        }
      }
    });

    // Busca aniversariantes do mês
    const aniversariantesMes = await Paciente.findAll({
      where: {
        clinicaId,
        ativo: true,
        dataNascimento: {
          [Op.ne]: null,
        },
        [Op.and]: [
          sequelize.where(sequelize.fn('MONTH', sequelize.col('data_nascimento')), mesConsulta)
        ]
      },
      attributes: ['id', 'nome', 'dataNascimento', 'telefone'],
      order: [
        [sequelize.fn('DAY', sequelize.col('data_nascimento')), 'ASC']
      ]
    });

    // === MÉTRICAS ODONTOLÓGICAS ===
    // 1. Total de avaliações realizadas (agendamentos do tipo "Avaliação")
    let totalAvaliacoes = 0;
    if (agendamentos.length > 0) {
      // Busca o procedimento "Avaliação" (case insensitive)
      const procAvaliacao = await Procedimento.findOne({
        where: {
          clinicaId,
          nome: { [Op.like]: '%avalia%' }
        },
        attributes: ['id']
      });
      if (procAvaliacao) {
        totalAvaliacoes = agendamentos.filter(a => a.procedimento_id === procAvaliacao.id).length;
      }
    }

    // 2. Total de tratamentos fechados (orçamentos com status 'fechado' no período)
    const Orcamento = require('../models/Orcamento');
    let totalTratamentosFechados = 0;
    if (Orcamento) {
      totalTratamentosFechados = await Orcamento.count({
        where: {
          clinica_id: clinicaId,
          status: 'fechado',
          createdAt: {
            [Op.between]: [dataInicio, dataFim]
          }
        }
      });
    }

    // 3. Meta de conversão (fixo ou configurável)
    const metaConversao = 75;

    res.json({
      success: true,
      periodo: { mes: mesConsulta, ano: anoConsulta },
      totalUsuarios,
      usuariosAtivos,
      novosUsuariosMes,
      totalPacientes,
      pacientesAtivos,
      novosPacientesMes,
      aniversariantesMes,
      topProcedimentos,
      fluxoPacientesMes: {
        total: totalAtendimentos,
        novos,
        retornos
      },
      pacientesRetencao, // lista de pacientes inativados por falta de agendamento
      totalAvaliacoes,
      totalTratamentosFechados,
      metaConversao
    });
  } catch (error) {
    console.error('Erro ao buscar métricas da clínica:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar métricas da clínica' });
  }
}
