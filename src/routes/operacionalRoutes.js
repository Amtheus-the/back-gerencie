/**
 * Rotas para Painel Operacional Administrativo
 * Endpoints para gerenciamento operacional de usuários e documentos
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');
const operacionalController = require('../controllers/operacionalController');
const carneLeaoController   = require('../controllers/carneLeaoController');
const reciboController      = require('../controllers/reciboController');
const { verificarToken, verificarAdmin } = require('../middleware/authMiddleware');

// ─── AWS S3 ───────────────────────────────────────────────────────────────────
const { s3, S3_BUCKET } = require('../config/s3');

// Configurar diretório de uploads — documentos (mantém local)
const uploadDir = path.join(__dirname, '../../uploads/documentos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do Multer para upload de arquivos (documentos — local)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) return cb(null, true);
  cb(new Error('Tipo de arquivo não permitido. Apenas JPEG, PNG, PDF, DOC, DOCX, XLS e XLSX são aceitos.'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Multer para recibos PF — salva no S3
const uploadRecibo = multer({
  storage: multerS3({
    s3,
    bucket: S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const faturamentoId = req.params.id || 'unknown';
      cb(null, `recibos/${faturamentoId}/recibo-${uniqueSuffix}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|jpg|jpeg|png/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Apenas PDF, JPG ou PNG são aceitos'));
  }
});

// Todas as rotas requerem autenticação e permissão de admin
router.use(verificarToken);
router.use(verificarAdmin);

// Listar usuários para painel operacional
router.get('/usuarios', operacionalController.listarUsuariosOperacional);

// Obter perfil completo de um usuário
router.get('/usuarios/:userId/perfil', operacionalController.getPerfilCompleto);

// Upload de documento para um usuário
router.post('/usuarios/:userId/documentos', upload.single('arquivo'), operacionalController.uploadDocumento);

// Listar documentos de um usuário
router.get('/usuarios/:userId/documentos', operacionalController.listarDocumentosUsuario);

// Download de documento
router.get('/documentos/:documentoId/download', operacionalController.downloadDocumento);

// Deletar documento
router.delete('/documentos/:documentoId', operacionalController.deletarDocumento);

// ====================================
// ROTAS PARA CLÍNICAS
// ====================================

// Listar clínicas para painel operacional
router.get('/clinicas', operacionalController.listarClinicasOperacional);

// Obter perfil completo de uma clínica
router.get('/clinicas/:clinicaId/perfil', operacionalController.getPerfilCompletoClinica);

// ====================================
// ROTAS DE CARNÊ LEÃO / RECIBOS PF
// ====================================

// Listar lançamentos PF da clínica (com info do recibo por lançamento)
router.get('/clinicas/:clinicaId/carne-leao', reciboController.listarPF);

// Upload de recibo para um lançamento específico
router.post('/faturamentos/:id/recibo', uploadRecibo.single('recibo'), reciboController.uploadRecibo);

// Download do recibo de um lançamento
router.get('/faturamentos/:id/recibo', reciboController.downloadRecibo);

// Remover recibo de um lançamento
router.delete('/faturamentos/:id/recibo', reciboController.removerRecibo);

// Alterar tipoPessoa de um faturamento (PF ↔ PJ)
router.patch('/faturamentos/:id/tipo', operacionalController.alterarTipoPessoa);

// Emitir nota fiscal de um faturamento PJ (admin)
router.post('/faturamentos/:id/emitir-nota', operacionalController.emitirNotaFiscalAdmin);

// Registrar emissão manual de NF (admin fez manualmente no portal da prefeitura)
const uploadNotaManual = multer({
  storage: multerS3({
    s3,
    bucket: S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `notas-fiscais/${req.params.id}/nf-manual-${uniqueSuffix}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|jpg|jpeg|png/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Apenas PDF, JPG ou PNG são aceitos'));
  }
});
router.post('/faturamentos/:id/nota-manual', uploadNotaManual.single('nota'), operacionalController.registrarNotaManual);

// Visualizar/baixar a nota fiscal anexada manualmente
router.get('/faturamentos/:id/nota-manual', operacionalController.visualizarNotaManual);

// Cancelar nota fiscal junto à prefeitura (admin)
router.delete('/faturamentos/:id/nota', operacionalController.cancelarNotaFiscalAdmin);

module.exports = router;
