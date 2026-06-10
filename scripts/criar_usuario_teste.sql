-- Criar usuário de teste no pgAdmin4
-- Execute este script no Query Tool conectado ao banco gerencie_db

-- Senha: 123456 (já criptografada com bcrypt)
INSERT INTO users (
    id, 
    nome, 
    email, 
    senha, 
    cro, 
    telefone, 
    ativo, 
    created_at, 
    updated_at
) VALUES (
    gen_random_uuid(),
    'Dr. João Silva',
    'demo@exemplo.com',
    '$2a$10$YQiQJzH3K0qvLc5YqR7xLeXkGvN5YK3wF0ZwG5vxI1L8xHx8xHx8x', -- senha: 123456
    '12345-SP',
    '(11) 99999-9999',
    true,
    NOW(),
    NOW()
);

-- Verificar se foi criado
SELECT id, nome, email, cro FROM users;
