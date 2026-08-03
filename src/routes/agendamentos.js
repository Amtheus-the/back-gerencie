const express = require('express');
const router = express.Router();
const { Agendamento, Procedimento, Paciente, User, BloqueioAgenda } = require('../models');
const { Op } = require('sequelize');
const { verificarToken } = require('../middleware/authMiddleware');
const googleCalendarService = require('../services/googleCalendarService');

router.use(verificarToken);

/** Retorna o bloqueio de agenda que conflita com o horário informado, se houver. */
async function encontrarBloqueioConflitante(userId, dataHoraInicio, duracaoMinutos) {
  if (!userId || !dataHoraInicio) return null;
  const inicio = new Date(dataHoraInicio);
  const fim = new Date(inicio.getTime() + (duracaoMinutos || 30) * 60000);
  return BloqueioAgenda.findOne({
    where: {
      userId,
      dataInicio: { [Op.lt]: fim },
      dataFim: { [Op.gt]: inicio },
    },
  });
}

/**
 * Sincroniza um agendamento com o Google Calendar do dentista dono dele (user_id),
 * se ele tiver a conta conectada. Nunca lança erro — falha de sync não pode
 * derrubar a resposta do CRUD principal do agendamento.
 */
async function sincronizarComGoogle(agendamento) {
  try {
    const usuario = await User.findByPk(agendamento.user_id);
    if (!usuario || !usuario.googleRefreshToken) return;

    const [paciente, procedimento] = await Promise.all([
      Paciente.findByPk(agendamento.paciente_id),
      Procedimento.findByPk(agendamento.procedimento_id),
    ]);

    const googleEventId = await googleCalendarService.sincronizarEvento(usuario, {
      dataHora: agendamento.data_hora,
      duracaoMinutos: agendamento.duracao_minutos,
      pacienteNome: paciente?.nome || 'Paciente',
      procedimentoNome: procedimento?.nome || '',
      observacoes: agendamento.observacoes,
    }, agendamento.google_event_id);

    if (googleEventId && googleEventId !== agendamento.google_event_id) {
      await agendamento.update({ google_event_id: googleEventId });
    }
  } catch (err) {
    console.error('[Google Calendar] Falha ao sincronizar agendamento', agendamento.id, ':', err.message);
  }
}

/** Exclui o evento correspondente no Google Calendar do dono do agendamento (best-effort). */
async function excluirDoGoogle(userId, googleEventId) {
  if (!googleEventId) return;
  try {
    const usuario = await User.findByPk(userId);
    if (!usuario || !usuario.googleRefreshToken) return;
    await googleCalendarService.excluirEvento(usuario, googleEventId);
  } catch (err) {
    console.error('[Google Calendar] Falha ao excluir evento:', err.message);
  }
}

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
    const conflito = await encontrarBloqueioConflitante(user_id, data_hora, duracao_minutos);
    if (conflito) {
      return res.status(409).json({
        error: `Esse horário está bloqueado na agenda${conflito.motivo ? ` (${conflito.motivo})` : ''}. Escolha outro horário.`
      });
    }

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
      const url = `https://api.w-api.app/v1/message/send-text?instanceId=${INSTANCE_ID}`;

      console.log('📱 [WhatsApp] InstanceId:', INSTANCE_ID);
      console.log('📱 [WhatsApp] Token presente:', TOKEN ? `${TOKEN.substring(0, 10)}...` : 'NÃO DEFINIDO');
      console.log('📱 [WhatsApp] Telefone formatado:', telefoneFormatado);
      console.log('📱 [WhatsApp] Mensagem:', mensagem);
      console.log('📱 [WhatsApp] URL:', url);

      try {
        const resp = await axios.post(url, {
          phone: telefoneFormatado,
          message: mensagem,
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

    // Sincroniza com o Google Calendar do dentista (assíncrono, não bloqueia a resposta)
    sincronizarComGoogle(novoAgendamento);
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
    const { data_hora, status, duracao_minutos, observacoes, lancamento_feito, paciente_id, procedimento_id, user_id } = req.body;
    const agendamento = await Agendamento.findOne({ where: { id, clinica_id: req.user.clinicaId } });
    if (!agendamento) return res.status(404).json({ message: 'Agendamento não encontrado' });

    // Só valida bloqueio se horário, duração ou dentista estão de fato mudando
    // (evita travar uma simples atualização de status, ex: marcar "compareceu")
    if (data_hora !== undefined || duracao_minutos !== undefined || user_id !== undefined) {
      const userIdFinal = user_id !== undefined ? user_id : agendamento.user_id;
      const dataHoraFinal = data_hora !== undefined ? data_hora : agendamento.data_hora;
      const duracaoFinal = duracao_minutos !== undefined ? duracao_minutos : agendamento.duracao_minutos;
      const conflito = await encontrarBloqueioConflitante(userIdFinal, dataHoraFinal, duracaoFinal);
      if (conflito) {
        return res.status(409).json({
          message: `Esse horário está bloqueado na agenda${conflito.motivo ? ` (${conflito.motivo})` : ''}. Escolha outro horário.`
        });
      }
    }

    if (data_hora !== undefined) agendamento.data_hora = data_hora;
    if (status !== undefined) agendamento.status = status;
    if (duracao_minutos !== undefined) agendamento.duracao_minutos = duracao_minutos;
    if (observacoes !== undefined) agendamento.observacoes = observacoes;
    if (lancamento_feito !== undefined) agendamento.lancamento_feito = lancamento_feito;
    if (paciente_id !== undefined) agendamento.paciente_id = paciente_id;
    if (procedimento_id !== undefined) agendamento.procedimento_id = procedimento_id;
    if (user_id !== undefined) agendamento.user_id = user_id;
    await agendamento.save();
    res.json(agendamento);

    // Sincroniza com o Google Calendar do dentista (assíncrono, não bloqueia a resposta)
    sincronizarComGoogle(agendamento);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const agendamento = await Agendamento.findByPk(id);
    if (!agendamento) {
      return res.status(404).json({ message: 'Agendamento não encontrado!' });
    }
    const { user_id: userId, google_event_id: googleEventId } = agendamento;
    await agendamento.destroy();
    res.status(200).json({ message: 'Agendamento apagado!' });

    // Remove o evento correspondente no Google Calendar (assíncrono, não bloqueia a resposta)
    excluirDoGoogle(userId, googleEventId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
