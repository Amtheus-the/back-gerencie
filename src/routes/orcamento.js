const express = require('express');
const router = express.Router();
const { Orcamento, Agendamento, Paciente, Faturamento } = require('../models');
const { verificarToken } = require('../middleware/authMiddleware');

router.use(verificarToken);

// Soma os valores negociados no orçamento (campo JSON { procedimentoId: valor })
function calcularValorTotal(orcamento) {
  const valores = orcamento.valores || {};
  return Object.values(valores).reduce((soma, v) => soma + (parseFloat(v) || 0), 0);
}

// Anexa valorTotal / valorPago / saldoAberto a um orçamento, somando os faturamentos vinculados
async function comSaldo(orcamento) {
  const json = orcamento.toJSON ? orcamento.toJSON() : orcamento;
  const valorTotal = calcularValorTotal(json);
  const faturamentos = await Faturamento.findAll({
    where: { orcamentoId: json.id },
    attributes: ['id', 'valor', 'data', 'formaPagamento', 'createdAt'],
    order: [['createdAt', 'ASC']],
  });
  const valorPago = faturamentos.reduce((soma, f) => soma + parseFloat(f.valor), 0);
  return {
    ...json,
    valorTotal,
    valorPago,
    saldoAberto: Math.max(0, Math.round((valorTotal - valorPago) * 100) / 100),
    pagamentos: faturamentos,
  };
}

// Criar orçamento
router.post('/', async (req, res) => {
  try {
    console.log('[ORCAMENTO] Dados recebidos:', req.body);
    const { agendamento_id, paciente_id, status, procedimentos, valores, observacoes } = req.body;
    // Buscar clinica_id do agendamento
    let clinica_id = null;
    if (agendamento_id) {
      const agendamento = await Agendamento.findByPk(agendamento_id);
      clinica_id = agendamento?.clinica_id || null;
    }
    if (!clinica_id) clinica_id = req.user.clinicaId || null;
    if (!clinica_id) {
      return res.status(400).json({ error: 'Não foi possível determinar a clínica do orçamento.' });
    }
    const orcamento = await Orcamento.create({
      agendamento_id,
      paciente_id,
      clinica_id,
      status,
      procedimentos,
      valores,
      observacoes
    });
    console.log('[ORCAMENTO] Inserido com sucesso:', orcamento?.toJSON ? orcamento.toJSON() : orcamento);
    res.status(201).json(orcamento);
  } catch (err) {
    console.error('[ORCAMENTO] Erro ao inserir:', err);
    res.status(500).json({ error: err.message });
  }
});

// Buscar orçamento por agendamento (com saldo já calculado)
router.get('/agendamento/:agendamento_id', async (req, res) => {
  try {
    const { agendamento_id } = req.params;
    const orcamento = await Orcamento.findOne({ where: { agendamento_id } });
    if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado' });
    res.json(await comSaldo(orcamento));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar orçamentos de um paciente (com saldo em aberto de cada um) — usado na ficha do paciente
router.get('/paciente/:paciente_id', async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const orcamentos = await Orcamento.findAll({
      where: { paciente_id, clinica_id: req.user.clinicaId },
      order: [['createdAt', 'DESC']],
    });
    const comSaldos = await Promise.all(orcamentos.map(comSaldo));
    res.json(comSaldos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar um orçamento específico por id (com saldo)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orcamento = await Orcamento.findByPk(id);
    if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado' });
    res.json(await comSaldo(orcamento));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excluir orçamento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orcamento = await Orcamento.findByPk(id);
    if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado' });
    await orcamento.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar status do orçamento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const orcamento = await Orcamento.findByPk(id);
    if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado' });
    orcamento.status = status;
    await orcamento.save();
    res.json(orcamento);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
