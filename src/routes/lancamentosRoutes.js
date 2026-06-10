/**
 * Rotas de Lançamentos
 */

const express = require('express');
const router = express.Router();
const lancamentosController = require('../controllers/lancamentosController');
const { verificarToken } = require('../middleware/authMiddleware');


// Todas as rotas requerem autenticação
router.use(verificarToken);

// GET /api/lancamentos-mes?mes=10&ano=2025
router.get('/lancamentos-mes', (req, res, next) => {
	return lancamentosController.getLancamentosMes(req, res, next);
});

module.exports = router;
