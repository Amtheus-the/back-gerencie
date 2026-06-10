-- Migração para criar tabelas de Pacientes e Procedimentos
-- Execute este script no pgAdmin ou via psql

-- Tabela de Pacientes
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(18),
  tipo_pessoa VARCHAR(2) NOT NULL DEFAULT 'PF' CHECK (tipo_pessoa IN ('PF', 'PJ')),
  email VARCHAR(255),
  telefone VARCHAR(20),
  cep VARCHAR(9),
  logradouro VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(255),
  bairro VARCHAR(255),
  cidade VARCHAR(255),
  estado VARCHAR(2),
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE pacientes IS 'Cadastro de pacientes para facilitar lançamentos';
COMMENT ON COLUMN pacientes.cpf_cnpj IS 'CPF ou CNPJ (formato: 000.000.000-00 ou 00.000.000/0000-00)';

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_pacientes_user_id ON pacientes(user_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_nome ON pacientes(nome);
CREATE INDEX IF NOT EXISTS idx_pacientes_cpf_cnpj ON pacientes(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_pacientes_ativo ON pacientes(ativo);

-- Tabela de Procedimentos
CREATE TABLE IF NOT EXISTS procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  valor_padrao DECIMAL(10, 2),
  categoria VARCHAR(50),
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE procedimentos IS 'Cadastro de procedimentos odontológicos para facilitar lançamentos';
COMMENT ON COLUMN procedimentos.codigo IS 'Código do procedimento (ex: TUSS, próprio)';
COMMENT ON COLUMN procedimentos.valor_padrao IS 'Valor padrão sugerido para o procedimento';
COMMENT ON COLUMN procedimentos.categoria IS 'Categoria do procedimento (ex: Prevenção, Restauração, Endodontia)';

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_procedimentos_user_id ON procedimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_procedimentos_nome ON procedimentos(nome);
CREATE INDEX IF NOT EXISTS idx_procedimentos_codigo ON procedimentos(codigo);
CREATE INDEX IF NOT EXISTS idx_procedimentos_categoria ON procedimentos(categoria);
CREATE INDEX IF NOT EXISTS idx_procedimentos_ativo ON procedimentos(ativo);

-- Adicionar colunas no faturamento para relacionar com paciente e procedimento
-- (opcional - permite futuramente vincular diretamente ao invés de usar texto livre)
ALTER TABLE faturamentos 
  ADD COLUMN IF NOT EXISTS paciente_id UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS procedimento_id UUID REFERENCES procedimentos(id) ON DELETE SET NULL;

COMMENT ON COLUMN faturamentos.paciente_id IS 'Referência ao cadastro de paciente (opcional)';
COMMENT ON COLUMN faturamentos.procedimento_id IS 'Referência ao cadastro de procedimento (opcional)';

-- Índices para as novas foreign keys
CREATE INDEX IF NOT EXISTS idx_faturamentos_paciente_id ON faturamentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_procedimento_id ON faturamentos(procedimento_id);

-- Trigger para atualizar updated_at automaticamente (pacientes)
CREATE OR REPLACE FUNCTION update_pacientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pacientes_updated_at ON pacientes;
CREATE TRIGGER trigger_update_pacientes_updated_at
  BEFORE UPDATE ON pacientes
  FOR EACH ROW
  EXECUTE FUNCTION update_pacientes_updated_at();

-- Trigger para atualizar updated_at automaticamente (procedimentos)
CREATE OR REPLACE FUNCTION update_procedimentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_procedimentos_updated_at ON procedimentos;
CREATE TRIGGER trigger_update_procedimentos_updated_at
  BEFORE UPDATE ON procedimentos
  FOR EACH ROW
  EXECUTE FUNCTION update_procedimentos_updated_at();

-- Mensagem de sucesso
SELECT 'Migração concluída com sucesso! Tabelas pacientes e procedimentos criadas.' AS status;
