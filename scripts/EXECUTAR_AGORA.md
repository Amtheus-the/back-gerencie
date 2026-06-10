# 🚨 EXECUTAR MIGRAÇÃO URGENTE - Campos CPF e Pagador

## ⚠️ Erro Atual
```
Erro: coluna "cpf" não existe
```

## ✅ Solução: Execute o SQL abaixo no pgAdmin

### Passo a Passo:

1. **Abra o pgAdmin**
2. **Conecte no banco `gerencie_db`**
3. **Clique com botão direito em `gerencie_db` → Query Tool**
4. **Cole o SQL abaixo e clique em Execute (▶️ ou F5)**

---

## 📋 SQL para Copiar e Colar:

```sql
-- Migração: Adicionar campos CPF, Procedimento e dados do Pagador
-- Execute este script no pgAdmin

-- Adicionar campo CPF
ALTER TABLE faturamentos 
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

COMMENT ON COLUMN faturamentos.cpf IS 'CPF do beneficiário (formato: 000.000.000-00)';

-- Adicionar campo para armazenar nome do procedimento
ALTER TABLE faturamentos 
  ADD COLUMN IF NOT EXISTS procedimento VARCHAR(255);

COMMENT ON COLUMN faturamentos.procedimento IS 'Nome do procedimento realizado';

-- Adicionar campos do pagador (quando diferente do beneficiário)
ALTER TABLE faturamentos 
  ADD COLUMN IF NOT EXISTS pagador_nome VARCHAR(255),
  ADD COLUMN IF NOT EXISTS pagador_cpf VARCHAR(18),
  ADD COLUMN IF NOT EXISTS pagador_tipo_pessoa VARCHAR(2) CHECK (pagador_tipo_pessoa IN ('PF', 'PJ'));

COMMENT ON COLUMN faturamentos.pagador_nome IS 'Nome do pagador (quando diferente do beneficiário)';
COMMENT ON COLUMN faturamentos.pagador_cpf IS 'CPF/CNPJ do pagador';
COMMENT ON COLUMN faturamentos.pagador_tipo_pessoa IS 'Tipo de pessoa do pagador (PF ou PJ)';

-- Criar índices para melhorar buscas
CREATE INDEX IF NOT EXISTS idx_faturamentos_cpf ON faturamentos(cpf);
CREATE INDEX IF NOT EXISTS idx_faturamentos_procedimento ON faturamentos(procedimento);
CREATE INDEX IF NOT EXISTS idx_faturamentos_pagador_cpf ON faturamentos(pagador_cpf);

-- Mensagem de sucesso
SELECT 'Migração concluída! Campos adicionados com sucesso.' AS status;
```

---

## 🎯 Após Executar:

### ✅ Você verá esta mensagem:
```
Migração concluída! Campos adicionados com sucesso.
```

### ✅ Não precisa reiniciar o backend (já está rodando)

### ✅ Atualize a página do frontend (F5)

### ✅ Agora vai funcionar:
- ✅ Lista de Pacientes
- ✅ Lista de Procedimentos  
- ✅ Campo CPF salvando nos lançamentos
- ✅ Campos do Pagador salvando

---

## 🔍 Verificar se funcionou:

Execute este SQL para confirmar que as colunas foram criadas:

```sql
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'faturamentos' 
  AND column_name IN ('cpf', 'procedimento', 'pagador_nome', 'pagador_cpf', 'pagador_tipo_pessoa')
ORDER BY column_name;
```

Deve retornar 5 linhas mostrando as novas colunas.

---

## 📝 Resumo do que foi corrigido no Backend:

✅ **Rotas corrigidas**: `pacienteRoutes.js` e `procedimentoRoutes.js`
✅ **Middleware corrigido**: Agora usa `verificarToken` corretamente
✅ **Servidor rodando**: Backend já está online na porta 5000
✅ **Models prontos**: Paciente, Procedimento e Faturamento atualizados

**Só falta**: Executar o SQL acima no pgAdmin! 🚀
