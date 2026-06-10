-- Atualizar senha do admin com o hash correto para "admin123"
UPDATE users 
SET senha = '$2a$10$YXPWGbFztk86eO0Mmbte4ujqgsAJVvKOtKQOKP.8/frdtir0a75Q6' 
WHERE email = 'admin@gerencie.com.br';

-- Verificar a atualização
SELECT id, nome, email, is_admin, ativo 
FROM users 
WHERE email = 'admin@gerencie.com.br';
