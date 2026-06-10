const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

router.put('/:id', usuarioController.atualizarUsuario);
router.get('/:id', usuarioController.buscarUsuarioPorId);

module.exports = router;
