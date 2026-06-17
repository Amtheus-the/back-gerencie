let transporter = null;
try {
  const nodemailer = require('nodemailer');
  // Configuração do transporte SMTP (Gmail)
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Seu e-mail Gmail
      pass: process.env.EMAIL_PASS, // Senha ou App Password
    },
  });
} catch (err) {
  // Se nodemailer não estiver instalado, evita crash e registra aviso
  console.warn('⚠️  nodemailer não encontrado. Envio de e-mails desabilitado. Instale nodemailer para habilitar (npm install nodemailer)');
}

/**
 * Envia e-mail de validação com token
 * @param {string} to - E-mail de destino
 * @param {string} token - Token de validação (6 dígitos)
 */
async function sendValidationToken(to, token) {
  if (!transporter) {
    console.warn(`✉️  sendValidationToken: transporter ausente — não será enviado e-mail para ${to}`);
    return;
  }
  const mailOptions = {
    from: `Gerencie <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Validação de E-mail - Gerencie',
    html: `
      <div style="max-width:420px;margin:0 auto;padding:32px 24px;background:#f7fafd;border-radius:12px;font-family:sans-serif;border:1px solid #e3e8ee;">
        <div style="text-align:center;">
          <img src="https://gerencie.s3.amazonaws.com/gerencie_logo_nova.png" alt="Logo Gerencie" style="width:64px;margin-bottom:12px;"/>
          <h2 style="color:#1976d2;margin:0 0 8px 0;">Validação de E-mail</h2>
        </div>
        <p style="font-size:16px;color:#333;margin:24px 0 8px 0;text-align:center;">
          Olá! Para concluir seu cadastro, insira o código abaixo na tela de validação:
        </p>
        <div style="font-size:32px;letter-spacing:12px;font-weight:bold;color:#1976d2;text-align:center;margin:24px 0;">
          <span>${token}</span>
        </div>
        <p style="font-size:14px;color:#888;text-align:center;">
          Se você não solicitou este código, ignore este e-mail.
        </p>
        <div style="text-align:center;margin-top:24px;">
          <span style="font-size:13px;color:#bbb;">Equipe Gerencie</span>
        </div>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
}

/**
 * Envia e-mail de recuperação de senha
 * @param {string} to - E-mail de destino
 * @param {string} link - Link para redefinir senha
 */
async function sendPasswordReset(to, link) {
  if (!transporter) {
    console.warn(`✉️  sendPasswordReset: transporter ausente — não será enviado e-mail para ${to}`);
    return;
  }
  const mailOptions = {
    from: `Gerencie <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Recuperação de Senha - Gerencie',
    html: `<p>Para redefinir sua senha, clique no link abaixo:</p><p><a href="${link}">${link}</a></p>`
  };
  await transporter.sendMail(mailOptions);
}

// Admins que recebem notificação de novo lançamento
const ADMIN_EMAILS = [
  'joelma.visiontax@gmail.com',
  'vnataliavision@gmail.com',
  'andersonsilvafaustino04@gmail.com',
];

/**
 * Notifica admins quando um novo faturamento é criado
 */
async function notificarNovoFaturamento({ dentista, clinica, paciente, valor, data, tipoPessoa, formaPagamento }) {
  if (!transporter) return;

  const tipo = tipoPessoa === 'PF' ? '🟢 Recibo (PF)' : '🔵 Nota Fiscal (PJ)';
  const valorFmt = parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dataFmt = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');

  const html = `
    <div style="max-width:480px;margin:0 auto;padding:28px 24px;background:#f7fafd;border-radius:12px;font-family:sans-serif;border:1px solid #e3e8ee;">
      <div style="text-align:center;margin-bottom:20px;">
        <h2 style="color:#F97316;margin:0;">💰 Novo Lançamento</h2>
        <p style="color:#666;margin:4px 0 0 0;font-size:14px;">Gerencie Odonto</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:8px 0;color:#888;width:40%">Dentista</td><td style="padding:8px 0;font-weight:600;color:#222">${dentista}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Clínica</td><td style="padding:8px 0;color:#444">${clinica}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Paciente</td><td style="padding:8px 0;color:#444">${paciente}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Valor</td><td style="padding:8px 0;font-weight:700;color:#16a34a;font-size:17px">${valorFmt}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Data</td><td style="padding:8px 0;color:#444">${dataFmt}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Tipo</td><td style="padding:8px 0;color:#444">${tipo}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Pagamento</td><td style="padding:8px 0;color:#444">${formaPagamento}</td></tr>
      </table>
      <div style="text-align:center;margin-top:20px;">
        <span style="font-size:12px;color:#bbb;">Gerencie Odonto — notificação automática</span>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `Gerencie <${process.env.EMAIL_USER}>`,
    to: ADMIN_EMAILS.join(', '),
    subject: `💰 Novo lançamento — ${dentista} — ${valorFmt}`,
    html,
  }).catch(err => console.error('Erro ao enviar notificação de faturamento:', err.message));
}

module.exports = {
  sendValidationToken,
  sendPasswordReset,
  notificarNovoFaturamento,
};
