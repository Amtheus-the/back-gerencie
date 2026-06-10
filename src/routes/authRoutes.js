
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { verificarToken } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/auth/reset-password
 * @desc    Redefine a senha do usuário via token de recuperação
 * @access  Public
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @route   POST /api/auth/validate-email-token
 * @desc    Valida o token de e-mail e ativa o usuário
 * @access  Public
 */
router.post('/validate-email-token', authController.validateEmailToken);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Envia link de recuperação de senha para o e-mail do usuário
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword);
/**
 * Rotas de autenticação
 * Gerencia login, registro e autenticação de usuários
 */

/**
 * @route   POST /api/auth/register
 * @desc    Registra um novo usuário
 * @access  Public
 */
router.post(
  '/register',
  [
    body('nome').notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido'),
    body('senha').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
    body('tipoPessoa').notEmpty().withMessage('Tipo de pessoa é obrigatório'),
  ],
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Autentica usuário e retorna token JWT
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('senha').notEmpty().withMessage('Senha é obrigatória'),
  ],
  authController.login
);

/**
 * @route   GET /api/auth/me
 * @desc    Retorna dados do usuário autenticado
 * @access  Private
 */
router.get('/me', verificarToken, authController.getMe);

/**
 * @route   POST /api/auth/logout
 * @desc    Faz logout do usuário
 * @access  Private
 */
router.post('/logout', verificarToken, authController.logout);

module.exports = router;
