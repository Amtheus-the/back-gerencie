const { Op } = require('sequelize');
const { Despesa, Faturamento } = require('../models');

// Buscar lançamentos do mês atual (entradas e saídas)
exports.getLancamentosMes = async (req, res) => {
  const { mes, ano } = req.query;
  try {
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 1);
    // Buscar despesas (saídas)
    const despesas = await Despesa.findAll({
      where: {
        data: {
          [Op.gte]: inicio,
          [Op.lt]: fim
        },
        user_id: req.user.id
      },
      order: [['data', 'DESC']]
    });
    // Buscar faturamentos (entradas)
    const faturamentos = await Faturamento.findAll({
      where: {
        data: {
          [Op.gte]: inicio,
          [Op.lt]: fim
        },
        user_id: req.user.id
      },
      order: [['data', 'DESC']]
    });
    // Unir lançamentos (entradas e saídas)
    const todosLancamentos = [
      ...faturamentos.map(fat => ({
        id: fat.id,
        descricao: fat.descricao,
        valor: parseFloat(fat.valor),
        data: fat.data,
        tipo: 'entrada',
        origem: 'Faturamento'
      })),
      ...despesas.map(desp => ({
        id: desp.id,
        descricao: desp.descricao,
        valor: -parseFloat(desp.valor),
        data: desp.data,
        tipo: 'saida',
        origem: 'Despesa'
      }))
    ];
    // Ordenar por data decrescente
    todosLancamentos.sort((a, b) => new Date(b.data) - new Date(a.data));
    res.json(todosLancamentos);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar lançamentos do mês.' });
  }
};
