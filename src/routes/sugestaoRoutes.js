const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/sugestaoController');
const { verificarToken, verificarAdmin } = require('../middleware/authMiddleware');

// ── Dentista ──────────────────────────────────────────────────────
router.post('/', verificarToken, ctrl.criar);
router.get ('/', verificarToken, ctrl.listarMinhas);

// ── Admin ─────────────────────────────────────────────────────────
router.get  ('/admin',     verificarToken, verificarAdmin, ctrl.listarTodas);
router.patch('/admin/:id', verificarToken, verificarAdmin, ctrl.atualizarStatus);

module.exports = router;
