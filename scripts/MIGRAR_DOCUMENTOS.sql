-- Migração: Criar tabela de documentos
-- Data: 2025-11-17
-- Descrição: Tabela para armazenar documentos (notas fiscais, recibos, etc) dos usuários

-- Criar enum para tipo de documento
CREATE TYPE tipo_documento AS ENUM ('nota_fiscal', 'recibo', 'comprovante', 'contrato', 'outros');

-- Criar tabela de documentos
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo tipo_documento NOT NULL DEFAULT 'outros',
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  nome_arquivo VARCHAR(500) NOT NULL,
  caminho_arquivo VARCHAR(1000) NOT NULL,
  tamanho_arquivo INTEGER,
  tipo_mime VARCHAR(100),
  upload_por_admin BOOLEAN DEFAULT false,
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  valor DECIMAL(10, 2),
  data_referencia TIMESTAMP,
  faturamento_id UUID REFERENCES faturamentos(id) ON DELETE SET NULL,
  despesa_id UUID REFERENCES despesas(id) ON DELETE SET NULL,
  visualizado BOOLEAN DEFAULT false,
  data_visualizacao TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX idx_documentos_user_id ON documentos(user_id);
CREATE INDEX idx_documentos_tipo ON documentos(tipo);
CREATE INDEX idx_documentos_faturamento_id ON documentos(faturamento_id);
CREATE INDEX idx_documentos_despesa_id ON documentos(despesa_id);
CREATE INDEX idx_documentos_created_at ON documentos(created_at DESC);

-- Comentários nas colunas
COMMENT ON TABLE documentos IS 'Armazena documentos (notas fiscais, recibos, etc) dos usuários';
COMMENT ON COLUMN documentos.user_id IS 'ID do usuário dono do documento';
COMMENT ON COLUMN documentos.tipo IS 'Tipo do documento';
COMMENT ON COLUMN documentos.titulo IS 'Título/nome do documento';
COMMENT ON COLUMN documentos.descricao IS 'Descrição adicional do documento';
COMMENT ON COLUMN documentos.nome_arquivo IS 'Nome original do arquivo';
COMMENT ON COLUMN documentos.caminho_arquivo IS 'Caminho do arquivo no servidor';
COMMENT ON COLUMN documentos.tamanho_arquivo IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN documentos.tipo_mime IS 'Tipo MIME do arquivo';
COMMENT ON COLUMN documentos.upload_por_admin IS 'Indica se o documento foi enviado pelo admin';
COMMENT ON COLUMN documentos.admin_id IS 'ID do admin que fez o upload';
COMMENT ON COLUMN documentos.valor IS 'Valor relacionado ao documento';
COMMENT ON COLUMN documentos.data_referencia IS 'Data de referência do documento';
COMMENT ON COLUMN documentos.faturamento_id IS 'ID do faturamento relacionado';
COMMENT ON COLUMN documentos.despesa_id IS 'ID da despesa relacionada';
COMMENT ON COLUMN documentos.visualizado IS 'Indica se o usuário visualizou o documento';
COMMENT ON COLUMN documentos.data_visualizacao IS 'Data em que o usuário visualizou';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column_documentos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documentos_updated_at
BEFORE UPDATE ON documentos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_documentos();

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Tabela de documentos criada com sucesso!';
END $$;
