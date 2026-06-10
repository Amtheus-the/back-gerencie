/**
 * Rotas de Anamnese
 * CRUD para modelos de anamnese
 */

const express = require('express');
const router = express.Router();
const anamneseController = require('../controllers/anamneseController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas as rotas exigem autenticação
router.use(verificarToken);

// Listar modelos de anamnese da clínica do usuário
router.get('/', anamneseController.listarAnamneses);

// Criar novo modelo de anamnese
router.post('/', anamneseController.criarAnamnese);

// Atualizar modelo de anamnese
router.put('/:id', anamneseController.atualizarAnamnese);

// Deletar modelo de anamnese
router.delete('/:id', anamneseController.deletarAnamnese);

module.exports = router;
