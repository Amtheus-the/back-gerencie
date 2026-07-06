const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/authMiddleware');
const c = require('../controllers/termoController');

router.use(verificarToken);

router.get('/', c.listar);
router.post('/', c.criar);
router.put('/:id', c.atualizar);
router.delete('/:id', c.deletar);
router.post('/:id/clonar', c.clonar);
router.post('/enviar', c.enviar);
router.get('/documentos', c.listarDocumentos);
router.get('/documentos/:id/sincronizar', c.sincronizarDocumento);

module.exports = router;
