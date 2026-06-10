# Migração: Pacientes e Procedimentos

## Descrição

Esta migração adiciona duas novas tabelas ao banco de dados:

1. **pacientes** - Cadastro de pacientes para facilitar os lançamentos
2. **procedimentos** - Cadastro de procedimentos odontológicos

Além disso, adiciona colunas opcionais na tabela `faturamentos` para vincular lançamentos a pacientes e procedimentos cadastrados.

## O que será criado

### Tabela: pacientes
- Dados pessoais: nome, CPF/CNPJ, tipo pessoa (PF/PJ)
- Contato: email, telefone
- Endereço completo: CEP, logradouro, número, complemento, bairro, cidade, estado
- Observações e status (ativo/inativo)
- Vinculado ao usuário (user_id)

### Tabela: procedimentos
- Código (ex: TUSS)
- Nome e descrição
- Valor padrão sugerido
- Categoria (ex: Prevenção, Restauração, Endodontia)
- Observações e status (ativo/inativo)
- Vinculado ao usuário (user_id)

### Alterações em faturamentos
- Adiciona campo `paciente_id` (opcional)
- Adiciona campo `procedimento_id` (opcional)
- Mantém compatibilidade com lançamentos existentes (campos texto continuam funcionando)

## Como executar

### Método 1: Via pgAdmin (Recomendado)

1. Abra o **pgAdmin**
2. Conecte ao servidor PostgreSQL
3. Selecione o banco de dados `gerencie_db`
4. Clique com botão direito em `gerencie_db` → **Query Tool**
5. Abra o arquivo `MIGRAR_PACIENTES_PROCEDIMENTOS.sql`
6. Clique em **Execute/Run** (⚡ ou F5)
7. Verifique a mensagem: "Migração concluída com sucesso!"

### Método 2: Via linha de comando (psql)

```bash
psql -U postgres -d gerencie_db -f MIGRAR_PACIENTES_PROCEDIMENTOS.sql
```

Ou se estiver dentro do psql:

```sql
\i C:/Users/Vision Tax/OneDrive/Área de Trabalho/mvp_gerencie/backend/scripts/MIGRAR_PACIENTES_PROCEDIMENTOS.sql
```

## Verificação

Para confirmar que as tabelas foram criadas:

```sql
-- Listar tabelas
\dt

-- Ver estrutura da tabela pacientes
\d pacientes

-- Ver estrutura da tabela procedimentos
\d procedimentos

-- Verificar novas colunas em faturamentos
\d faturamentos
```

## Funcionalidades

### Pacientes
- Lista com busca por nome ou CPF/CNPJ
- Formulário completo com endereço
- Diferenciação entre Pessoa Física e Jurídica
- Status ativo/inativo

### Procedimentos
- Lista com busca por nome, código ou categoria
- Valor padrão sugerido (opcional)
- Categorização
- Status ativo/inativo

## Importante

⚠️ **Estas são telas auxiliares de cadastro**

- Elas NÃO aparecem no menu sidebar (por design)
- Servem para pré-cadastrar informações que facilitam os lançamentos
- Acesso direto via URL:
  - `/pacientes` - Cadastro de pacientes
  - `/procedimentos` - Cadastro de procedimentos

## Próximos passos

Após executar esta migração, você poderá:

1. Acessar `/pacientes` para cadastrar pacientes
2. Acessar `/procedimentos` para cadastrar procedimentos
3. Usar autocomplete na tela de Faturamento (implementação futura)
4. Melhorar a qualidade dos dados para emissão de notas fiscais

## Rollback (Desfazer)

Se precisar remover as alterações:

```sql
-- Remover colunas de faturamentos
ALTER TABLE faturamentos DROP COLUMN IF EXISTS paciente_id;
ALTER TABLE faturamentos DROP COLUMN IF EXISTS procedimento_id;

-- Remover tabelas
DROP TABLE IF EXISTS procedimentos CASCADE;
DROP TABLE IF EXISTS pacientes CASCADE;
```

## Suporte

Em caso de erro durante a migração:

1. Verifique se o PostgreSQL está rodando
2. Confirme que você está conectado ao banco correto (`gerencie_db`)
3. Verifique se o usuário tem permissões de criação de tabelas
4. Leia a mensagem de erro completa

---

📅 Data: 2024
🔧 Versão: 1.0.0
