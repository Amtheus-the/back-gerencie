const express = require('express');
const router = express.Router();
const { Agendamento, Procedimento, Paciente, User } = require('../models');
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
        },
        {
          model: Paciente,
          as: 'paciente',
          attributes: ['id', 'nome']
        },
        {
          model: User,
          as: 'usuario',
          attributes: ['id', 'nome', 'cor']
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
    console.log('📱 [WhatsApp] Buscando paciente:', paciente_id);
    const paciente = await Paciente.findByPk(paciente_id);
    console.log('📱 [WhatsApp] Paciente encontrado:', paciente ? paciente.nome : 'NÃO ENCONTRADO');
    console.log('📱 [WhatsApp] Telefone raw:', paciente?.telefone);

    if (paciente && paciente.telefone) {
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

      const telefoneFormatado = `55${paciente.telefone.replace(/\D/g, '')}`;
      const url = `https://api.w-api.app/v1/message/send-button-list?instanceId=${INSTANCE_ID}`;

      console.log('📱 [WhatsApp] InstanceId:', INSTANCE_ID);
      console.log('📱 [WhatsApp] Token presente:', TOKEN ? `${TOKEN.substring(0, 10)}...` : 'NÃO DEFINIDO');
      console.log('📱 [WhatsApp] Telefone formatado:', telefoneFormatado);
      console.log('📱 [WhatsApp] Mensagem:', mensagem);
      console.log('📱 [WhatsApp] URL:', url);

      try {
        const resp = await axios.post(url, {
          phone: telefoneFormatado,
          message: mensagem,
          buttons: [
            { buttonId: 'confirmar', label: 'Sim' },
            { buttonId: 'cancelar', label: 'Não' }
          ],
          delayMessage: 2
        }, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${TOKEN}`
          }
        });
        console.log('✅ [WhatsApp] Status HTTP:', resp.status);
        console.log('✅ [WhatsApp] Resposta completa:', JSON.stringify(resp.data, null, 2));
      } catch (err) {
        console.error('❌ [WhatsApp] Erro HTTP status:', err.response?.status);
        console.error('❌ [WhatsApp] Erro response data:', JSON.stringify(err.response?.data, null, 2));
        console.error('❌ [WhatsApp] Erro message:', err.message);
      }
    } else {
      console.warn('⚠️ [WhatsApp] Paciente sem telefone — id:', paciente_id, '| telefone:', paciente?.telefone);
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
    const { data_hora, status, duracao_minutos, observacoes, lancamento_feito } = req.body;
    const agendamento = await Agendamento.findOne({ where: { id, clinica_id: req.user.clinicaId } });
    if (!agendamento) return res.status(404).json({ message: 'Agendamento não encontrado' });
    if (data_hora !== undefined) agendamento.data_hora = data_hora;
    if (status !== undefined) agendamento.status = status;
    if (duracao_minutos !== undefined) agendamento.duracao_minutos = duracao_minutos;
    if (observacoes !== undefined) agendamento.observacoes = observacoes;
    if (lancamento_feito !== undefined) agendamento.lancamento_feito = lancamento_feito;
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
