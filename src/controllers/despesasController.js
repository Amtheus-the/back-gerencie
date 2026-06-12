/**
 * Controller de despesas
 * Gerencia lógica de CRUD para despesas
 */

const { Despesa } = require('../models');
const { Op } = require('sequelize');

/**
 * Lista todas as despesas da clínica
 */
exports.listarDespesas = async (req, res) => {
  try {
    const { dataInicio, dataFim, categoria } = req.query;

    // Filtra por clínica — dentista e secretaria veem as mesmas despesas
    const where = { clinicaId: req.user.clinicaId };

    if (dataInicio && dataFim) {
      where.data = { [Op.between]: [dataInicio, dataFim] };
    }

    if (categoria) {
      where.categoria = categoria;
    }

    const despesas = await Despesa.findAll({
      where,
      order: [['data', 'DESC']]
    });

    const total = despesas.reduce((sum, d) => sum + parseFloat(d.valor), 0);

    res.json({
      success: true,
      count: despesas.length,
      total: total.toFixed(2),
      data: despesas
    });
  } catch (error) {
    console.error('Erro ao listar despesas:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar despesas' });
  }
};

/**
 * Cria uma nova despesa
 */
exports.criarDespesa = async (req, res) => {
  try {
    const userId = req.user.id;
    const clinicaId = req.user.clinicaId;
    const { descricao, valor, categoria, data, tipo, observacoes, plano_conta_id } = req.body;

    if (!descricao || !valor || !categoria || !data) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: descricao, valor, categoria, data'
      });
    }

    let planoContaIdFinal = plano_conta_id;
    if (!planoContaIdFinal) {
      const { PlanoContas } = require('../models');
      const planoPadrao = await PlanoContas.findOne({
        where: { userId, nome: 'Outras despesas' }
      });
      planoContaIdFinal = planoPadrao ? planoPadrao.id : null;
    }

    const novaDespesa = await Despesa.create({
      userId,
      clinicaId,
      descricao,
      valor,
      categoria,
      data,
      tipo: tipo || 'variavel',
      observacoes,
      plano_conta_id: planoContaIdFinal
    });

    res.status(201).json({
      success: true,
      message: 'Despesa criada com sucesso',
      data: novaDespesa
    });
  } catch (error) {
    console.error('Erro ao criar despesa:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar despesa' });
  }
};

/**
 * Busca uma despesa específica
 */
exports.buscarDespesa = async (req, res) => {
  try {
    const { id } = req.params;

    const despesa = await Despesa.findOne({
      where: { id, clinicaId: req.user.clinicaId }
    });

    if (!despesa) {
      return res.status(404).json({ success: false, message: 'Despesa não encontrada' });
    }

    res.json({ success: true, data: despesa });
  } catch (error) {
    console.error('Erro ao buscar despesa:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar despesa' });
  }
};

/**
 * Atualiza uma despesa
 */
exports.atualizarDespesa = async (req, res) => {
  try {
    const { id } = req.params;

    const despesa = await Despesa.findOne({
      where: { id, clinicaId: req.user.clinicaId }
    });

    if (!despesa) {
      return res.status(404).json({ success: false, message: 'Despesa não encontrada' });
    }

    await despesa.update(req.body);

    res.json({ success: true, message: 'Despesa atualizada com sucesso', data: despesa });
  } catch (error) {
    console.error('Erro ao atualizar despesa:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar despesa' });
  }
};

/**
 * Remove uma despesa
 */
exports.deletarDespesa = async (req, res) => {
  try {
    const { id } = req.params;

    const despesa = await Despesa.findOne({
      where: { id, clinicaId: req.user.clinicaId }
    });

    if (!despesa) {
      return res.status(404).json({ success: false, message: 'Despesa não encontrada' });
    }

    await despesa.destroy();

    res.json({ success: true, message: 'Despesa removida com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar despesa:', error);
    res.status(500).json({ success: false, message: 'Erro ao deletar despesa' });
  }
};

/**
 * Toggle usado_carne_leao
 */
exports.toggleCarneLeao = async (req, res) => {
  try {
    const { id } = req.params;
    const { sequelize } = require('../config/database');

    const [rows] = await sequelize.query(
      `SELECT id, usado_carne_leao FROM despesas WHERE id = ? LIMIT 1`,
      { replacements: [id] }
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Despesa não encontrada' });

    const novoValor = rows[0].usado_carne_leao ? 0 : 1;
    await sequelize.query(
      `UPDATE despesas SET usado_carne_leao = ? WHERE id = ?`,
      { replacements: [novoValor, id] }
    );

    res.json({ success: true, usado_carne_leao: Boolean(novoValor) });
  } catch (error) {
    console.error('Erro ao toggle carnê-leão:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar' });
  }
};
