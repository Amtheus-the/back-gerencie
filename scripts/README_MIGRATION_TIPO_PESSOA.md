# Migration: Coluna tipo_pessoa na Tabela Faturamentos

## 📋 Descrição

Este documento descreve a migration realizada para adicionar a coluna `tipo_pessoa` na tabela `faturamentos` do banco de dados PostgreSQL.

## ❓ Por que essa migration foi necessária?

O modelo `Faturamento` no Sequelize definia a coluna `tipoPessoa`, mas a tabela real no banco de dados não tinha essa coluna, causando o erro:

```
error: coluna "tipo_pessoa" não existe
```

Esse erro ocorria quando o sistema tentava filtrar faturamentos por tipo de pessoa (PF ou PJ) no dashboard.

## ✅ O que foi feito?

1. **Criado tipo ENUM** `tipo_pessoa_enum` com valores 'PF' e 'PJ'
2. **Adicionada coluna** `tipo_pessoa` na tabela `faturamentos` com:
   - Tipo: `tipo_pessoa_enum`
   - Obrigatória: `NOT NULL`
   - Valor padrão: `'PF'`
3. **Criado índice** para melhorar performance nas consultas

## 🚀 Como executar a migration

### Opção 1: Script Node.js (Recomendado)

```bash
cd backend
node scripts/adicionar_tipo_pessoa_migration.js
```

### Opção 2: Script SQL direto

```bash
cd backend/scripts
psql -h localhost -U postgres -d gerencie_db -f adicionar_tipo_pessoa_faturamento.sql
```

### Opção 3: Script Batch (Windows)

```bash
cd backend/scripts
executar_migration.bat
```

## 📁 Arquivos criados

1. **adicionar_tipo_pessoa_migration.js** - Script Node.js automatizado
2. **adicionar_tipo_pessoa_faturamento.sql** - SQL puro para executar manualmente
3. **executar_migration.bat** - Script batch para Windows

## 🔍 Como verificar se a migration foi bem-sucedida?

Execute no terminal SQL:

```sql
-- Ver estrutura da tabela
\d faturamentos

-- Ver registros por tipo
SELECT tipo_pessoa, COUNT(*) 
FROM faturamentos 
GROUP BY tipo_pessoa;
```

## ⚠️ Observações Importantes

- **Valor padrão**: Todos os registros existentes receberão o valor `'PF'` automaticamente
- **Compatibilidade**: A migration é segura e não remove dados existentes
- **Índice**: Um índice foi criado para otimizar consultas que filtram por tipo_pessoa

## 🛠️ Solução de Problemas

### Erro: "client password must be a string"

Configure a senha do banco de dados:

1. Crie um arquivo `.env` na raiz do backend:
```env
DB_NAME=gerencie_db
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui
DB_HOST=localhost
DB_PORT=5432
```

2. Ou edite a senha padrão no script `adicionar_tipo_pessoa_migration.js`

### Erro: "type tipo_pessoa_enum already exists"

Isso é normal e significa que o tipo já foi criado anteriormente. A migration continua normalmente.

## 📊 Estrutura Final da Tabela

| Coluna           | Tipo                  | Nulo | Padrão        |
|------------------|-----------------------|------|---------------|
| id               | uuid                  | NO   | -             |
| descricao        | varchar               | NO   | -             |
| valor            | numeric(10,2)         | NO   | -             |
| data             | date                  | NO   | -             |
| forma_pagamento  | enum                  | NO   | -             |
| paciente         | varchar               | NO   | -             |
| observacoes      | text                  | YES  | -             |
| user_id          | uuid                  | NO   | -             |
| created_at       | timestamp             | NO   | -             |
| updated_at       | timestamp             | NO   | -             |
| **tipo_pessoa**  | **tipo_pessoa_enum**  | **NO** | **'PF'**    |

## 📝 Histórico

- **Data**: 13/11/2025
- **Versão**: 1.0.0
- **Autor**: Sistema Gerencie
- **Status**: ✅ Concluída com sucesso

## 🔗 Arquivos Relacionados

- Model: `backend/src/models/Faturamento.js`
- Controller: `backend/src/controllers/dashboardController.js`
- Frontend: `frontend/src/pages/usuario/Lancamentos.js`
