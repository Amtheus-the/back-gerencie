-- Migração: Adicionar campo de mensagem de aniversário personalizada na tabela clinicas
-- Execute este script no phpMyAdmin / MySQL Workbench / cliente MySQL da hospedagem
-- Banco: MySQL (sintaxe compatível com MySQL 8+)

ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS mensagem_aniversario TEXT NULL
  COMMENT 'Mensagem personalizada de aniversário para pacientes (use {{paciente}} para o nome). Se vazio, usa a mensagem padrão do sistema.';

-- Verificar se a coluna foi criada:
-- SELECT COLUMN_NAME, DATA_TYPE
-- FROM information_schema.columns
-- WHERE table_name = 'clinicas' AND COLUMN_NAME = 'mensagem_aniversario';
