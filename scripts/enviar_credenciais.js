require('dotenv').config();
process.env.EMAIL_USER = 'gerencieodonto@gmail.com';
process.env.EMAIL_PASS = 'xvmimwpjcsdtdyrr';

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const mailOptions = {
  from: '"Gerencie Odonto" <gerencieodonto@gmail.com>',
  to: 'dramaria.trz@gmail.com',
  subject: 'Seus dados de acesso — Gerencie Odonto',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #F97316;">Bem-vinda ao Gerencie Odonto!</h2>
      <p>Olá, <strong>Dra. Maria Tereza</strong>!</p>
      <p>Seu acesso foi criado com sucesso. Seguem seus dados de login:</p>
      <div style="background: #f9fafb; border-left: 4px solid #F97316; padding: 16px; border-radius: 4px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>🌐 Acesso:</strong> <a href="https://app.gerencieodonto.com.br">app.gerencieodonto.com.br</a></p>
        <p style="margin: 4px 0;"><strong>📧 E-mail:</strong> dramaria.trz@gmail.com</p>
        <p style="margin: 4px 0;"><strong>🔑 Senha:</strong> MTlips13@</p>
      </div>
      <p style="color: #6b7280; font-size: 13px;">Recomendamos que você altere sua senha após o primeiro acesso.</p>
      <p>Em caso de dúvidas, entre em contato com nosso suporte.</p>
      <p>Atenciosamente,<br><strong>Equipe Gerencie Odonto</strong></p>
    </div>
  `,
};

transporter.sendMail(mailOptions, (err, info) => {
  if (err) {
    console.error('Erro ao enviar:', err.message);
  } else {
    console.log('E-mail enviado com sucesso:', info.messageId);
  }
});
