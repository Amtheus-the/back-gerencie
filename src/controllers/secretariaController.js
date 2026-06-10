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

// Lista secretarias criadas pelo dentista logado
exports.listar = async (req, res) => {
  try {
    const secretarias = await User.findAll({
      where: { criadoPorId: req.user.id, role: 'secretaria' },
      attributes: ['id', 'nome', 'email', 'ativo', 'permissoes', 'createdAt'],
    });
    
    // Garante que permissões são objetos, não strings JSON
    const secretariasFormatadas = secretarias.map(s => {
      const secretariaObj = s.toJSON();
      if (typeof secretariaObj.permissoes === 'string') {
        secretariaObj.permissoes = JSON.parse(secretariaObj.permissoes);
      }
      return secretariaObj;
    });
    
    res.json({ success: true, secretarias: secretariasFormatadas });
  } catch (err) {
    console.error('Erro ao listar secretarias:', err);
    res.status(500).json({ success: false, message: 'Erro ao listar secretarias' });
  }
};

// Cria uma nova secretaria
exports.criar = async (req, res) => {
  try {
    const { nome, email, senha, permissoes } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios' });
    }

    const jaExiste = await User.findOne({ where: { email } });
    if (jaExiste) {
      return res.status(400).json({ success: false, message: 'E-mail já cadastrado' });
    }

    // Busca o dentista para pegar clinicaId
    const dentista = await User.findByPk(req.user.id);

    const secretaria = await User.create({
      nome,
      email,
      senha,
      role: 'secretaria',
      permissoes: permissoes || PERMISSOES_PADRAO,
      criadoPorId: req.user.id,
      clinicaId: dentista.clinicaId,
      ativo: true,
    });

    res.status(201).json({
      success: true,
      secretaria: {
        id: secretaria.id,
        nome: secretaria.nome,
        email: secretaria.email,
        ativo: secretaria.ativo,
        permissoes: secretaria.permissoes,
      },
    });
  } catch (err) {
    console.error('Erro ao criar secretaria:', err);
    res.status(500).json({ success: false, message: 'Erro ao criar secretaria' });
  }
};

// Atualiza permissões e dados de uma secretaria
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, permissoes, ativo, senha } = req.body;

    const secretaria = await User.findOne({ where: { id, criadoPorId: req.user.id, role: 'secretaria' } });
    if (!secretaria) {
      return res.status(404).json({ success: false, message: 'Secretaria não encontrada' });
    }

    if (nome !== undefined) secretaria.nome = nome;
    if (permissoes !== undefined) secretaria.permissoes = permissoes;
    if (ativo !== undefined) secretaria.ativo = ativo;
    if (senha) secretaria.senha = senha;

    await secretaria.save();

    res.json({
      success: true,
      secretaria: {
        id: secretaria.id,
        nome: secretaria.nome,
        email: secretaria.email,
        ativo: secretaria.ativo,
        permissoes: secretaria.permissoes,
      },
    });
  } catch (err) {
    console.error('Erro ao atualizar secretaria:', err);
    res.status(500).json({ success: false, message: 'Erro ao atualizar secretaria' });
  }
};

// Remove uma secretaria
exports.remover = async (req, res) => {
  try {
    const { id } = req.params;
    const secretaria = await User.findOne({ where: { id, criadoPorId: req.user.id, role: 'secretaria' } });
    if (!secretaria) {
      return res.status(404).json({ success: false, message: 'Secretaria não encontrada' });
    }
    await secretaria.destroy();
    res.json({ success: true, message: 'Secretaria removida com sucesso' });
  } catch (err) {
    console.error('Erro ao remover secretaria:', err);
    res.status(500).json({ success: false, message: 'Erro ao remover secretaria' });
  }
};
