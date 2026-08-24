/**
 * Middleware de permissão por módulo
 * Só o dentista dono da clínica tem acesso automático a tudo — secretaria e
 * dentista parceiro são sempre limitados pelas permissoes configuradas em
 * Gerenciar Usuários. Espelha a mesma regra já aplicada no frontend
 * (PermissaoRoute, em frontend/src/routes/AppRoutes.js) — sem isso, dava pra
 * pular a interface e chamar a API direto ignorando qualquer restrição.
 */
const verificarPermissaoModulo = (modulo) => (req, res, next) => {
  // Em alguns registros mais antigos, permissoes foi salvo como string JSON
  // duplamente serializada (bug de gravação já contornado em outros pontos
  // do código, ex: secretariaController.listar) — sem isso aqui, esses
  // usuários ficam bloqueados de TODOS os módulos mesmo com acesso liberado.
  let permissoes = req.user?.permissoes;
  if (typeof permissoes === 'string') {
    try { permissoes = JSON.parse(permissoes); } catch { permissoes = null; }
  }
  if (req.user?.role !== 'dentista' && !permissoes?.[modulo]) {
    return res.status(403).json({
      success: false,
      message: 'Você não tem permissão para acessar este módulo.',
    });
  }
  next();
};

module.exports = { verificarPermissaoModulo };
