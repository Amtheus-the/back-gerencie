# Backend - Sistema Gerencie

API REST para sistema de gestão tributária voltado para dentistas, com análise de IA para recomendação de estrutura jurídica.

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
// ...
- **JWT** - Autenticação
- **OpenAI** - Análise tributária com IA

## 📦 Instalação

### Pré-requisitos

- Node.js 16+ instalado
//
- Conta na OpenAI com API Key

### Passo a Passo

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
copy .env.example .env

# 3. Editar o arquivo .env com suas credenciais:
//
#    - JWT_SECRET: uma chave secreta aleatória
#    - OPENAI_API_KEY: sua chave da OpenAI

# 4. Criar o banco de dados
npm run setup-db

# 5. Iniciar o servidor em modo desenvolvimento
npm run dev
```

O servidor estará disponível em `http://localhost:5000`

## 📚 Endpoints da API

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário autenticado
- `POST /api/auth/logout` - Logout

### Despesas
- `GET /api/despesas` - Listar despesas
- `POST /api/despesas` - Criar despesa
- `GET /api/despesas/:id` - Buscar despesa
- `PUT /api/despesas/:id` - Atualizar despesa
- `DELETE /api/despesas/:id` - Remover despesa

### Faturamento
- `GET /api/faturamento` - Listar faturamentos
- `POST /api/faturamento` - Criar faturamento
- `GET /api/faturamento/:id` - Buscar faturamento
- `PUT /api/faturamento/:id` - Atualizar faturamento
- `DELETE /api/faturamento/:id` - Remover faturamento

### Análise Tributária
- `POST /api/analise/tributaria` - Analisar e recomendar estrutura
- `GET /api/analise/historico` - Histórico de análises
- `GET /api/analise/relatorio` - Gerar relatório financeiro

## 🔐 Autenticação

Todas as rotas (exceto `/auth/register` e `/auth/login`) requerem autenticação via JWT.

Incluir o token no header:
```
Authorization: Bearer SEU_TOKEN_JWT
```

## 📝 Próximos Passos

- [ ] Implementar models do MongoDB (User, Despesa, Faturamento, Analise)
- [ ] Adicionar validações mais robustas
- [ ] Implementar testes unitários
- [ ] Adicionar logger (Winston)
- [ ] Implementar rate limiting
- [ ] Documentação com Swagger
