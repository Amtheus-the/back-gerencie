/**
 * Controller de Anamneses
 * CRUD para modelos de anamnese
 */

const { Anamnese } = require('../models');

const listarAnamneses = async (req, res) => {
  try {
    const { clinicaId } = req.user;
    const anamneses = await Anamnese.findAll({
      where: { clinicaId },
      order: [['updatedAt', 'DESC']]
    });
    res.json(anamneses);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar anamneses' });
  }
};

const criarAnamnese = async (req, res) => {
  try {
    const { clinicaId } = req.user;
    const { titulo, perguntas } = req.body;
    if (!titulo || !perguntas) {
      return res.status(400).json({ error: 'Título e perguntas são obrigatórios' });
    }
    const anamnese = await Anamnese.create({ clinicaId, titulo, perguntas });
    res.status(201).json(anamnese);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar anamnese' });
  }
};

const atualizarAnamnese = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, perguntas, ativo } = req.body;
    const anamnese = await Anamnese.findByPk(id);
    if (!anamnese) return res.status(404).json({ error: 'Anamnese não encontrada' });
    if (titulo) anamnese.titulo = titulo;
    if (perguntas) anamnese.perguntas = perguntas;
    if (ativo !== undefined) anamnese.ativo = ativo;
    await anamnese.save();
    res.json(anamnese);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar anamnese' });
  }
};

const deletarAnamnese = async (req, res) => {
  try {
    const { id } = req.params;
    const anamnese = await Anamnese.findByPk(id);
    if (!anamnese) return res.status(404).json({ error: 'Anamnese não encontrada' });
    await anamnese.destroy();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar anamnese' });
  }
};

module.exports = {
  listarAnamneses,
  criarAnamnese,
  atualizarAnamnese,
  deletarAnamnese
};
