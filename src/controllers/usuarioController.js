exports.buscarUsuarioPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const usuario = await User.findByPk(id);
    console.log('[buscarUsuarioPorId] Usuário retornado:', usuario);
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
  return res.json(usuario.toJSON());
  } catch (err) {
    console.error('[buscarUsuarioPorId] Erro:', err);
    return res.status(500).json({ error: 'Erro ao buscar usuário', details: err.message });
  }
};
const { User } = require('../models');

exports.atualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nome, cro, senha } = req.body;
  try {
    const usuario = await User.findByPk(id);
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (nome) usuario.nome = nome;
    if (cro) usuario.cro = cro;
    if (senha) usuario.senha = senha; // Se usar hash, aplique aqui

    await usuario.save();
    return res.json(usuario);
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    return res.status(500).json({ error: 'Erro ao atualizar usuário', details: err.message });
  }
};
