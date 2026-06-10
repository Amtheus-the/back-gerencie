/**
 * Controller para Dashboard Administrativo
 * Gerencia dados e estatísticas de todos os usuários do sistema
 */

const { User, Clinica, Faturamento, Despesa, Analise } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Obter estatísticas gerais do sistema
 */
exports.getEstatisticasGerais = async (req, res) => {
  try {
    // Total de usuários
    const totalUsuarios = await User.count({
      where: { ativo: true }
    });

    // Usuários ativos nos últimos 30 dias
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const usuariosAtivos = await User.count({
      where: {
        ativo: true,
        updatedAt: {
          [Op.gte]: trintaDiasAtras
        }
      }
    });

    // Total de lançamentos (faturamento + despesas)
    const totalFaturamento = await Faturamento.count();
    const totalDespesas = await Despesa.count();
    const totalLancamentos = totalFaturamento + totalDespesas;

    // Total de análises realizadas
    const totalAnalises = await Analise.count();

    // Novos usuários este mês
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const novosUsuariosMes = await User.count({
      where: {
        createdAt: {
          [Op.gte]: inicioMes
        }
      }
    });

    // Valor total de faturamento e despesas
    const [faturamentoTotal] = await Faturamento.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('valor')), 'total']
      ],
      raw: true
    });

    const [despesasTotal] = await Despesa.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('valor')), 'total']
      ],
      raw: true
    });

    res.json({
      totalUsuarios,
      usuariosAtivos,
      totalLancamentos,
      totalAnalises,
      novosUsuariosMes,
      faturamentoTotal: parseFloat(faturamentoTotal?.total || 0),
      despesasTotal: parseFloat(despesasTotal?.total || 0),
      saldoTotal: parseFloat(faturamentoTotal?.total || 0) - parseFloat(despesasTotal?.total || 0)
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas gerais:', error);
    res.status(500).json({
      erro: 'Erro ao buscar estatísticas gerais',
      detalhes: error.message
    });
  }
};

/**
 * Listar todos os usuários com informações detalhadas
 */
exports.listarUsuarios = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', ordenar = 'createdAt', ordem = 'DESC' } = req.query;
    
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        { nome: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { nomeClinica: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    const usuarios = await User.findAndCountAll({
      where: whereClause,
      attributes: {
        exclude: ['senha'],
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM faturamentos
              WHERE faturamentos.user_id = User.id
            )`),
            'totalFaturamentos'
          ],
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM despesas
              WHERE despesas.user_id = User.id
            )`),
            'totalDespesas'
          ],
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM analises
              WHERE analises.user_id = User.id
            )`),
            'totalAnalises'
          ],
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(valor), 0)
              FROM faturamentos
              WHERE faturamentos.user_id = User.id
            )`),
            'valorTotalFaturamento'
          ],
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(valor), 0)
              FROM despesas
              WHERE despesas.user_id = User.id
            )`),
            'valorTotalDespesas'
          ]
        ]
      },
      order: [[ordenar, ordem]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      usuarios: usuarios.rows,
      totalUsuarios: usuarios.count,
      paginaAtual: parseInt(page),
      totalPaginas: Math.ceil(usuarios.count / limit)
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      erro: 'Erro ao listar usuários',
      detalhes: error.message
    });
  }
};

/**
 * Obter detalhes de um usuário específico
 */
exports.getUsuarioDetalhes = async (req, res) => {
  try {
    const { userId } = req.params;

    const usuario = await User.findByPk(userId, {
      attributes: { exclude: ['senha'] }
    });

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Estatísticas do usuário
    const totalFaturamentos = await Faturamento.count({ where: { userId } });
    const totalDespesas = await Despesa.count({ where: { userId } });
    const totalAnalises = await Analise.count({ where: { userId } });

    const [faturamentoTotal] = await Faturamento.findAll({
      where: { userId },
      attributes: [[sequelize.fn('SUM', sequelize.col('valor')), 'total']],
      raw: true
    });

    const [despesasTotal] = await Despesa.findAll({
      where: { userId },
      attributes: [[sequelize.fn('SUM', sequelize.col('valor')), 'total']],
      raw: true
    });

    // Últimos lançamentos
    const ultimosFaturamentos = await Faturamento.findAll({
      where: { userId },
      order: [['data', 'DESC']],
      limit: 5
    });

    const ultimasDespesas = await Despesa.findAll({
      where: { userId },
      order: [['data', 'DESC']],
      limit: 5
    });

    res.json({
      usuario: usuario.toJSON(),
      estatisticas: {
        totalFaturamentos,
        totalDespesas,
        totalAnalises,
        valorTotalFaturamento: parseFloat(faturamentoTotal?.total || 0),
        valorTotalDespesas: parseFloat(despesasTotal?.total || 0),
        saldo: parseFloat(faturamentoTotal?.total || 0) - parseFloat(despesasTotal?.total || 0)
      },
      ultimosLancamentos: {
        faturamentos: ultimosFaturamentos,
        despesas: ultimasDespesas
      }
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do usuário:', error);
    res.status(500).json({
      erro: 'Erro ao buscar detalhes do usuário',
      detalhes: error.message
    });
  }
};

/**
 * Obter atividades recentes do sistema
 */
exports.getAtividadesRecentes = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Buscar usuários recém-cadastrados
    const usuariosRecentes = await User.findAll({
      attributes: ['id', 'nome', 'email', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit) / 2
    });

    // Buscar análises recentes
    const analisesRecentes = await Analise.findAll({
      attributes: ['id', 'userId', 'estruturaRecomendada', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit) / 2,
      raw: true
    });

    // Buscar nomes dos usuários das análises
    const userIds = analisesRecentes.map(a => a.userId);
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'nome'],
      raw: true
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u.nome]));

    // Combinar e ordenar atividades
    const atividades = [
      ...usuariosRecentes.map(u => ({
        tipo: 'novo_usuario',
        descricao: `${u.nome} se cadastrou no sistema`,
        usuario: u.nome,
        data: u.createdAt
      })),
      ...analisesRecentes.map(a => ({
        tipo: 'analise',
        descricao: `${userMap[a.userId] || 'Usuário'} realizou uma análise`,
        usuario: userMap[a.userId],
        data: a.createdAt
      }))
    ].sort((a, b) => new Date(b.data) - new Date(a.data))
     .slice(0, parseInt(limit));

    res.json(atividades);
  } catch (error) {
    console.error('Erro ao buscar atividades recentes:', error);
    res.status(500).json({
      erro: 'Erro ao buscar atividades recentes',
      detalhes: error.message
    });
  }
};

/**
 * Obter gráfico de crescimento de usuários
 */
exports.getGraficoCrescimento = async (req, res) => {
  try {
    const { periodo = '12' } = req.query; // últimos 12 meses por padrão
    
    const mesesAtras = parseInt(periodo);
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - mesesAtras);
    dataInicio.setDate(1);
    dataInicio.setHours(0, 0, 0, 0);

    const usuarios = await User.findAll({

      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m-01'), 'mes'],
        [sequelize.fn('COUNT', '*'), 'total']
      ],
      where: {
        createdAt: {
          [Op.gte]: dataInicio
        }
      },
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m-01')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m-01'), 'ASC']],
      raw: true
    });

    // Formatar dados para o gráfico
    const dados = usuarios.map(u => ({
      mes: new Date(u.mes).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
      total: parseInt(u.total)
    }));

    res.json(dados);
  } catch (error) {
    console.error('Erro ao buscar gráfico de crescimento:', error);
    res.status(500).json({
      erro: 'Erro ao buscar gráfico de crescimento',
      detalhes: error.message
    });
  }
};

/**
 * Alternar status ativo do usuário
 */
exports.toggleStatusUsuario = async (req, res) => {
  try {
    const { userId } = req.params;

    const usuario = await User.findByPk(userId);

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Não permitir desativar o próprio usuário admin
    if (usuario.id === req.userId) {
      return res.status(400).json({ erro: 'Você não pode desativar sua própria conta' });
    }

    usuario.ativo = !usuario.ativo;
    await usuario.save();

    res.json({
      mensagem: `Usuário ${usuario.ativo ? 'ativado' : 'desativado'} com sucesso`,
      usuario: usuario.toJSON()
    });
  } catch (error) {
    console.error('Erro ao alternar status do usuário:', error);
    res.status(500).json({
      erro: 'Erro ao alternar status do usuário',
      detalhes: error.message
    });
  }
};

/**
 * Obter distribuição de tipos de usuário
 */
exports.getDistribuicaoTipos = async (req, res) => {
  try {
    // tipoPessoa é fonte única na tabela clinicas
    const distribuicao = await Clinica.findAll({
      attributes: [
        'tipoPessoa',
        [sequelize.fn('COUNT', '*'), 'total']
      ],
      where: { ativo: true },
      group: ['tipoPessoa'],
      raw: true
    });

    res.json(distribuicao.map(d => ({
      tipo: d.tipoPessoa,
      total: parseInt(d.total)
    })));
  } catch (error) {
    console.error('Erro ao buscar distribuição de tipos:', error);
    res.status(500).json({
      erro: 'Erro ao buscar distribuição de tipos',
      detalhes: error.message
    });
  }
};
