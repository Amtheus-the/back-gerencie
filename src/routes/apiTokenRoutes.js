/**
 * Gerenciamento dos tokens pessoais do conector Claude/MCP (tela Perfil).
 * O token completo só é devolvido uma vez, na criação; no banco fica só o hash.
 */
const express = require('express');
const crypto = require('crypto');
const { ApiToken } = require('../models');
const { verificarToken } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(verificarToken);

const MAX_TOKENS_ATIVOS = 5;

// Só o dentista gera token: ele dá acesso aos dados financeiros da clínica toda.
const apenasDentista = (req, res, next) => {
  if (req.user.role !== 'dentista' || !req.user.clinicaId) {
    return res.status(403).json({ success: false, message: 'Apenas o dentista responsável pela clínica pode gerenciar conexões.' });
  }
  next();
};

router.get('/', apenasDentista, async (req, res) => {
  try {
    const tokens = await ApiToken.findAll({
      where: { userId: req.user.id, revogadoEm: null },
      attributes: ['id', 'nome', 'prefixo', 'ultimoUsoEm', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, tokens });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro ao listar conexões.' });
  }
});

router.post('/', apenasDentista, async (req, res) => {
  try {
    const nome = String((req.body && req.body.nome) || '').trim().slice(0, 80) || 'Claude';
    const ativos = await ApiToken.count({ where: { userId: req.user.id, revogadoEm: null } });
    if (ativos >= MAX_TOKENS_ATIVOS) {
      return res.status(400).json({ success: false, message: `Limite de ${MAX_TOKENS_ATIVOS} conexões ativas. Revogue alguma antes de criar outra.` });
    }
    const token = `gnc_${crypto.randomBytes(32).toString('base64url')}`;
    const registro = await ApiToken.create({
      userId: req.user.id,
      clinicaId: req.user.clinicaId,
      nome,
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      prefixo: token.slice(0, 8),
    });
    res.status(201).json({ success: true, token, conexao: { id: registro.id, nome: registro.nome, prefixo: registro.prefixo, createdAt: registro.createdAt } });
  } catch (err) {
    console.error('[ApiToken] Erro ao criar:', err.message);
    res.status(500).json({ success: false, message: 'Erro ao criar conexão.' });
  }
});

router.delete('/:id', apenasDentista, async (req, res) => {
  try {
    const registro = await ApiToken.findOne({ where: { id: req.params.id, userId: req.user.id, revogadoEm: null } });
    if (!registro) return res.status(404).json({ success: false, message: 'Conexão não encontrada.' });
    await registro.update({ revogadoEm: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro ao revogar conexão.' });
  }
});

module.exports = router;
