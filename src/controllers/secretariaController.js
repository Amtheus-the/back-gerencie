const { User } = require('../models');

const PERMISSOES_PADRAO = {
  dashboard: false,
  faturamento: false,
  despesas: false,
  planoContas: false,
  lancamentos: false,
  relatorios: false,
  analise: false,
  agenda: true,
  pacientes: true,
  procedimentos: false,
  clinicaDashboard: false,
};

// Lista secretarias e dentistas parceiros criados pelo dentista logado
exports.listar = async (req, res) => {
  try {
    const usuarios = await User.findAll({
      where: { criadoPorId: req.user.id },
      attributes: ['id', 'nome', 'email', 'ativo', 'permissoes', 'role', 'cor', 'createdAt'],
    });

    const formatados = usuarios.map(u => {
      const obj = u.toJSON();
      if (typeof obj.permissoes === 'string') {
        obj.permissoes = JSON.parse(obj.permissoes);
      }
      return obj;
    });

    res.json({ success: true, secretarias: formatados });
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ success: false, message: 'Erro ao listar usuários' });
  }
};

// Cria secretaria ou dentista parceiro
exports.criar = async (req, res) => {
  try {
    const { nome, email, senha, permissoes, role, cor } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios' });
    }

    const tipoValido = ['secretaria', 'dentista_parceiro'].includes(role) ? role : 'secretaria';

    const jaExiste = await User.findOne({ where: { email } });
    if (jaExiste) {
      return res.status(400).json({ success: false, message: 'E-mail já cadastrado' });
    }

    const dentista = await User.findByPk(req.user.id);

    const usuario = await User.create({
      nome,
      email,
      senha,
      role: tipoValido,
      permissoes: permissoes || PERMISSOES_PADRAO,
      cor: cor || null,
      criadoPorId: req.user.id,
      clinicaId: dentista.clinicaId,
      ativo: true,
    });

    res.status(201).json({
      success: true,
      secretaria: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        ativo: usuario.ativo,
        permissoes: usuario.permissoes,
        role: usuario.role,
        cor: usuario.cor,
      },
    });
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ success: false, message: 'Erro ao criar usuário' });
  }
};

// Atualiza dados do usuário
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, permissoes, ativo, senha, cor } = req.body;

    const usuario = await User.findOne({ where: { id, criadoPorId: req.user.id } });
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    if (nome !== undefined) usuario.nome = nome;
    if (permissoes !== undefined) usuario.permissoes = permissoes;
    if (ativo !== undefined) usuario.ativo = ativo;
    if (senha) usuario.senha = senha;
    if (cor !== undefined) usuario.cor = cor;

    await usuario.save();

    res.json({
      success: true,
      secretaria: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        ativo: usuario.ativo,
        permissoes: usuario.permissoes,
        role: usuario.role,
        cor: usuario.cor,
      },
    });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ success: false, message: 'Erro ao atualizar usuário' });
  }
};

// Remove usuário
exports.remover = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await User.findOne({ where: { id, criadoPorId: req.user.id } });
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }
    await usuario.destroy();
    res.json({ success: true, message: 'Usuário removido com sucesso' });
  } catch (err) {
    console.error('Erro ao remover usuário:', err);
    res.status(500).json({ success: false, message: 'Erro ao remover usuário' });
  }
};
