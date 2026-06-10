/**
 * Redefine a senha do usuário usando token de recuperação
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, token, senha } = req.body;
    console.log('🔵 [resetPassword] Requisição recebida:', { email, token });
    if (!email || !token || !senha) {
      return res.status(400).json({ success: false, message: 'Email, token e nova senha são obrigatórios.' });
    }

    // Busca usuário pelo e-mail
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('❌ [resetPassword] Usuário não encontrado:', email);
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    // Verifica se o token está correto e não expirou
    if (
      user.passwordResetToken !== token ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < Date.now()
    ) {
      console.log('❌ [resetPassword] Token inválido ou expirado');
      return res.status(400).json({ success: false, message: 'Token inválido ou expirado.' });
    }

    // Atualiza a senha e limpa o token
    user.senha = senha;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();
    console.log('✅ [resetPassword] Senha redefinida com sucesso:', user.email);
    return res.json({ success: true, message: 'Senha redefinida com sucesso!' });
  } catch (error) {
    console.error('❌ [resetPassword] Erro ao redefinir senha:', error);
    res.status(500).json({ success: false, message: 'Erro ao redefinir senha.', error: error.message });
  }
};
const crypto = require('crypto');
const { sendPasswordReset } = require('../services/emailService');
/**
 * Envia link de recuperação de senha para o e-mail do usuário
 */
exports.forgotPassword = async (req, res) => {
  try {
    console.log('🔵 [RecuperarSenha] Requisição recebida para:', req.body.email);
    const { email } = req.body;
    if (!email) {
      console.log('❌ [RecuperarSenha] E-mail não informado');
      return res.status(400).json({ success: false, message: 'E-mail é obrigatório.' });
    }

    // Busca usuário pelo e-mail
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('❌ [RecuperarSenha] Usuário não encontrado:', email);
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    // Gera token seguro para redefinição de senha
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hora
    await user.save();
    console.log('✅ [RecuperarSenha] Token gerado:', resetToken);

    // Monta link de recuperação (ajuste a URL conforme seu frontend)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    console.log('🔗 [RecuperarSenha] Link de recuperação:', resetLink);
    await sendPasswordReset(email, resetLink);
    console.log('✅ [RecuperarSenha] E-mail enviado para:', email);

  return res.status(200).json({ success: true, message: 'E-mail de recuperação enviado com sucesso.' });
  } catch (error) {
    console.error('❌ [Backend] Erro ao enviar recuperação de senha:', error);
    res.status(500).json({ success: false, message: 'Erro ao enviar recuperação de senha.', error: error.message });
  }
};
/**
 * Valida o token de e-mail e ativa o usuário
 */
exports.validateEmailToken = async (req, res) => {
  try {
    const { email, token } = req.body;
    console.log('🔵 [validateEmailToken] Requisição recebida:', { email, token });
    if (!email || !token) {
      console.log('❌ [validateEmailToken] Email ou token não informados');
      return res.status(400).json({ success: false, message: 'Email e token são obrigatórios.' });
    }

    // Busca usuário pelo e-mail
    const user = await User.findOne({ where: { email } });
    console.log('🔍 [validateEmailToken] Usuário encontrado:', user ? user.email : null);
    if (!user) {
      console.log('❌ [validateEmailToken] Usuário não encontrado:', email);
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    // Verifica se o token está correto e não expirou
    console.log('🔑 [validateEmailToken] Token recebido:', token);
    console.log('🔑 [validateEmailToken] Token salvo:', user.emailToken);
    console.log('⏰ [validateEmailToken] Expira em:', user.emailTokenExpires, 'Agora:', Date.now());
    if (
      user.emailToken !== token ||
      !user.emailTokenExpires ||
      user.emailTokenExpires < Date.now()
    ) {
      console.log('❌ [validateEmailToken] Token inválido ou expirado');
      return res.status(400).json({ success: false, message: 'Token inválido ou expirado.' });
    }

    // Ativa o usuário e limpa o token
    user.emailToken = null;
    user.emailTokenExpires = null;
    user.ativo = true;
    await user.save();
    console.log('✅ [validateEmailToken] Usuário ativado:', user.email);

    return res.json({ success: true, message: 'E-mail validado com sucesso!' });
  } catch (error) {
    console.error('❌ [Backend] Erro ao validar token de e-mail:', error);
    res.status(500).json({ success: false, message: 'Erro ao validar token.', error: error.message });
  }
};
/**
 * Controller de autenticação
 * Gerencia lógica de registro, login e autenticação
 */

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User, Clinica } = require('../models');
const { sendValidationToken } = require('../services/emailService');

/**
 * Registra um novo usuário
 */
exports.register = async (req, res) => {
  try {
    console.log('🔵 [Backend] POST /api/auth/register - Requisição recebida');
    console.log('📝 Dados recebidos:', req.body);
    
    // Valida dados de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [Backend] Erros de validação:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, email, senha, nomeClinica, tipoPessoa, cnpj } = req.body;

    // Validações
    if (!nome || !email || !senha || !tipoPessoa) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios não preenchidos'
      });
    }

    if ((tipoPessoa === 'PJ' || tipoPessoa === 'HIBRIDO') && !cnpj) {
      return res.status(400).json({
        success: false,
        message: 'CNPJ é obrigatório para Pessoa Jurídica ou Híbrido'
      });
    }

    // Verifica se usuário já existe
    const usuarioExiste = await User.findOne({ where: { email } });
    if (usuarioExiste) {
      console.log('❌ [Backend] Email já cadastrado');
      return res.status(400).json({
        success: false,
        message: 'Email já cadastrado'
      });
    }

    // Verifica se CNPJ já existe (se fornecido)
    if (cnpj) {
      const cnpjExiste = await Clinica.findOne({ where: { cnpj } });
      if (cnpjExiste) {
        console.log('❌ [Backend] CNPJ já cadastrado');
        return res.status(400).json({
          success: false,
          message: 'CNPJ já cadastrado'
        });
      }
    }

    console.log('✅ [Backend] Criando clínica...');
    console.log('📝 Dados da clínica:', {
      nome: nomeClinica || `Clínica ${nome}`,
      tipoPessoa,
      cnpj: cnpj || null
    });
    
    // Cria a clínica primeiro
    const clinica = await Clinica.create({
      nome: nomeClinica || `Clínica ${nome}`,
      tipoPessoa,
      cnpj: cnpj || null,
      telefone: req.body.telefoneClinica || null,
      plano: 'FREE', // Plano inicial gratuito
      limiteUsuarios: 3, // Limite inicial de 3 usuários
      ativo: true
    });

    console.log('✅ [Backend] Clínica criada:', clinica.nome);
    console.log('🆔 [Backend] Clínica ID:', clinica.id);
    console.log('✅ [Backend] Criando usuário...');
    console.log('📝 Dados do usuário:', {
      nome,
      email,
      nomeClinica: nomeClinica || nome,
      tipoPessoa,
      cnpj: cnpj || null,
      clinicaId: clinica.id
    });
    
    // Cria o usuário associado à clínica (senha será criptografada automaticamente pelo hook)
    const user = await User.create({
      nome,
      email,
      senha,
      nomeClinica: nomeClinica || nome,
      cnpj: cnpj || null,
      profissao: 'Dentista',
      primeiroAcesso: true, // Flag para exibir chatbot da Aline
      ativo: false, // Só ativa após validação do e-mail
      clinicaId: clinica.id // Associa o usuário à clínica
    });

    console.log('✅ [Backend] Usuário criado:', user.email);
    console.log('🆔 [Backend] User ID:', user.id);
    console.log('🏥 [Backend] User clinicaId:', user.clinicaId);

    // Gera token de validação de e-mail (6 dígitos)
      // Planos de contas padrão para cada novo usuário
      const { PlanoContas } = require('../models');
      const planosPadrao = [
        { nome: 'Aluguel do Consultório', dedutivel: true },
        { nome: 'Despesas com Material Odontológico', dedutivel: true },
        { nome: 'Salários e Encargos de Funcionários Registrados no CPF', dedutivel: true },
        { nome: 'Despesas com Manutenção de Equipamentos', dedutivel: true },
        { nome: 'Despesas com Telefonia e Internet', dedutivel: true },
        { nome: 'Despesas com Energia Elétrica', dedutivel: true },
        { nome: 'Despesas com Contabilidade', dedutivel: true },
        { nome: 'Despesas com Propaganda e Publicidade', dedutivel: true },
        { nome: 'Despesas com Produtos de Limpeza e Esterilização', dedutivel: true }
      ];
      for (const plano of planosPadrao) {
        await PlanoContas.create({
          codigo: Date.now().toString() + Math.floor(Math.random()*1000),
          nome: plano.nome,
          tipo: 'despesa',
          dedutivel: plano.dedutivel,
          ativo: true,
          userId: user.id
        });
      }
    const emailToken = Math.floor(100000 + Math.random() * 900000).toString();
    // Salva o token temporariamente no usuário (pode ser em campo separado ou tabela de tokens)
    user.emailToken = emailToken;
    user.emailTokenExpires = Date.now() + 15 * 60 * 1000; // expira em 15 min
    await user.save();

    // Envia o token por e-mail
    await sendValidationToken(user.email, emailToken);

    // Gera token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    console.log('✅ [Backend] Token gerado, enviando resposta...');

    res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso. Verifique seu e-mail para validar o cadastro.',
      token,
      // Inclui tipoPessoa da clínica no objeto do usuário para o frontend
      user: { ...user.toJSON(), tipoPessoa: clinica.tipoPessoa }
    });
    
    console.log('✅ [Backend] Cadastro realizado com sucesso!');
  } catch (error) {
    console.error('❌ [Backend] Erro no registro:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao registrar usuário',
      error: error.message
    });
  }
};

/**
 * Autentica usuário e retorna token
 */
exports.login = async (req, res) => {
  try {
    console.log('🔵 [Backend] POST /api/auth/login - Requisição recebida');
    console.log('📧 Email:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [Backend] Erros de validação:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, senha } = req.body;

    console.log('🔍 [Backend] Buscando usuário no banco...');
    
    // Busca usuário no banco
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log('❌ [Backend] Usuário não encontrado');
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    console.log('✅ [Backend] Usuário encontrado:', user.email);
    console.log('🔐 [Backend] Verificando senha...');
    
    // Verifica senha
    const senhaValida = await user.verificarSenha(senha);
    
    if (!senhaValida) {
      console.log('❌ [Backend] Senha incorreta');
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    console.log('✅ [Backend] Senha correta');
    
    // Verifica se usuário está ativo
    if (!user.ativo) {
      console.log('❌ [Backend] Usuário desativado');
      return res.status(401).json({
        success: false,
        message: 'Usuário desativado'
      });
    }

    console.log('✅ [Backend] Usuário ativo, gerando token...');
    
    // Gera token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    console.log('✅ [Backend] Token gerado, enviando resposta...');

    // Busca dados da clínica para incluir na resposta
    let clinicaData = { tipoPessoa: 'PF' };
    if (user.clinicaId) {
      const clinicaDoUser = await Clinica.findByPk(user.clinicaId, {
        attributes: ['tipoPessoa', 'plano', 'asaasCustomerId', 'asaasSubscriptionId', 'metodoPagamento', 'dataVencimento']
      });
      if (clinicaDoUser) {
        clinicaData = clinicaDoUser.toJSON();
      }
    }

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
      user: { ...user.toJSON(), tipoPessoa: clinicaData.tipoPessoa, clinica: clinicaData }
    });
    
    console.log('✅ [Backend] Resposta enviada com sucesso!');
  } catch (error) {
    console.error('❌ [Backend] Erro no login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao fazer login' 
    });
  }
};

/**
 * Retorna dados do usuário autenticado
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar dados do usuário' 
    });
  }
};

/**
 * Faz logout do usuário
 */
exports.logout = async (req, res) => {
  try {
    // TODO: Implementar blacklist de tokens se necessário
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao fazer logout' 
    });
  }
};
