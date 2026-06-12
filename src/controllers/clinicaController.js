/**
 * Controller de Clínicas
 * Gerenciamento de clínicas odontológicas
 */

const { Clinica, User, Faturamento, Despesa, Documento } = require('../models');
const { Op } = require('sequelize');

/**
 * Listar todas as clínicas
 */
const listarClinicas = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', ativo } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    // Filtro de busca
    if (search) {
      where[Op.or] = [
        { nome: { [Op.iLike]: `%${search}%` } },
        { cpf: { [Op.iLike]: `%${search}%` } },
        { cnpj: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filtro de ativo
    if (ativo !== undefined) {
      where.ativo = ativo === 'true';
    }

    const { count, rows: clinicas } = await Clinica.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'usuarios',
          attributes: ['id', 'nome', 'email', 'profissao', 'ativo'],
          where: { isAdmin: false },
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['nome', 'ASC']]
    });

    // Calcular estatísticas de cada clínica
    const clinicasComStats = await Promise.all(
      clinicas.map(async (clinica) => {
        const clinicaJson = clinica.toJSON();

        // Total de faturamentos
        const totalFaturamento = await Faturamento.sum('valor', {
          where: { clinicaId: clinica.id }
        }) || 0;

        // Total de despesas
        const totalDespesas = await Despesa.sum('valor', {
          where: { clinicaId: clinica.id }
        }) || 0;

        // Número de usuários
        const numeroUsuarios = clinicaJson.usuarios?.length || 0;

        return {
          ...clinicaJson,
          estatisticas: {
            totalFaturamento,
            totalDespesas,
            saldo: totalFaturamento - totalDespesas,
            numeroUsuarios
          }
        };
      })
    );

    res.json({
      clinicas: clinicasComStats,
      total: count,
      totalPaginas: Math.ceil(count / limit),
      paginaAtual: parseInt(page)
    });

  } catch (error) {
    console.error('Erro ao listar clínicas:', error);
    res.status(500).json({ error: 'Erro ao listar clínicas' });
  }
};

/**
 * Buscar clínica por ID
 */
const buscarClinica = async (req, res) => {
  try {
    const { id } = req.params;

    const clinica = await Clinica.findByPk(id, {
      include: [
        {
          model: User,
          as: 'usuarios',
          attributes: { exclude: ['senha'] },
          where: { isAdmin: false },
          required: false
        }
      ]
    });

    if (!clinica) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }

    // Buscar estatísticas
    const totalFaturamento = await Faturamento.sum('valor', {
      where: { clinicaId: id }
    }) || 0;

    const totalDespesas = await Despesa.sum('valor', {
      where: { clinicaId: id }
    }) || 0;

    const numeroDocumentos = await Documento.count({
      where: { clinicaId: id }
    });

    const clinicaJson = clinica.toJSON();

    res.json({
      ...clinicaJson,
      estatisticas: {
        totalFaturamento,
        totalDespesas,
        saldo: totalFaturamento - totalDespesas,
        numeroUsuarios: clinicaJson.usuarios?.length || 0,
        numeroDocumentos
      }
    });

  } catch (error) {
    console.error('Erro ao buscar clínica:', error);
    res.status(500).json({ error: 'Erro ao buscar clínica' });
  }
};

/**
 * Criar nova clínica
 */
const criarClinica = async (req, res) => {
  try {
    const {
      nome,
      tipoPessoa,
      cpf,
      cnpj,
      telefone,
      telefoneSecundario,
      email,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      plano,
      limiteUsuarios
    } = req.body;

    // Validações
    if (!nome) {
      return res.status(400).json({ error: 'Nome da clínica é obrigatório' });
    }

    if (tipoPessoa === 'PJ' && !cnpj) {
      return res.status(400).json({ error: 'CNPJ é obrigatório para Pessoa Jurídica' });
    }

    if (tipoPessoa === 'PF' && !cpf) {
      return res.status(400).json({ error: 'CPF é obrigatório para Pessoa Física' });
    }

    // Verificar se CPF/CNPJ já existe
    if (cpf) {
      const clinicaExistente = await Clinica.findOne({ where: { cpf } });
      if (clinicaExistente) {
        return res.status(400).json({ error: 'CPF já cadastrado' });
      }
    }

    if (cnpj) {
      const clinicaExistente = await Clinica.findOne({ where: { cnpj } });
      if (clinicaExistente) {
        return res.status(400).json({ error: 'CNPJ já cadastrado' });
      }
    }

    // Criar clínica
    const clinica = await Clinica.create({
      nome,
      tipoPessoa,
      cpf,
      cnpj,
      telefone,
      telefoneSecundario,
      email,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      plano: plano || 'FREE',
      limiteUsuarios: limiteUsuarios || 1,
      dataAssinatura: new Date(),
      ativo: true
    });

    // Cadastro automático do procedimento 'Avaliação'
    const { Procedimento } = require('../models');
    await Procedimento.create({
      nome: 'Avaliação',
      descricao: 'Procedimento padrão de avaliação inicial',
      clinicaId: clinica.id,
      ativo: true,
      valorPadrao: 0
    });

    res.status(201).json(clinica);

  } catch (error) {
    console.error('Erro ao criar clínica:', error);
    res.status(500).json({ error: 'Erro ao criar clínica' });
  }
};

/**
 * Atualizar clínica
 */
const atualizarClinica = async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;

    const clinica = await Clinica.findByPk(id);

    if (!clinica) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }

    // Verificar CPF/CNPJ duplicado
    if (dados.cpf && dados.cpf !== clinica.cpf) {
      const clinicaExistente = await Clinica.findOne({ 
        where: { cpf: dados.cpf, id: { [Op.ne]: id } } 
      });
      if (clinicaExistente) {
        return res.status(400).json({ error: 'CPF já cadastrado' });
      }
    }

    if (dados.cnpj && dados.cnpj !== clinica.cnpj) {
      const clinicaExistente = await Clinica.findOne({ 
        where: { cnpj: dados.cnpj, id: { [Op.ne]: id } } 
      });
      if (clinicaExistente) {
        return res.status(400).json({ error: 'CNPJ já cadastrado' });
      }
    }

    await clinica.update(dados);

    res.json(clinica);

  } catch (error) {
    console.error('Erro ao atualizar clínica:', error);
    res.status(500).json({ error: 'Erro ao atualizar clínica', detail: error.message, sql: error.sql });
  }
};

/**
 * Desativar clínica
 */
const desativarClinica = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const clinica = await Clinica.findByPk(id);

    if (!clinica) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }

    await clinica.update({
      ativo: false,
      motivoInativo: motivo,
      dataInativacao: new Date()
    });

    // Desativar também todos os usuários da clínica
    await User.update(
      { ativo: false },
      { where: { clinicaId: id } }
    );

    res.json({ message: 'Clínica desativada com sucesso' });

  } catch (error) {
    console.error('Erro ao desativar clínica:', error);
    res.status(500).json({ error: 'Erro ao desativar clínica' });
  }
};

/**
 * Reativar clínica
 */
const reativarClinica = async (req, res) => {
  try {
    const { id } = req.params;

    const clinica = await Clinica.findByPk(id);

    if (!clinica) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }

    await clinica.update({
      ativo: true,
      motivoInativo: null,
      dataInativacao: null
    });

    res.json({ message: 'Clínica reativada com sucesso' });

  } catch (error) {
    console.error('Erro ao reativar clínica:', error);
    res.status(500).json({ error: 'Erro ao reativar clínica' });
  }
};

/**
 * Buscar usuários de uma clínica
 */
const buscarUsuariosClinica = async (req, res) => {
  try {
    const { id } = req.params;

    const clinica = await Clinica.findByPk(id);

    if (!clinica) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }

    const usuarios = await User.findAll({
      where: { clinicaId: id, isAdmin: false },
      attributes: { exclude: ['senha'] },
      order: [['nome', 'ASC']]
    });

    res.json(usuarios);

  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários da clínica' });
  }
};

/**
 * Relatório financeiro da clínica
 */
const relatorioFinanceiro = async (req, res) => {
  try {
    const { id } = req.params;
    const { dataInicio, dataFim } = req.query;

    const clinica = await Clinica.findByPk(id);

    if (!clinica) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }

    const where = { clinicaId: id };

    if (dataInicio && dataFim) {
      where.data = {
        [Op.between]: [new Date(dataInicio), new Date(dataFim)]
      };
    }

    // Buscar faturamentos
    const faturamentos = await Faturamento.findAll({
      where,
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['nome']
        }
      ],
      order: [['data', 'DESC']]
    });

    // Buscar despesas
    const despesas = await Despesa.findAll({
      where,
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['nome']
        }
      ],
      order: [['data', 'DESC']]
    });

    const totalFaturamento = faturamentos.reduce((sum, f) => sum + parseFloat(f.valor), 0);
    const totalDespesas = despesas.reduce((sum, d) => sum + parseFloat(d.valor), 0);

    res.json({
      clinica: {
        id: clinica.id,
        nome: clinica.nome
      },
      periodo: {
        dataInicio: dataInicio || 'Início',
        dataFim: dataFim || 'Hoje'
      },
      faturamentos: {
        registros: faturamentos,
        total: totalFaturamento,
        quantidade: faturamentos.length
      },
      despesas: {
        registros: despesas,
        total: totalDespesas,
        quantidade: despesas.length
      },
      resumo: {
        totalFaturamento,
        totalDespesas,
        saldo: totalFaturamento - totalDespesas,
        impostos: totalFaturamento * 0.065
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório financeiro' });
  }
};

module.exports = {
  listarClinicas,
  buscarClinica,
  criarClinica,
  atualizarClinica,
  desativarClinica,
  reativarClinica,
  buscarUsuariosClinica,
  relatorioFinanceiro
};
