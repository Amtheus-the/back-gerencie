# Segurança e recuperação — Gerencie Odonto

## O que está no código
- HTTPS no app (redireciona http→https) e `helmet` na API (HSTS, nosniff, X-Frame-Options…).
- Senhas com bcrypt; bloqueio de conta por tentativas no login; limite de requisições por IP
  (geral 3.000 / 15 min; login, cadastro e recuperação de senha 60 / 15 min por IP). Webhooks, MCP e `/api/health` ficam fora do limite.
- Webhook do Asaas: confere o header `asaas-access-token` (quando `ASAAS_WEBHOOK_TOKEN` existe) **e** confirma
  pagamento/assinatura na API do Asaas antes de mudar o plano.
- Validação de entrada (`src/middleware/validacao.js`) em faturamento e despesas; `express-validator` no login/cadastro.
- Senha do eCAC gravada criptografada (AES-256-GCM, `ECAC_ENCRYPTION_KEY`). Sem a chave o sistema recusa gravar.
- Logs não gravam mais o corpo das requisições (senhas, CPF, dados de paciente).
- Migrations com rollback: `npm run migrate`, `npm run migrate:status`, `npm run migrate:down` (arquivos em `migrations/`).

## Monitoramento (a configurar no painel — o código já tem o endpoint)
1. Criar um monitor de uptime (UptimeRobot, Better Stack ou similar) em `GET https://<api>/api/health`
   — responde `200 {"status":"ok","db":"ok"}`; `503` quando o banco cai. Avisar por e-mail/WhatsApp.
2. (Opcional) Sentry no backend e frontend para erros em produção.

## Backups
- Confirmar no painel da Hostinger: backup automático do MySQL **ligado**, frequência e por quantos dias guarda.
- Fazer, no mínimo, um dump manual mensal e guardar **fora** da Hostinger:
  `mysqldump -h <host> -u <user> -p --single-transaction --routines u410205205_gerencie > gerencie_AAAA-MM-DD.sql`
- Testar a restauração em um banco vazio pelo menos a cada 3 meses (backup que nunca foi restaurado não é backup).

## Plano de recuperação (resumo)
| Situação | O que fazer |
|---|---|
| API fora do ar | Ver `/api/health`; painel da Hostinger → logs/reiniciar app; se foi deploy, voltar ao commit anterior (`git revert` + push). |
| Banco corrompido/dados apagados | Restaurar o backup mais recente (painel Hostinger ou dump manual) em um banco novo, conferir, e só então apontar o `.env`. |
| Migration deu errado | `npm run migrate:down` (desfaz a última). |
| Suspeita de vazamento (token/senha) | Trocar o segredo no serviço de origem (Asaas, Focus NFe, OpenAI, S3, JWT_SECRET), atualizar o `.env`, reiniciar. Trocar `JWT_SECRET` desloga todos. |
| Conta de cliente comprometida | Desativar o usuário (`ativo = 0`) e revogar conexões Claude em `api_tokens` (`revogado_em`). |

## Pendências conhecidas (não resolvidas em código)
- MFA (segundo fator) ainda não existe.
- Token de login fica no `localStorage` e não há revogação individual de sessão.
- `aws-sdk` v2 (fim de suporte) e `sequelize`→`uuid`: dependem de migração maior.
- O token antigo da Webmania (serviço já desativado, código removido) continua no histórico do git; se a conta ainda existir, **revogue o token ou apague a conta**.
