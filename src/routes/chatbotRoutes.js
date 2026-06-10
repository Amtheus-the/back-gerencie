const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

// Salvar mensagem do chatbot
router.post('/message', chatbotController.saveChatMessage);

// Buscar mensagens do usuário
router.get('/messages/:user_id', chatbotController.getUserChatMessages);

// Verificar se usuário está bloqueado
router.get('/blocked/:user_id', chatbotController.isUserBlocked);

module.exports = router;
