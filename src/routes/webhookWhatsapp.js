// ...existing code...
const express = require('express');
const router = express.Router();
// Rota de teste para validar deploy
router.get('/ping', (req, res) => {
  res.send('Webhook atualizado e rodando!');
});
// Rota de teste para validar deploy
router.get('/ping', (req, res) => {
  res.send('Webhook atualizado e rodando!');
});
const { Agendamento, Paciente } = require('../models');
// const { verificarToken } = require('../middleware/authMiddleware');
// Webhook para status da mensagem do WhatsApp (sem autenticação)
router.post('/status_da_mensagem', async (req, res) => {
  try {
    // Aqui você pode processar o status da mensagem se necessário
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Erro no webhook WhatsApp status_da_mensagem:', err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook para ao_enviar do WhatsApp (sem autenticação)
router.post('/ao_enviar', async (req, res) => {
  try {
    // Aqui você pode processar o evento ao enviar se necessário
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Erro no webhook WhatsApp ao_enviar:', err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook para receber mensagens do WhatsApp (sem autenticação)
router.post('/', async (req, res) => {
  console.log('[WHATSAPP][RECEBIDO] Body:', JSON.stringify(req.body, null, 2));
  try {
    const { body } = req;

    // Ignora eventos que não são de mensagem recebida do paciente (ex: webhookDelivery, fromMe: true)
    if (body.fromMe === true) {
      return res.json({ success: true, ignorado: 'mensagem enviada por nós mesmos' });
    }

    // Telefone: tenta o formato antigo (flat) e o formato real da W-API (sender/chat)
    const phoneRaw = body.phone || body.sender?.id || body.chat?.id || '';
    const phone = phoneRaw.replace(/\D/g, '');

    // Resposta de clique em botão (formato ainda não confirmado — tenta os campos mais prováveis)
    const buttonId =
      body.msgContent?.buttonsResponseMessage?.selectedButtonId ||
      body.msgContent?.templateButtonReplyMessage?.selectedId ||
      null;
    const buttonText =
      body.msgContent?.buttonsResponseMessage?.selectedDisplayText ||
      body.msgContent?.templateButtonReplyMessage?.selectedDisplayText ||
      null;

    // Texto normal digitado (compatibilidade com o formato antigo + formato real da W-API)
    const textoLivre =
      body.message ||
      body.msgContent?.conversation ||
      body.msgContent?.extendedTextMessage?.text ||
      null;

    const mensagem = (buttonText || textoLivre)?.trim().toLowerCase();

    if (!phone || (!mensagem && !buttonId)) {
      return res.status(400).json({ error: 'Dados insuficientes.' });
    }

    // Busca paciente pelo telefone
    const paciente = await Paciente.findOne({ where: { telefone: phone } });
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente não encontrado.' });
    }

    // Busca agendamento mais recente desse paciente
    const agendamento = await Agendamento.findOne({
      where: { paciente_id: paciente.id },
      order: [['createdAt', 'DESC']]
    });
    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    // Atualiza status conforme resposta (clique no botão tem prioridade sobre texto digitado)
    let novoStatus = agendamento.status;
    if (buttonId === 'confirmar' || mensagem === 'sim') {
      novoStatus = 'confirmado';
      console.log(`[WHATSAPP] Resposta do paciente: SIM (buttonId=${buttonId})`);
    }
    else if (buttonId === 'cancelar' || mensagem === 'não' || mensagem === 'nao') {
      novoStatus = 'cancelado';
      console.log(`[WHATSAPP] Resposta do paciente: NÃO (buttonId=${buttonId})`);
    }
    else if (agendamento.status !== 'confirmado' && agendamento.status !== 'cancelado') {
      novoStatus = 'aguardando';
      console.log(`[WHATSAPP] Mensagem recebida do paciente: ${mensagem}`);
    }
    if (novoStatus !== agendamento.status) {
      agendamento.status = novoStatus;
      await agendamento.save();
      console.log(`✅ Status do agendamento atualizado para: ${novoStatus}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Erro no webhook WhatsApp:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
