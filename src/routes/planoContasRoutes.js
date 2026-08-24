/**
 * Rotas de Plano de Contas
 */

const express = require('express');
const router = express.Router();
const planoContasController = require('../controllers/planoContasController');
const { verificarToken } = require('../middleware/authMiddleware');
const { verificarPermissaoModulo } = require('../middleware/permissaoMiddleware');

// Todas as rotas requerem autenticação
router.use(verificarToken);

// Leitura também é usada pela tela de Despesas (categorias) — libera pra
// quem tem "despesas" OU "planoContas", não só quem tem "planoContas".
const acessoLeitura = (req, res, next) => {
  // Alguns registros antigos guardam permissoes como string JSON serializada
  // duas vezes — sem isso, esses usuários ficam bloqueados mesmo com acesso liberado.
  let permissoes = req.user?.permissoes;
  if (typeof permissoes === 'string') {
    try { permissoes = JSON.parse(permissoes); } catch { permissoes = null; }
  }
  const temAcesso = req.user?.role === 'dentista' || permissoes?.despesas || permissoes?.planoContas;
  if (!temAcesso) return res.status(403).json({ success: false, message: 'Você não tem permissão para acessar este módulo.' });
  next();
};

// Buscar contas (autocomplete)
router.get('/buscar', acessoLeitura, planoContasController.buscar);

router.get('/', acessoLeitura, planoContasController.listar);
router.get('/:id', acessoLeitura, planoContasController.buscarPorId);

// Criar/editar/excluir naturezas exige a permissão "planoContas" propriamente
router.use(verificarPermissaoModulo('planoContas'));
router.post('/', planoContasController.criar);
router.put('/:id', planoContasController.atualizar);
router.delete('/:id', planoContasController.deletar);

module.exports = router;
