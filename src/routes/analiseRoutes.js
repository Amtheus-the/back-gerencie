/**
 * Rotas para análise tributária com IA
 */

const express = require('express');
const router = express.Router();
const analiseController = require('../controllers/analiseController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(verificarToken);

/**
 * @route   POST /api/analise/tributaria
 * @desc    Analisa dados e recomenda estrutura jurídica
 * @access  Private
 */
router.post('/tributaria', analiseController.analisarEstrutura);

/**
 * @route   GET /api/analise/historico
 * @desc    Retorna histórico de análises realizadas
 * @access  Private
 */
router.get('/historico', analiseController.historicoAnalises);

/**
 * @route   GET /api/analise/relatorio
 * @desc    Gera relatório financeiro completo
 * @access  Private
 */
router.get('/relatorio', analiseController.gerarRelatorio);

module.exports = router;
