-- Script para adicionar coluna tipo_pessoa na tabela faturamentos
-- Esta coluna define se o faturamento é de Pessoa Física (PF) ou Pessoa Jurídica (PJ)

-- 1. Criar o tipo ENUM se não existir
DO $$ BEGIN
    CREATE TYPE tipo_pessoa_enum AS ENUM ('PF', 'PJ');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Adicionar a coluna tipo_pessoa com valor padrão 'PF'
ALTER TABLE faturamentos
ADD COLUMN IF NOT EXISTS tipo_pessoa tipo_pessoa_enum NOT NULL DEFAULT 'PF';

-- 3. Criar índice para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_faturamentos_tipo_pessoa ON faturamentos(tipo_pessoa);

-- 4. Exibir resultado
SELECT 'Coluna tipo_pessoa adicionada com sucesso à tabela faturamentos!' AS resultado;

-- 5. Verificar a estrutura da tabela
\d faturamentos;
