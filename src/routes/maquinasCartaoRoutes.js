/**
 * Rotas de Máquinas de Cartão
 */

const express = require('express');
const router = express.Router();
const maquinasCartaoController = require('../controllers/maquinasCartaoController');
const { verificarToken } = require('../middleware/authMiddleware');

router.use(verificarToken);

router.get('/', maquinasCartaoController.listar);
router.post('/', maquinasCartaoController.criar);
router.put('/:id', maquinasCartaoController.atualizar);
router.delete('/:id', maquinasCartaoController.deletar);
router.put('/:id/taxas', maquinasCartaoController.salvarTaxas);

module.exports = router;
