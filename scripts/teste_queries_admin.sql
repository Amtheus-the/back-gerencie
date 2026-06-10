-- Script de Teste: Verificar dados para o Dashboard Admin
-- Execute este script para testar se as queries estão funcionando

-- 1. Contar usuários
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(*) FILTER (WHERE ativo = true) as usuarios_ativos,
  COUNT(*) FILTER (WHERE is_admin = true) as admins
FROM users;

-- 2. Testar query de listagem de usuários (igual ao adminController)
SELECT 
  u.id,
  u.nome,
  u.email,
  u.tipo_pessoa,
  u.ativo,
  u.created_at,
  (SELECT COUNT(*)::int FROM faturamentos WHERE faturamentos.user_id = u.id) AS total_faturamentos,
  (SELECT COUNT(*)::int FROM despesas WHERE despesas.user_id = u.id) AS total_despesas,
  (SELECT COUNT(*)::int FROM analises WHERE analises.user_id = u.id) AS total_analises,
  (SELECT COALESCE(SUM(valor), 0) FROM faturamentos WHERE faturamentos.user_id = u.id) AS valor_total_faturamento,
  (SELECT COALESCE(SUM(valor), 0) FROM despesas WHERE despesas.user_id = u.id) AS valor_total_despesas
FROM users u
ORDER BY u.created_at DESC
LIMIT 10;

-- 3. Estatísticas gerais
SELECT 
  (SELECT COUNT(*) FROM users WHERE ativo = true) as total_usuarios,
  (SELECT COUNT(*) FROM faturamentos) as total_faturamentos,
  (SELECT COUNT(*) FROM despesas) as total_despesas,
  (SELECT COUNT(*) FROM analises) as total_analises,
  (SELECT COALESCE(SUM(valor), 0) FROM faturamentos) as valor_total_faturamentos,
  (SELECT COALESCE(SUM(valor), 0) FROM despesas) as valor_total_despesas;

-- 4. Distribuição por tipo de pessoa
SELECT 
  tipo_pessoa,
  COUNT(*) as total
FROM users
WHERE ativo = true
GROUP BY tipo_pessoa;

-- 5. Verificar se há dados
SELECT 
  'users' as tabela, COUNT(*) as registros FROM users
UNION ALL
SELECT 'faturamentos', COUNT(*) FROM faturamentos
UNION ALL
SELECT 'despesas', COUNT(*) FROM despesas
UNION ALL
SELECT 'analises', COUNT(*) FROM analises;
