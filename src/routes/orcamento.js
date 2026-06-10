const express = require('express');
const router = express.Router();
const { Orcamento, Agendamento, Paciente } = require('../models');

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
    // Se não achar pelo agendamento, pode tentar pelo usuário (req.user.clinicaId) se usar autenticação
    // Se clinica_id ainda for null, retorna erro
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

// Buscar orçamento por agendamento
router.get('/agendamento/:agendamento_id', async (req, res) => {
  try {
    const { agendamento_id } = req.params;
    const orcamento = await Orcamento.findOne({ where: { agendamento_id } });
    if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado' });
    res.json(orcamento);
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
