/**
 * Controller de despesas recorrentes (despesas fixas que se repetem
 * automaticamente todo mês)
 */
const { DespesaRecorrente } = require('../models');
const { gerarOcorrenciasPendentes } = require('../services/despesaRecorrenteService');

/**
 * Lista as recorrências da clínica
 */
exports.listar = async (req, res) => {
  try {
    const recorrencias = await DespesaRecorrente.findAll({
      where: { clinicaId: req.user.clinicaId },
      order: [['ativa', 'DESC'], ['createdAt', 'DESC']],
    });
    res.json({ success: true, data: recorrencias });
  } catch (error) {
    console.error('Erro ao listar despesas recorrentes:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar despesas recorrentes' });
  }
};

/**
 * Cria uma nova recorrência e já gera as ocorrências pendentes até o mês atual
 */
exports.criar = async (req, res) => {
  try {
    const userId = req.user.id;
    const clinicaId = req.user.clinicaId;
    const { descricao, valor, categoria, planoContaId, diaVencimento, dataInicio, duracaoMeses, observacoes } = req.body;

    if (!descricao || !valor || !categoria || !diaVencimento || !dataInicio) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: descricao, valor, categoria, diaVencimento, dataInicio',
      });
    }

    const recorrencia = await DespesaRecorrente.create({
      userId,
      clinicaId,
      descricao,
      valor,
      categoria,
      planoContaId: planoContaId || null,
      diaVencimento,
      dataInicio,
      duracaoMeses: duracaoMeses || null,
      observacoes,
    });

    const despesasGeradas = await gerarOcorrenciasPendentes(recorrencia);

    res.status(201).json({
      success: true,
      message: 'Despesa fixa cadastrada com sucesso',
      data: recorrencia,
      despesasGeradas,
    });
  } catch (error) {
    console.error('Erro ao criar despesa recorrente:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar despesa recorrente' });
  }
};

/**
 * Cancela uma recorrência — para de gerar despesas novas, mas as já
 * geradas continuam intactas.
 */
exports.cancelar = async (req, res) => {
  try {
    const { id } = req.params;
    const recorrencia = await DespesaRecorrente.findOne({
      where: { id, clinicaId: req.user.clinicaId },
    });
    if (!recorrencia) {
      return res.status(404).json({ success: false, message: 'Despesa recorrente não encontrada' });
    }
    await recorrencia.update({ ativa: false, canceladaEm: new Date() });
    res.json({ success: true, message: 'Recorrência cancelada — despesas já lançadas continuam normalmente' });
  } catch (error) {
    console.error('Erro ao cancelar despesa recorrente:', error);
    res.status(500).json({ success: false, message: 'Erro ao cancelar despesa recorrente' });
  }
};
