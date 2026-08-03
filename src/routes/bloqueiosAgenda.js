/**
 * Rotas de Bloqueios de Agenda
 * Trava um dia inteiro ou um horário específico pra um dentista não ser agendado
 */

const express = require('express');
const router = express.Router();
const { BloqueioAgenda, User } = require('../models');
const { verificarToken } = require('../middleware/authMiddleware');

router.use(verificarToken);

// Listar bloqueios da clínica
router.get('/', async (req, res) => {
  try {
    const bloqueios = await BloqueioAgenda.findAll({
      where: { clinicaId: req.user.clinicaId },
      include: [{ model: User, as: 'dentista', attributes: ['id', 'nome', 'cor'] }],
      order: [['dataInicio', 'ASC']],
    });
    res.json(bloqueios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar bloqueio (dia todo ou horário específico)
router.post('/', async (req, res) => {
  try {
    const { user_id, data, diaTodo, horaInicio, horaFim, motivo } = req.body;
    if (!user_id || !data) {
      return res.status(400).json({ error: 'Dentista e data são obrigatórios' });
    }

    const ehDiaTodo = !!diaTodo;
    const dataInicio = ehDiaTodo ? `${data}T00:00:00` : `${data}T${horaInicio || '00:00'}:00`;
    const dataFim = ehDiaTodo ? `${data}T23:59:59` : `${data}T${horaFim || '23:59'}:00`;

    if (!ehDiaTodo && new Date(dataFim) <= new Date(dataInicio)) {
      return res.status(400).json({ error: 'O horário final precisa ser depois do inicial' });
    }

    const bloqueio = await BloqueioAgenda.create({
      clinicaId: req.user.clinicaId,
      userId: user_id,
      dataInicio,
      dataFim,
      diaTodo: ehDiaTodo,
      motivo: motivo || null,
    });
    const comDentista = await BloqueioAgenda.findByPk(bloqueio.id, {
      include: [{ model: User, as: 'dentista', attributes: ['id', 'nome', 'cor'] }],
    });
    res.status(201).json(comDentista);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remover bloqueio (desbloquear)
router.delete('/:id', async (req, res) => {
  try {
    const deletado = await BloqueioAgenda.destroy({ where: { id: req.params.id, clinicaId: req.user.clinicaId } });
    if (!deletado) return res.status(404).json({ error: 'Bloqueio não encontrado' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
