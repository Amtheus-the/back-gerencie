/**
 * Rotas do Dashboard
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(verificarToken);

// GET /api/dashboard/metricas?mes=10&ano=2025
router.get('/metricas', dashboardController.getMetricas);

// GET /api/dashboard/fluxo-mensal
router.get('/fluxo-mensal', dashboardController.getFluxoMensal);

// GET /api/dashboard/despesas-categoria?mes=10&ano=2025
router.get('/despesas-categoria', dashboardController.getDespesasPorCategoria);

// GET /api/dashboard/lucro-presumido?mes=10&ano=2025
router.get('/lucro-presumido', dashboardController.calcularLucroPresumido);

module.exports = router;
