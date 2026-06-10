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

module.exports = {
  sendValidationToken,
  sendPasswordReset,
};
