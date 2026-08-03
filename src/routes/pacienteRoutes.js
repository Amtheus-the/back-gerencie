/**
 * Rotas de Pacientes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const pacienteController = require('../controllers/pacienteController');
const { verificarToken } = require('../middleware/authMiddleware');
const { s3, S3_BUCKET } = require('../config/s3');

// Upload de arquivos do paciente (fotos, raio-x, contratos, etc) — salva no S3
const sanitizarSegmento = (texto) =>
  (texto || 'Geral').toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 100) || 'Geral';

const uploadArquivoPaciente = multer({
  storage: multerS3({
    s3,
    bucket: S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const pacienteId = req.params.id || 'unknown';
      const pasta = sanitizarSegmento(req.query.pasta);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `pacientes/${pacienteId}/${pasta}/${uniqueSuffix}${ext}`);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|gif|webp|heic|pdf|doc|docx|xls|xlsx/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido'));
  }
});

// Todas as rotas requerem autenticação
router.use(verificarToken);

// Buscar pacientes (autocomplete)
router.get('/buscar', pacienteController.buscar);


// Histórico de procedimentos do paciente
router.get('/:id/historico', pacienteController.historicoProcedimentos);

// Odontograma
router.get('/:id/odontograma', pacienteController.buscarOdontograma);
router.patch('/:id/odontograma', pacienteController.salvarOdontograma);

// Histórico de anotações/observações (uma por consulta)
router.get('/:id/anotacoes', pacienteController.listarAnotacoes);
router.post('/:id/anotacoes', pacienteController.criarAnotacao);

// Pastas e arquivos do paciente (fotos, raio-x, contratos, etc)
router.get('/:id/arquivos', pacienteController.listarArquivos);
router.post('/:id/pastas', pacienteController.criarPasta);
router.post('/:id/arquivos', uploadArquivoPaciente.single('arquivo'), pacienteController.uploadArquivo);
router.get('/:id/arquivos/:arquivoId/download', pacienteController.downloadArquivo);
router.delete('/:id/arquivos/:arquivoId', pacienteController.deletarArquivo);
router.delete('/:id/pastas/:pasta', pacienteController.deletarPasta);

// CRUD básico
router.get('/', pacienteController.listar);
router.get('/:id', pacienteController.buscarPorId);
router.post('/', pacienteController.criar);
router.put('/:id', pacienteController.atualizar);
router.delete('/:id', pacienteController.deletar);

module.exports = router;
