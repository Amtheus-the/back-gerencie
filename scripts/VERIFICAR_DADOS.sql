-- ========================================
-- COMANDOS PARA VERIFICAR DADOS NO BANCO
-- Execute no pgAdmin (Query Tool)
-- ========================================

-- 1️⃣ VERIFICAR PACIENTES CADASTRADOS
SELECT 
    id,
    nome,
    cpf_cnpj,
    tipo_pessoa,
    email,
    telefone,
    ativo,
    created_at
FROM pacientes 
ORDER BY created_at DESC;

-- Contar total de pacientes
SELECT COUNT(*) as total_pacientes FROM pacientes;

-- ========================================

-- 2️⃣ VERIFICAR PROCEDIMENTOS CADASTRADOS
SELECT 
    id,
    codigo,
    nome,
    categoria,
    valor_padrao,
    ativo,
    created_at
FROM procedimentos 
ORDER BY created_at DESC;

-- Contar total de procedimentos
SELECT COUNT(*) as total_procedimentos FROM procedimentos;

-- ========================================

-- 3️⃣ VERIFICAR ESTRUTURA DAS TABELAS
-- (para confirmar que foram criadas corretamente)

-- Ver colunas da tabela pacientes
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pacientes'
ORDER BY ordinal_position;

-- Ver colunas da tabela procedimentos
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'procedimentos'
ORDER BY ordinal_position;

-- ========================================

-- 4️⃣ VERIFICAR FATURAMENTOS (se já criou algum)
SELECT 
    id,
    descricao,
    paciente,
    cpf,
    procedimento,
    valor,
    data,
    created_at
FROM faturamentos 
ORDER BY created_at DESC
LIMIT 10;

-- ========================================

-- 5️⃣ VERIFICAR SE AS TABELAS EXISTEM
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('pacientes', 'procedimentos', 'faturamentos')
ORDER BY tablename;

-- ========================================

-- 6️⃣ VERIFICAR ÚLTIMOS REGISTROS INSERIDOS (todas as tabelas)
-- Pacientes
SELECT 'PACIENTE' as tipo, nome as descricao, created_at 
FROM pacientes 
ORDER BY created_at DESC 
LIMIT 5;

-- Procedimentos
SELECT 'PROCEDIMENTO' as tipo, nome as descricao, created_at 
FROM procedimentos 
ORDER BY created_at DESC 
LIMIT 5;

-- ========================================

-- 7️⃣ SE NÃO APARECER NADA, VERIFICAR PERMISSÕES
SELECT 
    grantee, 
    table_name, 
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name IN ('pacientes', 'procedimentos')
ORDER BY table_name, grantee;

-- ========================================
-- RESULTADO ESPERADO:
-- Se os dados foram salvos, você verá linhas com os nomes
-- que você cadastrou e a data/hora de criação
-- ========================================
