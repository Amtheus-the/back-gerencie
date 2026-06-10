/**
 * Rotas de Plano de Contas
 */

const express = require('express');
const router = express.Router();
const planoContasController = require('../controllers/planoContasController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(verificarToken);

// Buscar contas (autocomplete)
router.get('/buscar', planoContasController.buscar);

// CRUD básico
router.get('/', planoContasController.listar);
router.get('/:id', planoContasController.buscarPorId);
router.post('/', planoContasController.criar);
router.put('/:id', planoContasController.atualizar);
router.delete('/:id', planoContasController.deletar);

module.exports = router;
