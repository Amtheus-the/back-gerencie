const { Sugestao, User, Clinica } = require('../models');

/* ── Dentista cria sugestão ─────────────────────────────────────── */
exports.criar = async (req, res) => {
  try {
    const { titulo, descricao, categoria } = req.body;
    const userId    = req.user.id;
    const clinicaId = req.user.clinicaId || null;

    if (!titulo?.trim() || !descricao?.trim()) {
      return res.status(400).json({ success: false, message: 'Título e descrição são obrigatórios' });
    }

    const sugestao = await Sugestao.create({
      userId, clinicaId,
      titulo:    titulo.trim(),
      descricao: descricao.trim(),
      categoria: categoria || 'melhoria',
    });

    res.status(201).json({ success: true, data: sugestao });
  } catch (err) {
    console.error('Erro ao criar sugestão:', err);
    res.status(500).json({ success: false, message: 'Erro ao enviar sugestão' });
  }
};

/* ── Dentista lista suas sugestões ─────────────────────────────── */
exports.listarMinhas = async (req, res) => {
  try {
    const sugestoes = await Sugestao.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: sugestoes });
  } catch (err) {
    console.error('Erro ao listar sugestões:', err);
    res.status(500).json({ success: false, message: 'Erro ao listar sugestões' });
  }
};

/* ── Admin lista todas as sugestões ────────────────────────────── */
exports.listarTodas = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const sugestoes = await Sugestao.findAll({
      where,
      include: [
        { model: User,    as: 'usuario',  attributes: ['id', 'nome', 'email'] },
        { model: Clinica, as: 'clinica',  attributes: ['id', 'nome', 'tipoPessoa'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: sugestoes });
  } catch (err) {
    console.error('Erro ao listar sugestões admin:', err);
    res.status(500).json({ success: false, message: 'Erro ao listar sugestões' });
  }
};

/* ── Admin atualiza status / adiciona resposta ──────────────────── */
exports.atualizarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, respostaAdmin } = req.body;

    const sugestao = await Sugestao.findByPk(id);
    if (!sugestao) return res.status(404).json({ success: false, message: 'Sugestão não encontrada' });

    if (status)        sugestao.status        = status;
    if (respostaAdmin !== undefined) sugestao.respostaAdmin = respostaAdmin;

    await sugestao.save();
    res.json({ success: true, data: sugestao });
  } catch (err) {
    console.error('Erro ao atualizar sugestão:', err);
    res.status(500).json({ success: false, message: 'Erro ao atualizar sugestão' });
  }
};
