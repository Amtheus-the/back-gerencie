/**
 * Middleware de permissão por módulo
 * Só o dentista dono da clínica tem acesso automático a tudo — secretaria e
 * dentista parceiro são sempre limitados pelas permissoes configuradas em
 * Gerenciar Usuários. Espelha a mesma regra já aplicada no frontend
 * (PermissaoRoute, em frontend/src/routes/AppRoutes.js) — sem isso, dava pra
 * pular a interface e chamar a API direto ignorando qualquer restrição.
 */
const verificarPermissaoModulo = (modulo) => (req, res, next) => {
  if (req.user?.role !== 'dentista' && !req.user?.permissoes?.[modulo]) {
    return res.status(403).json({
      success: false,
      message: 'Você não tem permissão para acessar este módulo.',
    });
  }
  next();
};

module.exports = { verificarPermissaoModulo };
