/**
 * Arquivo principal do servidor
 * Inicializa o servidor Express e configura middlewares básicos
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Carrega variáveis de ambiente
dotenv.config();

// Importa configuração do banco de dados
const { connectDB } = require('./config/database');

// Importa rotas
const asaasRoutes = require('./routes/asaas');
const authRoutes = require('./routes/authRoutes');
const despesasRoutes = require('./routes/despesasRoutes');
const faturamentoRoutes = require('./routes/faturamentoRoutes');
const analiseRoutes = require('./routes/analiseRoutes');
const dashboardRoutes = require('./routes/dashboard');
const lancamentosRoutes = require('./routes/lancamentosRoutes');
const chatRoutes = require('./routes/chat');
const chatbotRoutes = require('./routes/chatbotRoutes');
const adminRoutes = require('./routes/adminRoutes');
const operacionalRoutes = require('./routes/operacionalRoutes');
const pacienteRoutes = require('./routes/pacienteRoutes');
const procedimentoRoutes = require('./routes/procedimentoRoutes');
const planoContasRoutes = require('./routes/planoContasRoutes');
const clinicaRoutes = require('./routes/clinicaRoutes');
const agendamentosRoutes = require('./routes/agendamentos');
const pacientesApiRoutes = require('./routes/pacientes');
const procedimentosApiRoutes = require('./routes/procedimentos');
const usuarioRoutes = require('./routes/usuarioRoutes');
const orcamentoRoutes = require('./routes/orcamento');
const roboRoutes = require('./routes/roboRoutes');
const clinicaDashboardRoutes = require('./routes/clinicaDashboard');
const anamneseRoutes = require('./routes/anamneseRoutes');

// Inicializa o app Express
const webhookWhatsappRoutes = require('./routes/webhookWhatsapp');
const openRoutes = require('./routes/openRoutes');
const webhookOpenRoutes = require('./routes/webhookOpenRoutes');
const app = express();
// Webhook WhatsApp 100% aberto
app.use('/api/webhook-open-whatsapp', webhookOpenRoutes);
// Webhook Asaas 100% aberto (sem JWT)
const asaasWebhookRouter = require('express').Router();
const { Clinica: ClinicaWebhook } = require('./models');
app.post('/api/asaas/webhook', async (req, res) => {
  const { event, payment, subscription } = req.body;
  try {
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const customerId = payment?.customer;
      if (customerId) {
        const clinica = await ClinicaWebhook.findOne({ where: { asaasCustomerId: customerId } });
        if (clinica) {
          const vencimento = new Date();
          vencimento.setDate(vencimento.getDate() + 30);
          await clinica.update({ plano: 'PRO', dataVencimento: vencimento });
        }
      }
    }
    if (event === 'SUBSCRIPTION_DELETED' || event === 'SUBSCRIPTION_EXPIRED') {
      const subId = subscription?.id;
      if (subId) {
        const clinica = await ClinicaWebhook.findOne({ where: { asaasSubscriptionId: subId } });
        if (clinica) await clinica.update({ plano: 'FREE', asaasSubscriptionId: null });
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[WEBHOOK ASAAS]', err.message);
    res.status(500).json({ error: err.message });
  }
});
// Rotas 100% abertas, sem JWT
app.use('/api/open', openRoutes);
// Rota aberta para teste global
app.get('/api/teste-aberto', (req, res) => {
  res.send('Rota aberta funcionando!');
});

// Middlewares
// Permite CORS para localhost e produção por padrão, ou usa variável de ambiente CORS_ORIGIN
// Libera CORS apenas para o domínio do front-end em produção
const corsOptions = {
  origin: [
    'https://app.gerencieodonto.com.br',
    'http://localhost:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.path} | Origin: ${req.headers.origin || 'none'}`);
  next();
});
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Rota de debug para gerar token JWT pelo email (deve ser aberta)
// jwt e User já importados no topo do arquivo
app.get('/api/token/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }
    if (!user.ativo) {
      return res.status(403).json({ success: false, message: 'Usuário inativo' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro ao gerar token', error: err.message });
  }
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/despesas', despesasRoutes);
app.use('/api/faturamento', faturamentoRoutes);
app.use('/api/analise', analiseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', lancamentosRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/user', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/operacional', operacionalRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/procedimentos', procedimentoRoutes);
app.use('/api/plano-contas', planoContasRoutes);
app.use('/api/clinicas', clinicaRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/webhook-whatsapp', webhookWhatsappRoutes);
app.use('/api/orcamentos', orcamentoRoutes);
app.use('/api/robo', roboRoutes);
app.use('/api/clinica', clinicaDashboardRoutes);
app.use('/api/anamneses', anamneseRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/asaas', asaasRoutes);
const sugestaoRoutes = require('./routes/sugestaoRoutes');
app.use('/api/sugestoes', sugestaoRoutes);
const secretariaRoutes = require('./routes/secretariaRoutes');
app.use('/api/secretarias', secretariaRoutes);

// Rota de debug para gerar token JWT pelo email
const jwt = require('jsonwebtoken');
const { User } = require('./models');
app.get('/api/token/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }
    if (!user.ativo) {
      return res.status(403).json({ success: false, message: 'Usuário inativo' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro ao gerar token', error: err.message });
  }
});
// Middleware de autenticação
const { verificarToken } = require('./middleware/authMiddleware');

// Rota de teste protegida por JWT
app.get('/api/teste', (req, res) => {
  // Token pode ser enviado via query, body ou header
  const token = req.query.token || (req.headers.authorization?.split(' ')[1]) || req.body.token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token de autenticação não fornecido' });
  }
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ success: true, message: 'Autenticação bem-sucedida!', userId: decoded.userId });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token inválido', error: err.message });
  }
});
// (rota de status visual registrada abaixo, junto com os outros requires)

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Erro interno do servidor',
      status: err.status || 500
    }
  });
});

// ─── Página de status visual ─────────────────────────────────────────────────
const { sequelize } = require('./config/database');
const os = require('os');
const startTime = Date.now();

app.get('/', async (req, res) => {
  let dbOk = false;
  let dbLatency = 0;
  try {
    const t0 = Date.now();
    await sequelize.authenticate();
    dbLatency = Date.now() - t0;
    dbOk = true;
  } catch {}

  const uptime  = Math.floor((Date.now() - startTime) / 1000);
  const uptimeStr = uptime < 60 ? `${uptime}s`
    : uptime < 3600 ? `${Math.floor(uptime/60)}m ${uptime%60}s`
    : `${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m`;

  const memUsed = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const env     = process.env.NODE_ENV || 'development';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gerencie API — Status</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #0F172A;
      color: #E2E8F0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #1E293B;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 40px;
      max-width: 540px;
      width: 100%;
      box-shadow: 0 25px 60px rgba(0,0,0,0.5);
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 32px;
    }
    .logo-icon {
      width: 52px; height: 52px;
      background: linear-gradient(135deg, #F97316, #FB923C);
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px;
      box-shadow: 0 8px 24px rgba(249,115,22,0.4);
    }
    .logo h1 { font-size: 1.5rem; font-weight: 800; color: #F8FAFC; }
    .logo p  { font-size: 0.78rem; color: #64748B; margin-top: 2px; }

    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: #0F172A;
      border-radius: 12px;
      margin-bottom: 10px;
      border: 1px solid #1E293B;
    }
    .status-row:hover { border-color: #334155; }
    .status-label { font-size: 0.875rem; color: #94A3B8; font-weight: 500; display: flex; align-items: center; gap: 10px; }
    .status-label svg { opacity: 0.6; }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 999px;
      font-size: 0.78rem; font-weight: 700;
    }
    .badge.green { background: rgba(16,185,129,0.15); color: #10B981; border: 1px solid rgba(16,185,129,0.3); }
    .badge.red   { background: rgba(239,68,68,0.15);  color: #EF4444; border: 1px solid rgba(239,68,68,0.3); }
    .badge.amber { background: rgba(245,158,11,0.15); color: #F59E0B; border: 1px solid rgba(245,158,11,0.3); }
    .dot { width: 7px; height: 7px; border-radius: 50%; animation: pulse 2s infinite; }
    .dot.green { background: #10B981; box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
    .dot.red   { background: #EF4444; animation: none; }
    @keyframes pulse {
      0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
      70%  { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
      100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 10px;
    }
    .metric {
      background: #0F172A;
      border: 1px solid #1E293B;
      border-radius: 12px;
      padding: 14px 16px;
    }
    .metric-val { font-size: 1.3rem; font-weight: 800; color: #F8FAFC; }
    .metric-lbl { font-size: 0.72rem; color: #64748B; margin-top: 2px; font-weight: 500; }
    .footer {
      margin-top: 28px;
      text-align: center;
      font-size: 0.72rem;
      color: #334155;
    }
    .refresh-hint {
      margin-top: 20px;
      text-align: center;
      font-size: 0.75rem;
      color: #475569;
    }
  </style>
  <meta http-equiv="refresh" content="30" />
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">🦷</div>
      <div>
        <h1>Gerencie API</h1>
        <p>Painel de Status do Servidor</p>
      </div>
    </div>

    <div class="status-row">
      <span class="status-label">🚀 Servidor</span>
      <span class="badge green"><span class="dot green"></span> Online</span>
    </div>

    <div class="status-row">
      <span class="status-label">🗄️ Banco de Dados</span>
      <span class="badge ${dbOk ? 'green' : 'red'}">
        <span class="dot ${dbOk ? 'green' : 'red'}"></span>
        ${dbOk ? `Conectado (${dbLatency}ms)` : 'Falha na conexão'}
      </span>
    </div>

    <div class="status-row">
      <span class="status-label">🌐 Ambiente</span>
      <span class="badge ${env === 'production' ? 'green' : 'amber'}">${env}</span>
    </div>

    <div class="grid">
      <div class="metric">
        <div class="metric-val">${uptimeStr}</div>
        <div class="metric-lbl">⏱ Uptime</div>
      </div>
      <div class="metric">
        <div class="metric-val">${memUsed} MB</div>
        <div class="metric-lbl">💾 Memória RSS</div>
      </div>
      <div class="metric">
        <div class="metric-val">v${process.version.replace('v','')}</div>
        <div class="metric-lbl">⚙️ Node.js</div>
      </div>
      <div class="metric">
        <div class="metric-val">${process.env.PORT || 5000}</div>
        <div class="metric-lbl">🔌 Porta</div>
      </div>
    </div>

    <p class="refresh-hint">↻ Atualiza automaticamente a cada 30s</p>
    <p class="footer">Gerencie © ${new Date().getFullYear()} — Gestão Tributária para Dentistas</p>
  </div>
</body>
</html>`);
});

// ─── Inicia o servidor
const PORT = process.env.PORT || 5000;

// Conecta ao banco de dados e inicia o servidor
connectDB().then(async () => {
  // Migrações inline — adiciona colunas novas sem derrubar dados
  try {
    await sequelize.query(`ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS lancamento_feito TINYINT(1) NOT NULL DEFAULT 0`);
  } catch {}

  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`🚀 [v2] Backend atualizado — PIX + assinaturas recorrentes ativo`);
  });
});

module.exports = app;
