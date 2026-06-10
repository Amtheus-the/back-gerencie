/**
 * Rotas de Clínicas
 * Endpoints para gerenciamento de clínicas
 */

const express = require('express');
const router = express.Router();
const clinicaController = require('../controllers/clinicaController');
const { verificarToken, verificarAdmin } = require('../middleware/authMiddleware');


// Todas as rotas requerem autenticação
router.use(verificarToken);


/**
 * @route   GET /api/clinicas
 * @desc    Listar todas as clínicas
 * @access  Admin
 */
router.get('/', verificarAdmin, clinicaController.listarClinicas);

/**
 * @route   GET /api/clinicas/:id
 * @desc    Buscar clínica por ID
 * @access  Usuário autenticado
 */
router.get('/:id', clinicaController.buscarClinica);

/**
 * @route   POST /api/clinicas
 * @desc    Criar nova clínica
 * @access  Admin
 */
router.post('/', clinicaController.criarClinica);

/**
 * @route   PUT /api/clinicas/:id
 * @desc    Atualizar clínica
 * @access  Admin
 */
router.put('/:id', clinicaController.atualizarClinica);

/**
 * @route   PATCH /api/clinicas/:id/desativar
 * @desc    Desativar clínica
 * @access  Admin
 */
router.patch('/:id/desativar', clinicaController.desativarClinica);

/**
 * @route   PATCH /api/clinicas/:id/reativar
 * @desc    Reativar clínica
 * @access  Admin
 */
router.patch('/:id/reativar', clinicaController.reativarClinica);

/**
 * @route   GET /api/clinicas/:id/usuarios
 * @desc    Buscar usuários de uma clínica
 * @access  Admin
 */
router.get('/:id/usuarios', clinicaController.buscarUsuariosClinica);

/**
 * @route   GET /api/clinicas/:id/relatorio
 * @desc    Relatório financeiro da clínica
 * @access  Admin
 */
router.get('/:id/relatorio', clinicaController.relatorioFinanceiro);

module.exports = router;
