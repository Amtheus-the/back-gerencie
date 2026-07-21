const express = require('express');
const router = express.Router();
const documentoController = require('../controllers/documentoController');
const { verificarToken } = require('../middleware/authMiddleware');

router.use(verificarToken);

router.post('/pdf', documentoController.gerarPdfDocumento);

module.exports = router;
