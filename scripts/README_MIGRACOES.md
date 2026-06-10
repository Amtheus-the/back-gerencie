# 🗄️ Migrações do Banco de Dados - Ordem de Execução

## 📋 Resumo

Para o sistema funcionar completamente, você precisa executar **2 migrações** nesta ordem:

1. **MIGRAR_PACIENTES_PROCEDIMENTOS.sql** - Cria tabelas de pacientes e procedimentos
2. **MIGRAR_CAMPOS_FATURAMENTO.sql** - Adiciona campos novos na tabela faturamentos

---

## 🚀 Migração 1: Tabelas Auxiliares

### Arquivo: `MIGRAR_PACIENTES_PROCEDIMENTOS.sql`

**O que faz:**
- ✅ Cria tabela `pacientes` (nome, CPF, endereço, etc)
- ✅ Cria tabela `procedimentos` (nome, código, valor padrão, categoria)
- ✅ Adiciona foreign keys opcionais em faturamentos (paciente_id, procedimento_id)
- ✅ Cria índices para performance
- ✅ Cria triggers para atualizar datas automaticamente

### Como executar:

**Via pgAdmin:**
1. Abra pgAdmin
2. Conecte ao servidor PostgreSQL
3. Selecione banco `gerencie_db`
4. Query Tool (botão direito → Query Tool)
5. Cole o SQL abaixo ou abra o arquivo
6. Execute (F5)

**SQL:**
```sql
-- Cria tabela de pacientes
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

CREATE INDEX IF NOT EXISTS idx_pacientes_user_id ON pacientes(user_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_nome ON pacientes(nome);
CREATE INDEX IF NOT EXISTS idx_pacientes_cpf_cnpj ON pacientes(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_pacientes_ativo ON pacientes(ativo);

-- Cria tabela de procedimentos
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

CREATE INDEX IF NOT EXISTS idx_procedimentos_user_id ON procedimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_procedimentos_nome ON procedimentos(nome);
CREATE INDEX IF NOT EXISTS idx_procedimentos_codigo ON procedimentos(codigo);
CREATE INDEX IF NOT EXISTS idx_procedimentos_categoria ON procedimentos(categoria);
CREATE INDEX IF NOT EXISTS idx_procedimentos_ativo ON procedimentos(ativo);

-- Adiciona foreign keys opcionais em faturamentos
ALTER TABLE faturamentos 
  ADD COLUMN IF NOT EXISTS paciente_id UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS procedimento_id UUID REFERENCES procedimentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_faturamentos_paciente_id ON faturamentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_procedimento_id ON faturamentos(procedimento_id);

-- Triggers para updated_at
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

SELECT 'Migração 1 concluída com sucesso!' AS status;
```

---

## 🎯 Migração 2: Campos do Faturamento

### Arquivo: `MIGRAR_CAMPOS_FATURAMENTO.sql`

**O que faz:**
- ✅ Adiciona campo `cpf` (CPF do beneficiário)
- ✅ Adiciona campo `procedimento` (nome do procedimento)
- ✅ Adiciona campos do pagador:
  - `pagador_nome`
  - `pagador_cpf`
  - `pagador_tipo_pessoa`
- ✅ Cria índices para busca

### Como executar:

**Via pgAdmin:**
1. **APÓS executar a Migração 1**
2. Mesmos passos: Query Tool → Cole o SQL → Execute

**SQL:**
```sql
-- Adicionar campo CPF do beneficiário
ALTER TABLE faturamentos 
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

COMMENT ON COLUMN faturamentos.cpf IS 'CPF do beneficiário (formato: 000.000.000-00)';

-- Adicionar campo Procedimento
ALTER TABLE faturamentos 
  ADD COLUMN IF NOT EXISTS procedimento VARCHAR(255);

COMMENT ON COLUMN faturamentos.procedimento IS 'Nome do procedimento realizado';

-- Adicionar campos do Pagador
ALTER TABLE faturamentos 
  ADD COLUMN IF NOT EXISTS pagador_nome VARCHAR(255),
  ADD COLUMN IF NOT EXISTS pagador_cpf VARCHAR(18),
  ADD COLUMN IF NOT EXISTS pagador_tipo_pessoa VARCHAR(2) CHECK (pagador_tipo_pessoa IN ('PF', 'PJ'));

COMMENT ON COLUMN faturamentos.pagador_nome IS 'Nome do pagador (quando diferente do beneficiário)';
COMMENT ON COLUMN faturamentos.pagador_cpf IS 'CPF/CNPJ do pagador';
COMMENT ON COLUMN faturamentos.pagador_tipo_pessoa IS 'Tipo de pessoa do pagador (PF ou PJ)';

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_faturamentos_cpf ON faturamentos(cpf);
CREATE INDEX IF NOT EXISTS idx_faturamentos_procedimento ON faturamentos(procedimento);
CREATE INDEX IF NOT EXISTS idx_faturamentos_pagador_cpf ON faturamentos(pagador_cpf);

SELECT 'Migração 2 concluída! Campos adicionados à tabela faturamentos.' AS status;
```

---

## ✅ Verificar se deu certo

Após executar as 2 migrações, execute para verificar:

```sql
-- Ver estrutura da tabela pacientes
\d pacientes

-- Ver estrutura da tabela procedimentos
\d procedimentos

-- Ver estrutura da tabela faturamentos (com novos campos)
\d faturamentos

-- Ou:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('pacientes', 'procedimentos', 'faturamentos')
ORDER BY table_name, ordinal_position;
```

---

## 🔄 Ordem de Execução Resumida

```
1. MIGRAR_PACIENTES_PROCEDIMENTOS.sql
   ↓
2. MIGRAR_CAMPOS_FATURAMENTO.sql
   ↓
3. Reiniciar backend (npm start)
   ↓
4. Testar no frontend
```

---

## 📊 Estrutura Final da Tabela Faturamentos

Após as migrações, sua tabela `faturamentos` terá:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| descricao | VARCHAR(255) | Descrição do lançamento |
| **procedimento** | **VARCHAR(255)** | **Nome do procedimento** ✨ |
| valor | DECIMAL(10,2) | Valor da receita |
| data | DATE | Data do lançamento |
| forma_pagamento | ENUM | Forma de pagamento |
| paciente | VARCHAR(255) | Nome do paciente/beneficiário |
| **cpf** | **VARCHAR(14)** | **CPF do beneficiário** ✨ |
| tipo_pessoa | ENUM | PF ou PJ |
| **pagador_nome** | **VARCHAR(255)** | **Nome do pagador (se diferente)** ✨ |
| **pagador_cpf** | **VARCHAR(18)** | **CPF/CNPJ do pagador** ✨ |
| **pagador_tipo_pessoa** | **ENUM** | **PF ou PJ do pagador** ✨ |
| observacoes | TEXT | Observações |
| paciente_id | UUID | FK para pacientes (opcional) |
| procedimento_id | UUID | FK para procedimentos (opcional) |
| user_id | UUID | FK para users |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

---

## 🐛 Se der erro

### Erro: "column already exists"
**Solução:** Tudo bem! A migração usa `IF NOT EXISTS`, então pula campos que já existem.

### Erro: "relation does not exist"
**Solução:** Execute a Migração 1 primeiro, depois a Migração 2.

### Erro: "permission denied"
**Solução:** Use um usuário com privilégios de ALTER TABLE (ex: postgres).

---

## 📝 Após as Migrações

1. ✅ Reinicie o backend
2. ✅ Acesse `/pacientes` para cadastrar pacientes
3. ✅ Acesse `/procedimentos` para cadastrar procedimentos
4. ✅ Use o modal de Faturamento com autocomplete
5. ✅ Teste salvando com dados do pagador diferente

---

**Campos novos serão salvos automaticamente!** 🎉
