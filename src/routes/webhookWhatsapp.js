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
  console.log('[WHATSAPP][RECEBIDO] Body:', req.body);
  try {
    const { body } = req;
    // Exemplo de payload esperado:
    // {
    //   "phone": "5511999999999",
    //   "message": "sim" ou "não" ou "nao"
    // }
    const phone = body.phone?.replace(/\D/g, '');
    const mensagem = body.message?.trim().toLowerCase();
    if (!phone || !mensagem) {
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

    // Atualiza status conforme resposta
    let novoStatus = agendamento.status;
    if (mensagem === 'sim') {
      novoStatus = 'confirmado';
      console.log(`[WHATSAPP] Mensagem recebida do paciente: SIM`);
    }
    else if (mensagem === 'não' || mensagem === 'nao') {
      novoStatus = 'cancelado';
      console.log(`[WHATSAPP] Mensagem recebida do paciente: NÃO`);
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
