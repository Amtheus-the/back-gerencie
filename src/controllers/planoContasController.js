/**
 * Controller de Plano de Contas
 * Gerencia operações CRUD de plano de contas
 */

const { PlanoContas } = require('../models');
const { Op } = require('sequelize');

// Secretaria enxerga os planos do dentista que a criou
const userIdFiltro = (req) =>
  req.user.role === 'secretaria' ? req.user.criadoPorId : req.user.id;

class PlanoContasController {
  // Listar todas as contas do usuário
  async listar(req, res) {
    try {
      const userId = userIdFiltro(req);
      const { tipo } = req.query;

      const where = { userId };
      if (tipo) {
        where.tipo = tipo;
      }

      const contas = await PlanoContas.findAll({
        where,
        order: [['codigo', 'ASC'], ['nome', 'ASC']]
      });

      return res.json(contas);
    } catch (error) {
      console.error('Erro ao listar plano de contas:', error);
      return res.status(500).json({ 
        message: 'Erro ao buscar plano de contas',
        error: error.message 
      });
    }
  }

  // Buscar conta por ID
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const userId = userIdFiltro(req);

      const conta = await PlanoContas.findOne({
        where: { id, userId }
      });

      if (!conta) {
        return res.status(404).json({ message: 'Conta não encontrada' });
      }

      return res.json(conta);
    } catch (error) {
      console.error('Erro ao buscar conta:', error);
      return res.status(500).json({ 
        message: 'Erro ao buscar conta',
        error: error.message 
      });
    }
  }

  // Criar nova conta
  async criar(req, res) {
    try {
      const userId = req.user.id;
      const dadosConta = { ...req.body, userId };

      const conta = await PlanoContas.create(dadosConta);

      return res.status(201).json(conta);
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      return res.status(500).json({ 
        message: 'Erro ao criar conta',
        error: error.message 
      });
    }
  }

  // Atualizar conta
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const conta = await PlanoContas.findOne({
        where: { id, userId }
      });

      if (!conta) {
        return res.status(404).json({ message: 'Conta não encontrada' });
      }

      await conta.update(req.body);

      return res.json(conta);
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      return res.status(500).json({ 
        message: 'Erro ao atualizar conta',
        error: error.message 
      });
    }
  }

  // Deletar conta
  async deletar(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const conta = await PlanoContas.findOne({
        where: { id, userId }
      });

      if (!conta) {
        return res.status(404).json({ message: 'Conta não encontrada' });
      }

      await conta.destroy();

      return res.json({ message: 'Conta removida com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      return res.status(500).json({ 
        message: 'Erro ao deletar conta',
        error: error.message 
      });
    }
  }

  // Buscar contas (para autocomplete)
  async buscar(req, res) {
    try {
      const userId = req.user.id;
      const { termo, tipo, dedutivel } = req.query;

      const where = { userId, ativo: true };

      // Filtrar por tipo (receita/despesa)
      if (tipo) {
        where.tipo = tipo;
      }

      // Filtrar por dedutível (apenas para despesas)
      if (dedutivel !== undefined) {
        where.dedutivel = dedutivel === 'true';
      }

      // Buscar por termo
      if (termo) {
        where[Op.or] = [
          { nome: { [Op.iLike]: `%${termo}%` } },
          { codigo: { [Op.iLike]: `%${termo}%` } },
          { categoria: { [Op.iLike]: `%${termo}%` } }
        ];
      }

      const contas = await PlanoContas.findAll({
        where,
        order: [['nome', 'ASC']],
        limit: 50
      });

      return res.json(contas);
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      return res.status(500).json({ 
        message: 'Erro ao buscar contas',
        error: error.message 
      });
    }
  }
}

module.exports = new PlanoContasController();
