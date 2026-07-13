/**
 * Middleware de autenticação
 * Verifica se o usuário está autenticado através do token JWT
 */

const jwt = require('jsonwebtoken');
const { User, Clinica } = require('../models');

/**
 * Middleware para verificar autenticação
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Busca o token no header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação não fornecido'
      });
    }

    // Formato esperado: "Bearer TOKEN"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).json({
        success: false,
        message: 'Formato de token inválido'
      });
    }

    const token = parts[1];

    // Verifica e decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca usuário completo do banco de dados (inclui clínica para tipoPessoa)
    console.log('[AUTH] Buscando user:', decoded.userId);
    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Clinica, as: 'clinica', attributes: ['tipoPessoa'] }]
    });
    console.log('[AUTH] User encontrado:', !!user);

    if (!user || !user.ativo) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado ou inativo'
      });
    }

    // Adiciona usuário à requisição — tipoPessoa vem da clínica (fonte única)
    req.user = {
      id: user.id,
      email: user.email,
      nome: user.nome,
      cro: user.cro,
      isAdmin: user.isAdmin,
      clinicaId: user.clinicaId,
      tipoPessoa: user.clinica?.tipoPessoa || 'PF',
      role: user.role || 'dentista',
      permissoes: user.permissoes || null,
      criadoPorId: user.criadoPorId || null,
    };
    
    // Adiciona userId para compatibilidade
    req.userId = user.id;

    next();
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao validar autenticação'
    });
  }
};

/**
 * Middleware para verificar se o usuário é administrador
 */
const verificarAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem acessar este recurso.'
      });
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar permissão de admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar permissões'
    });
  }
};

module.exports = {
  verificarToken: authMiddleware,
  verificarAdmin
};
