-- Migração: Adicionar campo CPF na tabela de faturamentos
-- Data: 14/11/2025
-- Descrição: Adiciona coluna cpf para armazenar CPF do paciente

-- Adicionar coluna CPF
ALTER TABLE faturamentos 
ADD COLUMN cpf VARCHAR(14) NULL 
COMMENT 'CPF do paciente (formato: 000.000.000-00)';

-- Comentário de sucesso
SELECT 'Campo CPF adicionado com sucesso na tabela faturamentos!' AS status;
