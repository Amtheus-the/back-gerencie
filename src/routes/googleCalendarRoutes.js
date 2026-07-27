/**
 * Rotas de integração com Google Calendar
 * Fluxo OAuth2: cada dentista conecta a própria conta Google
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { verificarToken } = require('../middleware/authMiddleware');
const googleCalendarService = require('../services/googleCalendarService');

// CORS_ORIGIN pode ter múltiplas origens separadas por vírgula — usa FRONTEND_URL (valor único) pro redirect pós-OAuth
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * GET /api/google/connect-url
 * Gera a URL de consentimento do Google pro usuário logado.
 * O state carrega o userId assinado (curta duração) pra identificá-lo no callback,
 * já que o Google acessa /callback diretamente, sem o header Authorization.
 */
router.get('/connect-url', verificarToken, (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(500).json({ error: 'Integração com Google Calendar não configurada no servidor.' });
  }
  const state = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const url = googleCalendarService.gerarUrlAutorizacao(state);
  res.json({ url });
});

/**
 * GET /api/google/callback
 * O Google redireciona pra cá após o usuário aceitar (ou recusar) o consentimento.
 */
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error || !code || !state) {
    return res.redirect(`${FRONTEND_URL}/agenda?google=erro`);
  }

  try {
    const { userId } = jwt.verify(state, process.env.JWT_SECRET);
    const tokens = await googleCalendarService.trocarCodigoPorTokens(code);
    const usuario = await User.findByPk(userId);
    if (!usuario) throw new Error('Usuário não encontrado');

    await usuario.update({
      googleAccessToken: tokens.access_token,
      // O Google só devolve refresh_token na primeira autorização — preserva o antigo se não vier de novo
      googleRefreshToken: tokens.refresh_token || usuario.googleRefreshToken,
      googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    });

    return res.redirect(`${FRONTEND_URL}/agenda?google=conectado`);
  } catch (err) {
    console.error('[Google Calendar] Erro no callback:', err.message);
    return res.redirect(`${FRONTEND_URL}/agenda?google=erro`);
  }
});

/**
 * GET /api/google/status
 * Diz se o usuário logado já conectou o Google Calendar.
 */
router.get('/status', verificarToken, async (req, res) => {
  try {
    const usuario = await User.findByPk(req.user.id, { attributes: ['id', 'googleRefreshToken'] });
    res.json({ conectado: !!usuario?.googleRefreshToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/google/disconnect
 * Remove os tokens salvos — para de sincronizar, sem apagar eventos já criados no Google.
 */
router.post('/disconnect', verificarToken, async (req, res) => {
  try {
    await User.update(
      { googleAccessToken: null, googleRefreshToken: null, googleTokenExpiry: null },
      { where: { id: req.user.id } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
