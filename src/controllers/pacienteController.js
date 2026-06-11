const { Agendamento, Procedimento, Paciente } = require('../models');
const { Op } = require('sequelize');

// Todos da mesma clínica veem todos os pacientes da clínica
const filtroPaciente = (req) => ({ clinica_id: req.user.clinicaId });

class PacienteController {
  // Histórico de procedimentos do paciente
  async historicoProcedimentos(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Busca agendamentos do paciente, incluindo dados do procedimento
      const agendamentos = await Agendamento.findAll({
        where: { paciente_id: id, user_id: userId },
        include: [
          {
            model: Procedimento,
            as: 'procedimento',
            attributes: ['nome', 'descricao', 'valorPadrao']
          }
        ],
        order: [['data_hora', 'DESC']]
      });

      // Mapeia para um formato mais amigável
      const historico = agendamentos.map(a => ({
        id: a.id,
        data: a.data_hora,
        procedimento: a.procedimento?.nome || '',
        descricao: a.procedimento?.descricao || '',
        valor: a.procedimento?.valorPadrao || '',
        status: a.status,
        observacoes: a.observacoes
      }));

      return res.json(historico);
    } catch (error) {
      console.error('Erro ao buscar histórico de procedimentos:', error);
      return res.status(500).json({
        message: 'Erro ao buscar histórico de procedimentos',
        error: error.message
      });
    }
  }
  // Listar pacientes com paginação e busca server-side
  async listar(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, parseInt(req.query.limit) || 20);
      const offset = (page - 1) * limit;
      const busca = req.query.busca?.trim();

      const where = { ...filtroPaciente(req) };
      if (busca) {
        where[Op.or] = [
          { nome: { [Op.like]: `%${busca}%` } },
          { cpfCnpj: { [Op.like]: `%${busca}%` } }
        ];
      }

      const { count, rows } = await Paciente.findAndCountAll({
        where,
        order: [['nome', 'ASC']],
        limit,
        offset
      });

      return res.json({
        pacientes: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
        limit
      });
    } catch (error) {
      console.error('Erro ao listar pacientes:', error);
      return res.status(500).json({
        message: 'Erro ao buscar pacientes',
        error: error.message
      });
    }
  }

  // Buscar paciente por ID
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;

      const paciente = await Paciente.findOne({
        where: { id, ...filtroPaciente(req) }
      });

      if (!paciente) {
        return res.status(404).json({ message: 'Paciente não encontrado' });
      }

      return res.json(paciente);
    } catch (error) {
      console.error('Erro ao buscar paciente:', error);
      return res.status(500).json({ 
        message: 'Erro ao buscar paciente',
        error: error.message 
      });
    }
  }

  // Criar novo paciente
  async criar(req, res) {
    try {
      const user_id = req.user.id;
      const clinica_id = req.user.clinicaId;
      // Garante que os campos corretos do banco sejam usados
      const dadosPaciente = { ...req.body, user_id, clinica_id };

      const paciente = await Paciente.create(dadosPaciente);

      return res.status(201).json(paciente);
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      return res.status(500).json({ 
        message: 'Erro ao criar paciente',
        error: error.message 
      });
    }
  }

  // Atualizar paciente
  async atualizar(req, res) {
    try {
      const { id } = req.params;

      const paciente = await Paciente.findOne({
        where: { id, ...filtroPaciente(req) }
      });

      if (!paciente) {
        return res.status(404).json({ message: 'Paciente não encontrado' });
      }

      // Remove null/undefined para não sobrescrever NOT NULL columns
      const dados = Object.fromEntries(
        Object.entries(req.body).filter(([, v]) => v !== null && v !== undefined)
      );
      await paciente.update(dados);

      return res.json(paciente);
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error);
      return res.status(500).json({ 
        message: 'Erro ao atualizar paciente',
        error: error.message 
      });
    }
  }

  // Deletar paciente
  async deletar(req, res) {
    try {
      const { id } = req.params;

      const paciente = await Paciente.findOne({
        where: { id, ...filtroPaciente(req) }
      });

      if (!paciente) {
        return res.status(404).json({ message: 'Paciente não encontrado' });
      }

      await paciente.destroy();

      return res.json({ message: 'Paciente removido com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar paciente:', error);
      return res.status(500).json({ 
        message: 'Erro ao deletar paciente',
        error: error.message 
      });
    }
  }

  // Buscar pacientes (para autocomplete)
  async buscar(req, res) {
    try {
      const { termo } = req.query;

      const where = { ...filtroPaciente(req), ativo: true };

      if (termo) {
        const { Op } = require('sequelize');
        where[Op.or] = [
          { nome: { [Op.iLike]: `%${termo}%` } },
          { cpfCnpj: { [Op.iLike]: `%${termo}%` } }
        ];
      }

      const pacientes = await Paciente.findAll({
        where,
        order: [['nome', 'ASC']],
        limit: 50
      });

      return res.json(pacientes);
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
      return res.status(500).json({ 
        message: 'Erro ao buscar pacientes',
        error: error.message 
      });
    }
  }
}

module.exports = new PacienteController();
