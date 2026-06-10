/**
 * Rotas para gerenciamento de despesas
 */

const express = require('express');
const router = express.Router();
const despesasController = require('../controllers/despesasController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(verificarToken);

/**
 * @route   GET /api/despesas
 * @desc    Lista todas as despesas do usuário
 * @access  Private
 */
router.get('/', despesasController.listarDespesas);

/**
 * @route   POST /api/despesas
 * @desc    Cria uma nova despesa
 * @access  Private
 */
router.post('/', despesasController.criarDespesa);

/**
 * @route   GET /api/despesas/:id
 * @desc    Busca uma despesa específica
 * @access  Private
 */
router.get('/:id', despesasController.buscarDespesa);

/**
 * @route   PUT /api/despesas/:id
 * @desc    Atualiza uma despesa
 * @access  Private
 */
router.put('/:id', despesasController.atualizarDespesa);

/**
 * @route   DELETE /api/despesas/:id
 * @desc    Remove uma despesa
 * @access  Private
 */
router.delete('/:id', despesasController.deletarDespesa);

module.exports = router;
