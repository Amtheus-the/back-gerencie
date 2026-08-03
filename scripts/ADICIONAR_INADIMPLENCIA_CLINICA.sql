-- Migração: bloqueio de acesso por inadimplência
-- Execute este script no phpMyAdmin / MySQL Workbench / cliente MySQL da hospedagem
-- Banco: MySQL (sintaxe compatível com MySQL 8+)

ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS inadimplente TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Tem cobrança vencida no Asaas — bloqueia acesso ao sistema (exceto tela de pagamento)',
  ADD COLUMN IF NOT EXISTS inadimplente_desde DATETIME NULL
    COMMENT 'Quando a inadimplência foi detectada';

-- Verificar se as colunas foram criadas:
-- SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns
-- WHERE table_name = 'clinicas' AND COLUMN_NAME IN ('inadimplente', 'inadimplente_desde');
