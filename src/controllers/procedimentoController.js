/**
 * Controller de Procedimentos
 * Gerencia operações CRUD de procedimentos odontológicos
 */

const { Procedimento } = require('../models');
const { Op } = require('sequelize');

class ProcedimentoController {
  // Listar todos os procedimentos da clínica
  async listar(req, res) {
    try {
      const clinicaId = req.user.clinicaId;
      
      // Buscar procedimentos da clínica inteira
      const procedimentos = await Procedimento.findAll({
        where: { clinicaId },
        order: [['nome', 'ASC']]
      });

      return res.json(procedimentos);
    } catch (error) {
      console.error('Erro ao listar procedimentos:', error);
      return res.status(500).json({ 
        message: 'Erro ao buscar procedimentos',
        error: error.message 
      });
    }
  }

  // Buscar procedimento por ID
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const procedimento = await Procedimento.findOne({
        where: { id, userId }
      });

      if (!procedimento) {
        return res.status(404).json({ message: 'Procedimento não encontrado' });
      }

      return res.json(procedimento);
    } catch (error) {
      console.error('Erro ao buscar procedimento:', error);
      return res.status(500).json({ 
        message: 'Erro ao buscar procedimento',
        error: error.message 
      });
    }
  }

  // Criar novo procedimento
  async criar(req, res) {
    try {
      const userId = req.user.id;
      const clinicaId = req.user.clinicaId;
      const dadosProcedimento = { ...req.body, userId, clinicaId };

      const procedimento = await Procedimento.create(dadosProcedimento);

      return res.status(201).json(procedimento);
    } catch (error) {
      console.error('Erro ao criar procedimento:', error);
      return res.status(500).json({ 
        message: 'Erro ao criar procedimento',
        error: error.message 
      });
    }
  }

  // Atualizar procedimento
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const procedimento = await Procedimento.findOne({
        where: { id, userId }
      });

      if (!procedimento) {
        return res.status(404).json({ message: 'Procedimento não encontrado' });
      }

      await procedimento.update(req.body);

      return res.json(procedimento);
    } catch (error) {
      console.error('Erro ao atualizar procedimento:', error);
      return res.status(500).json({ 
        message: 'Erro ao atualizar procedimento',
        error: error.message 
      });
    }
  }

  // Deletar procedimento
  async deletar(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const procedimento = await Procedimento.findOne({
        where: { id, userId }
      });

      if (!procedimento) {
        return res.status(404).json({ message: 'Procedimento não encontrado' });
      }

      await procedimento.destroy();

      return res.json({ message: 'Procedimento removido com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar procedimento:', error);
      return res.status(500).json({ 
        message: 'Erro ao deletar procedimento',
        error: error.message 
      });
    }
  }

  // Buscar procedimentos (para autocomplete) - da clínica inteira
  async buscar(req, res) {
    try {
      const clinicaId = req.user.clinicaId;
      const { termo } = req.query;

      const where = { clinicaId, ativo: true };

      if (termo) {
        where[Op.or] = [
          { nome: { [Op.iLike]: `%${termo}%` } },
          { codigo: { [Op.iLike]: `%${termo}%` } },
          { categoria: { [Op.iLike]: `%${termo}%` } }
        ];
      }

      const procedimentos = await Procedimento.findAll({
        where,
        order: [['nome', 'ASC']],
        limit: 50
      });

      return res.json(procedimentos);
    } catch (error) {
      console.error('Erro ao buscar procedimentos:', error);
      return res.status(500).json({ 
        message: 'Erro ao buscar procedimentos',
        error: error.message 
      });
    }
  }
}

module.exports = new ProcedimentoController();
