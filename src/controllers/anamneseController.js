/**
 * Controller de Anamneses
 * CRUD para modelos de anamnese + respostas por paciente
 */

const { Anamnese, Paciente } = require('../models');

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

// Salva respostas preenchidas da anamnese para um paciente
const salvarRespostaPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const { anamneseId, anamneseTitulo, respostas } = req.body;
    const clinicaId = req.user.clinicaId;

    const paciente = await Paciente.findOne({ where: { id: pacienteId, clinica_id: clinicaId } });
    if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' });

    const payload = JSON.stringify({ anamneseId, anamneseTitulo, respostas, respondidoEm: new Date().toISOString() });
    await paciente.update({ anamneseData: payload, anamneseUpdatedAt: new Date() });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar anamnese', detail: error.message });
  }
};

// Busca respostas da anamnese de um paciente
const buscarRespostaPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const clinicaId = req.user.clinicaId;

    const paciente = await Paciente.findOne({
      where: { id: pacienteId, clinica_id: clinicaId },
      attributes: ['id', 'anamneseData', 'anamneseUpdatedAt']
    });
    if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' });

    let dados = null;
    if (paciente.anamneseData) {
      try { dados = typeof paciente.anamneseData === 'string' ? JSON.parse(paciente.anamneseData) : paciente.anamneseData; } catch {}
    }

    res.json({ dados, atualizadoEm: paciente.anamneseUpdatedAt });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar anamnese', detail: error.message });
  }
};

module.exports = {
  listarAnamneses,
  criarAnamnese,
  atualizarAnamnese,
  deletarAnamnese,
  salvarRespostaPaciente,
  buscarRespostaPaciente,
};
