const express = require('express');
const router = express.Router();
const { Agendamento, Procedimento } = require('../models');
const { verificarToken } = require('../middleware/authMiddleware');

router.use(verificarToken);

// Listar agendamentos da clínica
router.get('/', async (req, res) => {
  console.log('[AGENDAMENTOS] GET /api/agendamentos chamado');
  try {
    const where = req.user.clinicaId ? { clinica_id: req.user.clinicaId } : {};
    const agendamentos = await Agendamento.findAll({
      where,
      include: [
        {
          model: Procedimento,
          as: 'procedimento',
          attributes: ['id', 'nome', 'valorPadrao']
        }
      ]
    });
    res.json(agendamentos);
  } catch (err) {
    console.error('[AGENDAMENTOS] Erro:', err);
    res.status(500).json({ error: err.message });
  }
});

// Criar agendamento
router.post('/', async (req, res) => {
  const {
    clinica_id,
    user_id,
    paciente_id,
    procedimento_id,
    data_hora,
    duracao_minutos,
    status,
    observacoes
  } = req.body;
  console.log('🔔 [Agendamento] Dados recebidos:', req.body);
  try {
    const novoAgendamento = await Agendamento.create({
      clinica_id,
      user_id,
      paciente_id,
      procedimento_id,
      data_hora,
      duracao_minutos,
      status,
      observacoes
    });
    console.log('✅ [Agendamento] Inserido com sucesso:', novoAgendamento.toJSON());

    // Tornar paciente ativo automaticamente ao agendar
    const { Paciente } = require('../models');
    await Paciente.update({ ativo: true }, { where: { id: paciente_id } });

    // Buscar telefone do paciente
    const paciente = await Paciente.findByPk(paciente_id);
    if (paciente && paciente.telefone) {
      // Formata data/hora para padrão brasileiro
      function formatarDataHoraBR(isoString) {
        const data = new Date(isoString);
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const hora = String(data.getHours()).padStart(2, '0');
        const min = String(data.getMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${ano} ${hora}:${min}`;
      }
      const dataFormatada = formatarDataHoraBR(data_hora);
      const mensagem = `Olá ${paciente.nome}, sua consulta está agendada para ${dataFormatada}. Você confirma presença?`;
      const axios = require('axios');
      const INSTANCE_ID = process.env.WAPI_INSTANCE_ID;
      const TOKEN = process.env.WAPI_TOKEN;
      const url = `https://api.w-api.app/v1/message/send-button-actions?instanceId=${INSTANCE_ID}`;
      try {
        await axios.post(url, {
          phone: paciente.telefone.replace(/\D/g, ''), // só números
          message: mensagem,
          buttonActions: [
            { type: "REPLAY", buttonText: "Sim" },
            { type: "REPLAY", buttonText: "Não" }
          ],
          delayMessage: 2
        }, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${TOKEN}`
          }
        });
        console.log('✅ Mensagem interativa enviada para paciente:', paciente.telefone);
      } catch (err) {
        console.error('❌ Erro ao enviar mensagem WhatsApp:', err.response?.data || err.message);
      }
    } else {
      console.warn('⚠️ Paciente sem telefone cadastrado, não foi possível enviar WhatsApp.');
    }

    res.status(201).json(novoAgendamento);
  } catch (err) {
    console.error('❌ [Agendamento] Erro ao inserir:', err);
    res.status(500).json({ error: err.message });
  }
});

// Deletar agendamento
// Atualizar agendamento (drag-and-drop, status, etc.)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data_hora, status, duracao_minutos, observacoes } = req.body;
    const agendamento = await Agendamento.findOne({ where: { id, clinica_id: req.user.clinicaId } });
    if (!agendamento) return res.status(404).json({ message: 'Agendamento não encontrado' });
    if (data_hora !== undefined) agendamento.dataHora = data_hora;
    if (status !== undefined) agendamento.status = status;
    if (duracao_minutos !== undefined) agendamento.duracaoMinutos = duracao_minutos;
    if (observacoes !== undefined) agendamento.observacoes = observacoes;
    await agendamento.save();
    res.json(agendamento);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Agendamento.destroy({ where: { id } });
    if (deleted) {
      return res.status(200).json({ message: 'Agendamento apagado!' });
    }
    return res.status(404).json({ message: 'Agendamento não encontrado!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
