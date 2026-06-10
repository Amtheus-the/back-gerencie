/**
 * Rotas do Dashboard da Clínica
 */

const express = require('express');
const router = express.Router();
const clinicaDashboardController = require('../controllers/clinicaDashboardController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(verificarToken);

// GET /api/clinica/metricas?mes=1&ano=2026
router.get('/metricas', clinicaDashboardController.getMetricasClinica);

module.exports = router;
