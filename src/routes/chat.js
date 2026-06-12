/**
 * Rotas do Chat (Aline - IA)
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(verificarToken);

// GET /api/chat/insights - Insight proativo da Aline baseado nos dados financeiros reais
router.get('/insights', chatController.getInsights);

// POST /api/chat/message - Envia mensagem para a Aline
router.post('/message', chatController.sendMessage);

// POST /api/chat/consultar-dedutibilidade - Consulta fiscal sobre dedutibilidade
router.post('/consultar-dedutibilidade', chatController.consultarDedutibilidade);

// POST /api/user/mark-not-first-access - Marca que não é mais primeiro acesso
router.post('/mark-not-first-access', chatController.markNotFirstAccess);

module.exports = router;
