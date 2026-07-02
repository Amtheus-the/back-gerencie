/**
 * Rotas de Pacientes
 */

const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/pacienteController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(verificarToken);

// Buscar pacientes (autocomplete)
router.get('/buscar', pacienteController.buscar);


// Histórico de procedimentos do paciente
router.get('/:id/historico', pacienteController.historicoProcedimentos);

// Odontograma
router.get('/:id/odontograma', pacienteController.buscarOdontograma);
router.patch('/:id/odontograma', pacienteController.salvarOdontograma);

// CRUD básico
router.get('/', pacienteController.listar);
router.get('/:id', pacienteController.buscarPorId);
router.post('/', pacienteController.criar);
router.put('/:id', pacienteController.atualizar);
router.delete('/:id', pacienteController.deletar);

module.exports = router;
