/**
 * Rotas para Dashboard Administrativo
 * Endpoints protegidos para administradores
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verificarToken } = require('../middleware/authMiddleware');
const { verificarAdmin } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação e permissão de admin
router.use(verificarToken);
router.use(verificarAdmin);

// Estatísticas gerais
router.get('/estatisticas', adminController.getEstatisticasGerais);

// Usuários
router.get('/usuarios', adminController.listarUsuarios);
router.get('/usuarios/:userId', adminController.getUsuarioDetalhes);
router.patch('/usuarios/:userId/toggle-status', adminController.toggleStatusUsuario);

// Atividades
router.get('/atividades', adminController.getAtividadesRecentes);

// Gráficos
router.get('/grafico-crescimento', adminController.getGraficoCrescimento);
router.get('/distribuicao-tipos', adminController.getDistribuicaoTipos);

module.exports = router;
