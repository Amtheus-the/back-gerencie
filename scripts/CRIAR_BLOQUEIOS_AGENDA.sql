-- Migração: bloqueios de agenda (dia todo ou horário específico travado)
-- Execute este script no phpMyAdmin / MySQL Workbench / cliente MySQL da hospedagem
-- Banco: MySQL (sintaxe compatível com MySQL 8+)
-- Sem FOREIGN KEY (evita erro 1005 por divergência de tipo/collation) —
-- integridade garantida pela aplicação, mesmo padrão de anotacoes_paciente.

CREATE TABLE IF NOT EXISTS bloqueios_agenda (
  id CHAR(36) NOT NULL PRIMARY KEY,
  clinica_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL COMMENT 'Dentista cuja agenda está bloqueada',
  data_inicio DATETIME NOT NULL,
  data_fim DATETIME NOT NULL,
  dia_todo TINYINT(1) NOT NULL DEFAULT 0,
  motivo VARCHAR(255) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_bloqueios_agenda_user_id (user_id),
  INDEX idx_bloqueios_agenda_periodo (data_inicio, data_fim)
);

-- Verificar se a tabela foi criada:
-- SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_name = 'bloqueios_agenda';
