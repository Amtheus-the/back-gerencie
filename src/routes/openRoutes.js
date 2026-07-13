
const express = require('express');
const router = express.Router();



// Webhook para status da mensagem do WhatsApp (sem autenticação)
router.post('/webhook-whatsapp/status_da_mensagem', async (req, res) => {
  try {
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook para ao_enviar do WhatsApp (sem autenticação)
router.post('/webhook-whatsapp/ao_enviar', async (req, res) => {
  try {
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook para receber mensagens do WhatsApp (sem autenticação)
router.post('/webhook-whatsapp', async (req, res) => {
  try {
    console.log('🔔 [Webhook] Content-Type:', req.headers['content-type']);
    let body = req.body;
    // Se o body vier como undefined, tenta parsear manualmente
    if (!body || Object.keys(body).length === 0) {
      let rawBody = '';
      await new Promise(resolve => {
        req.on('data', chunk => { rawBody += chunk; });
        req.on('end', resolve);
      });
      console.log('🔔 [Webhook] Body recebido como texto:', rawBody);
      try {
        body = JSON.parse(rawBody);
        console.log('🔔 [Webhook] Body convertido para JSON:', body);
      } catch (e) {
        console.log('❌ [Webhook] Falha ao converter body para JSON:', e.message);
        return res.status(400).json({ error: 'Body inválido, não é JSON.' });
      }
    } else {
      console.log('🔔 [Webhook] Body bruto:', body);
    }
    console.log('🔔 [Webhook] Dados recebidos:', body);

    // Extrai telefone e resposta do usuário do objeto recebido

    // Extrai telefone e resposta do usuário do objeto recebido
    let phone = null;
    let message = null;
    let agendamento_id = null;

    // Tenta extrair telefone do campo chat.id ou sender.id
    if (body.chat && body.chat.id) {
      phone = body.chat.id;
    } else if (body.sender && body.sender.id) {
      phone = body.sender.id;
    }

    // Tenta extrair resposta do usuário do campo msgContent.templateButtonReplyMessage.selectedDisplayText
    if (body.msgContent && body.msgContent.templateButtonReplyMessage && body.msgContent.templateButtonReplyMessage.selectedDisplayText) {
      message = body.msgContent.templateButtonReplyMessage.selectedDisplayText;
    }

    // Tenta extrair agendamento_id do campo contextInfo, se existir (ajuste conforme sua integração)
    if (body.msgContent && body.msgContent.templateButtonReplyMessage && body.msgContent.templateButtonReplyMessage.contextInfo && body.msgContent.templateButtonReplyMessage.contextInfo.agendamento_id) {
      agendamento_id = body.msgContent.templateButtonReplyMessage.contextInfo.agendamento_id;
    }

    console.log('🔔 [Webhook] Dados extraídos:', { phone, message, agendamento_id });
    if ((!phone && !agendamento_id) || !message) {
      console.log('❌ [Webhook] Dados insuficientes.');
      return res.status(400).json({ error: 'Dados insuficientes.' });
    }

    const { Agendamento, Paciente } = require('../models');
    let agendamento = null;
    const mensagem = message.trim().toLowerCase();

    if (agendamento_id) {
      agendamento = await Agendamento.findByPk(agendamento_id);
      console.log('🔍 [Webhook] Busca por agendamento_id:', agendamento_id, 'Resultado:', agendamento ? agendamento.toJSON() : null);
    } else if (phone) {
      let telefoneLimpo = phone.replace(/\D/g, '');
      // Remove DDI '55' se presente no início
      if (telefoneLimpo.startsWith('55') && telefoneLimpo.length > 11) {
        telefoneLimpo = telefoneLimpo.substring(2);
      }
      const paciente = await Paciente.findOne({ where: { telefone: telefoneLimpo } });
      console.log('🔍 [Webhook] Busca por telefone normalizado:', telefoneLimpo, 'Paciente:', paciente ? paciente.toJSON() : null);
      if (!paciente) {
        console.log('❌ [Webhook] Paciente não encontrado.');
        return res.status(404).json({ error: 'Paciente não encontrado.' });
      }
      agendamento = await Agendamento.findOne({
        where: {
          paciente_id: paciente.id,
          status: ['agendado', 'aguardando']
        },
        order: [['createdAt', 'DESC']]
      });
      console.log('🔍 [Webhook] Busca por agendamento do paciente:', paciente.id, 'Resultado:', agendamento ? agendamento.toJSON() : null);
    }
    if (!agendamento) {
      console.log('❌ [Webhook] Agendamento aguardando confirmação não encontrado.');
      return res.status(404).json({ error: 'Agendamento aguardando confirmação não encontrado.' });
    }

    // Se o status inicial for 'agendado', altere para 'aguardando' ao criar
    if (agendamento.status === 'agendado') {
      agendamento.status = 'aguardando';
      await agendamento.save();
      console.log('🟡 [Webhook] Status alterado para "aguardando"');
    }

    // Atualiza status conforme resposta
    let novoStatus = agendamento.status;
    if (mensagem === 'sim') {
      novoStatus = 'confirmado';
    } else if (mensagem === 'não' || mensagem === 'nao') {
      novoStatus = 'cancelado';
    }
    if (novoStatus !== agendamento.status) {
      agendamento.status = novoStatus;
      await agendamento.save();
      console.log(`✅ [Webhook] Status alterado para "${novoStatus}"`);
    } else {
      console.log(`ℹ️ [Webhook] Status mantido: "${agendamento.status}"`);
    }

    res.json({ success: true });
  } catch (err) {
    console.log('❌ [Webhook] Erro:', err);
    res.status(500).json({ error: err.message });
  }
});

// Rota aberta para teste global
router.get('/teste-aberto', (req, res) => {
  res.send('Rota aberta funcionando!');
});

// Rota aberta de ping
router.get('/ping', (req, res) => {
  res.send('Ping aberto funcionando!');
});

// ─── Assinatura de documentos (sem login) ───────────────────────────────────

// Buscar documento pelo token (paciente abre o link)
router.get('/assinar/:token', async (req, res) => {
  try {
    const { DocumentoPaciente, Termo, Paciente } = require('../models');
    const doc = await DocumentoPaciente.findOne({
      where: { token: req.params.token },
      include: [
        { model: Termo, as: 'termo' },
        { model: Paciente, as: 'paciente', attributes: ['nome', 'cpfCnpj', 'telefone'] },
      ],
    });
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado ou link inválido.' });
    res.json({
      id: doc.id,
      status: doc.status,
      titulo: doc.termo.titulo,
      tipo: doc.termo.tipo,
      conteudo: doc.termo.conteudo,
      pacienteNome: doc.paciente.nome,
      pacienteCpf: doc.paciente.cpfCnpj,
      assinadoEm: doc.assinadoEm,
      nomeAssinante: doc.nomeAssinante,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Paciente assina o documento
router.post('/assinar/:token', async (req, res) => {
  try {
    const { DocumentoPaciente } = require('../models');
    const { nomeAssinante, cpfAssinante, aceito } = req.body;

    if (!aceito) return res.status(400).json({ error: 'Você precisa aceitar os termos para assinar.' });
    if (!nomeAssinante?.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });

    const doc = await DocumentoPaciente.findOne({ where: { token: req.params.token } });
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
    if (doc.status === 'assinado') return res.status(400).json({ error: 'Documento já foi assinado.' });

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    await doc.update({
      status: 'assinado',
      nomeAssinante: nomeAssinante.trim(),
      cpfAssinante: cpfAssinante?.trim() || null,
      ipAssinante: ip,
      assinadoEm: new Date(),
    });

    res.json({ success: true, assinadoEm: doc.assinadoEm });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Webhook Autentique — atualiza status quando documento é finalizado
router.post('/webhook-autentique', async (req, res) => {
  try {
    const { DocumentoPaciente } = require('../models');
    const body = req.body;
    const event = body.event || body.type;
    const document = body.document || body.data?.document || body.data;
    console.log('[Autentique Webhook] event:', event, '| doc id:', document?.id);
    console.log('[Autentique Webhook] body completo:', JSON.stringify(body, null, 2));

    if ((event === 'document.finished' || event === 'signature_accepted') && document?.id) {
      const sigPaciente = document.signatures?.find(s => s.name && (s.signed?.created_at || s.signed?.at));
      if (sigPaciente) {
        await DocumentoPaciente.update(
          {
            status: 'assinado',
            nomeAssinante: sigPaciente.name,
            assinadoEm: sigPaciente.signed?.created_at ? new Date(sigPaciente.signed.created_at) : new Date(),
          },
          { where: { autentiqueId: document.id } }
        );
        console.log('[Autentique Webhook] ✅ Status atualizado para assinado | doc:', document.id);
      } else {
        console.log('[Autentique Webhook] ⚠️ Evento recebido sem assinatura confirmada do paciente, ignorando | doc:', document.id);
      }
    }

    res.json({ received: true });
  } catch (e) {
    console.error('[Autentique Webhook] Erro:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
