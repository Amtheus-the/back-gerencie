

/**
 * Rotas para gerenciamento de faturamento
 */
const express = require('express');
const router = express.Router();
const faturamentoController = require('../controllers/faturamentoController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(verificarToken);

/**
 * @route   GET /api/faturamento/parametros-municipio
 * @desc    Consulta parâmetros fiscais do município via Webmania®
 * @access  Private
 */
router.get('/parametros-municipio', faturamentoController.consultarParametrosMunicipio);
router.get('/paciente/:pacienteId/resumo', faturamentoController.resumoFinanceiroPaciente);

/**
 * @route   GET /api/faturamento
 * @desc    Lista todo o faturamento do usuário
 * @access  Private
 */
router.get('/', faturamentoController.listarFaturamento);

/**
 * @route   POST /api/faturamento
 * @desc    Registra um novo faturamento
 * @access  Private
 */
router.post('/', faturamentoController.criarFaturamento);

/**
 * @route   GET /api/faturamento/:id
 * @desc    Busca um faturamento específico
 * @access  Private
 */
router.get('/:id', faturamentoController.buscarFaturamento);

/**
 * @route   PUT /api/faturamento/:id
 * @desc    Atualiza um faturamento
 * @access  Private
 */
router.put('/:id', faturamentoController.atualizarFaturamento);

/**
 * @route   POST /api/faturamento/:id/emitir-nota
 * @desc    Emite Nota Fiscal via Webmania®
 * @access  Private
 */
router.post('/:id/emitir-nota', faturamentoController.emitirNotaFiscal);

/**
 * @route   POST /api/faturamento/:id/cancelar-nota
 * @desc    Cancela Nota Fiscal na Nuvem Fiscal
 * @access  Private
 */
router.post('/:id/cancelar-nota', faturamentoController.cancelarNotaFiscal);

/**
 * @route   GET /api/faturamento/:id/baixar-nota
 * @desc    Baixa PDF da Nota Fiscal via Nuvem Fiscal
 * @access  Private
 */
router.get('/:id/baixar-nota', faturamentoController.baixarNotaFiscal);

/**
 * @route   GET /api/faturamento/:id/recibo
 * @desc    Gera URL pré-assinada do S3 para o recibo do próprio faturamento
 * @access  Private
 */
router.get('/:id/recibo', faturamentoController.downloadReciboUsuario);

/**
 * @route   DELETE /api/faturamento/:id
 * @desc    Remove um faturamento
 * @access  Private
 */
router.delete('/:id', faturamentoController.deletarFaturamento);

module.exports = router;
