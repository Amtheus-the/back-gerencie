-- Migração: Integração com Google Calendar
-- Execute este script no phpMyAdmin / MySQL Workbench / cliente MySQL da hospedagem
-- Banco: MySQL (sintaxe compatível com MySQL 8+)

-- Tokens OAuth do Google, por usuário (dentista)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_access_token TEXT NULL
    COMMENT 'Access token OAuth do Google Calendar (curta duração)',
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT NULL
    COMMENT 'Refresh token OAuth do Google Calendar — presença indica conta conectada',
  ADD COLUMN IF NOT EXISTS google_token_expiry DATETIME NULL
    COMMENT 'Data/hora de expiração do access token do Google';

-- Mapeamento do agendamento para o evento correspondente no Google Calendar
ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255) NULL
    COMMENT 'ID do evento correspondente no Google Calendar do dentista';

-- Verificar se as colunas foram criadas:
-- SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns
-- WHERE (table_name = 'users' AND COLUMN_NAME LIKE 'google_%')
--    OR (table_name = 'agendamentos' AND COLUMN_NAME = 'google_event_id');
