-- Migração: histórico de anotações/observações do paciente
-- Execute este script no phpMyAdmin / MySQL Workbench / cliente MySQL da hospedagem
-- Banco: MySQL (sintaxe compatível com MySQL 8+)

-- Sem FOREIGN KEY: evita erro 1005 por divergência de tipo/collation com
-- pacientes.id / users.id (o resto do schema também não usa FK rígida).
-- A integridade é garantida pela aplicação (Sequelize).
CREATE TABLE IF NOT EXISTS anotacoes_paciente (
  id CHAR(36) NOT NULL PRIMARY KEY,
  clinica_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL COMMENT 'Dentista/usuário que registrou a anotação',
  paciente_id CHAR(36) NOT NULL,
  texto TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_anotacoes_paciente_paciente_id (paciente_id)
);

-- Verificar se a tabela foi criada:
-- SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_name = 'anotacoes_paciente';
