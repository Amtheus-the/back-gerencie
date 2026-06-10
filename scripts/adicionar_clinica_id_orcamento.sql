-- Migration: Adiciona coluna clinica_id na tabela orcamentos
ALTER TABLE orcamentos ADD COLUMN clinica_id UUID NOT NULL;
-- Opcional: se quiser criar FK
-- ALTER TABLE orcamentos ADD CONSTRAINT fk_orcamento_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id);