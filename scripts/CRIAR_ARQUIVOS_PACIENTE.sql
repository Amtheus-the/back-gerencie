-- Migração: pastas e arquivos do paciente (fotos, raio-x, contratos, etc)
-- Execute este script no phpMyAdmin / MySQL Workbench / cliente MySQL da hospedagem
-- Banco: MySQL (sintaxe compatível com MySQL 8+)
-- Sem FOREIGN KEY (evita erro 1005 por divergência de tipo/collation) —
-- integridade garantida pela aplicação, mesmo padrão de anotacoes_paciente.

CREATE TABLE IF NOT EXISTS arquivos_paciente (
  id CHAR(36) NOT NULL PRIMARY KEY,
  clinica_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL COMMENT 'Quem enviou o arquivo / criou a pasta',
  paciente_id CHAR(36) NOT NULL,
  pasta VARCHAR(150) NOT NULL DEFAULT 'Geral',
  nome_arquivo VARCHAR(500) NULL COMMENT 'Nome original do arquivo — nulo pra pasta vazia',
  url VARCHAR(1000) NULL,
  tamanho INT NULL,
  tipo VARCHAR(100) NULL COMMENT 'MIME type',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_arquivos_paciente_paciente_id (paciente_id)
);

-- Verificar se a tabela foi criada:
-- SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_name = 'arquivos_paciente';
