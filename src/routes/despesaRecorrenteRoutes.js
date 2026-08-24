/**
 * Rotas de despesas recorrentes (despesas fixas)
 */
const express = require('express');
const router = express.Router();
const despesaRecorrenteController = require('../controllers/despesaRecorrenteController');
const { verificarToken } = require('../middleware/authMiddleware');
const { verificarPermissaoModulo } = require('../middleware/permissaoMiddleware');

router.use(verificarToken);
router.use(verificarPermissaoModulo('despesas'));

router.get('/', despesaRecorrenteController.listar);
router.post('/', despesaRecorrenteController.criar);
router.patch('/:id/cancelar', despesaRecorrenteController.cancelar);

module.exports = router;
