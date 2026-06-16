/**
 * Rotas para gerenciamento de despesas
 */

const express = require('express');
const path = require('path');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const despesasController = require('../controllers/despesasController');
const { verificarToken } = require('../middleware/authMiddleware');
const { s3, S3_BUCKET } = require('../config/s3');

// Multer-S3 para comprovantes de despesas
const uploadComprovante = multer({
  storage: multerS3({
    s3,
    bucket: S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `comprovantes/${req.params.id}/comprovante-${uniqueSuffix}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/pdf|jpg|jpeg|png/.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Apenas PDF, JPG ou PNG são aceitos'));
  }
});

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
 * @route   PATCH /api/despesas/:id/carne-leao
 * @desc    Marca/desmarca despesa como usada no Carnê-Leão
 * @access  Private
 */
router.patch('/:id/carne-leao', despesasController.toggleCarneLeao);

router.post('/:id/comprovante', uploadComprovante.single('comprovante'), despesasController.uploadComprovante);
router.delete('/:id/comprovante', despesasController.removerComprovante);

/**
 * @route   DELETE /api/despesas/:id
 * @desc    Remove uma despesa
 * @access  Private
 */
router.delete('/:id', despesasController.deletarDespesa);

module.exports = router;
