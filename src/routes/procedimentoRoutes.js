/**
 * Rotas de Procedimentos
 */

const express = require('express');
const router = express.Router();
const procedimentoController = require('../controllers/procedimentoController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(verificarToken);

// Buscar procedimentos (autocomplete)
router.get('/buscar', procedimentoController.buscar);

// CRUD básico
router.get('/', procedimentoController.listar);
router.get('/:id', procedimentoController.buscarPorId);
router.post('/', procedimentoController.criar);
router.put('/:id', procedimentoController.atualizar);
router.delete('/:id', procedimentoController.deletar);

module.exports = router;
