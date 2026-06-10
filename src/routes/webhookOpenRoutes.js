const express = require('express');
const router = express.Router();



// Webhook para status da mensagem do WhatsApp (sem autenticação)
router.post('/status_da_mensagem', async (req, res) => {
  try {
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook para ao_enviar do WhatsApp (sem autenticação)
router.post('/ao_enviar', async (req, res) => {
  try {
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook para receber mensagens do WhatsApp (sem autenticação)
router.post('/', async (req, res) => {
  try {
    // ...lógica do webhook original...
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota de teste para validar deploy
router.get('/ping', (req, res) => {
  res.send('Webhook aberto funcionando!');
});

module.exports = router;
