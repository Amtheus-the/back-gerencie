-- Migração: Adicionar campos CPF e Procedimento na tabela faturamentos
-- Execute este script no pgAdmin após executar a migração principal

-- Adicionar campo CPF (já pode existir de migração anterior)
ALTER TABLE faturamentos 
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

COMMENT ON COLUMN faturamentos.cpf IS 'CPF do beneficiário (formato: 000.000.000-00)';

-- Adicionar campo para armazenar nome do procedimento
ALTER TABLE faturamentos 
  ADD COLUMN IF NOT EXISTS procedimento VARCHAR(255);

COMMENT ON COLUMN faturamentos.procedimento IS 'Nome do procedimento realizado';

-- Adicionar campos do pagador (quando diferente do beneficiário)
ALTER TABLE faturamentos 
  ADD COLUMN IF NOT EXISTS pagador_nome VARCHAR(255),
  ADD COLUMN IF NOT EXISTS pagador_cpf VARCHAR(18),
  ADD COLUMN IF NOT EXISTS pagador_tipo_pessoa VARCHAR(2) CHECK (pagador_tipo_pessoa IN ('PF', 'PJ'));

COMMENT ON COLUMN faturamentos.pagador_nome IS 'Nome do pagador (quando diferente do beneficiário)';
COMMENT ON COLUMN faturamentos.pagador_cpf IS 'CPF/CNPJ do pagador';
COMMENT ON COLUMN faturamentos.pagador_tipo_pessoa IS 'Tipo de pessoa do pagador (PF ou PJ)';

-- Criar índices para melhorar buscas
CREATE INDEX IF NOT EXISTS idx_faturamentos_cpf ON faturamentos(cpf);
CREATE INDEX IF NOT EXISTS idx_faturamentos_procedimento ON faturamentos(procedimento);
CREATE INDEX IF NOT EXISTS idx_faturamentos_pagador_cpf ON faturamentos(pagador_cpf);

-- Mensagem de sucesso
SELECT 'Migração concluída! Campos CPF, Procedimento e dados do Pagador adicionados à tabela faturamentos.' AS status;

-- Para verificar as colunas da tabela:
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'faturamentos';
