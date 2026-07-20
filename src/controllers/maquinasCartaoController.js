/**
 * Controller de Máquinas de Cartão
 * Cadastro das maquininhas da clínica e suas taxas por parcela
 */

const { MaquinaCartao, TaxaMaquinaCartao } = require('../models');

// Lista as máquinas da clínica, com as taxas de cada uma
exports.listar = async (req, res) => {
  try {
    const { clinicaId } = req.user;
    const maquinas = await MaquinaCartao.findAll({
      where: { clinicaId },
      include: [{ model: TaxaMaquinaCartao, as: 'taxas' }],
      order: [['nome', 'ASC']],
    });
    res.json(maquinas);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Cria uma nova máquina
exports.criar = async (req, res) => {
  try {
    const { clinicaId } = req.user;
    const { nome } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: 'Informe o nome/apelido da máquina.' });

    const maquina = await MaquinaCartao.create({ clinicaId, nome: nome.trim() });
    res.status(201).json(maquina);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Atualiza nome/ativo de uma máquina
exports.atualizar = async (req, res) => {
  try {
    const { clinicaId } = req.user;
    const { id } = req.params;
    const { nome, ativo } = req.body;

    const maquina = await MaquinaCartao.findOne({ where: { id, clinicaId } });
    if (!maquina) return res.status(404).json({ error: 'Máquina não encontrada.' });

    await maquina.update({
      ...(nome !== undefined && { nome: nome.trim() }),
      ...(ativo !== undefined && { ativo }),
    });
    res.json(maquina);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Remove uma máquina (e suas taxas, em cascata)
exports.deletar = async (req, res) => {
  try {
    const { clinicaId } = req.user;
    const { id } = req.params;

    const maquina = await MaquinaCartao.findOne({ where: { id, clinicaId } });
    if (!maquina) return res.status(404).json({ error: 'Máquina não encontrada.' });

    await maquina.destroy();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Substitui a tabela de taxas por parcela de uma máquina
// Body: { taxas: [{ parcelas, taxaPercentual, taxaAntecipacaoPercentual }] }
exports.salvarTaxas = async (req, res) => {
  try {
    const { clinicaId } = req.user;
    const { id } = req.params;
    const { taxas } = req.body;

    const maquina = await MaquinaCartao.findOne({ where: { id, clinicaId } });
    if (!maquina) return res.status(404).json({ error: 'Máquina não encontrada.' });
    if (!Array.isArray(taxas)) return res.status(400).json({ error: 'Envie a lista de taxas por parcela.' });

    await TaxaMaquinaCartao.destroy({ where: { maquinaId: id } });
    const criadas = await TaxaMaquinaCartao.bulkCreate(
      taxas
        .filter(t => t.parcelas && t.taxaPercentual !== '' && t.taxaPercentual !== null && t.taxaPercentual !== undefined)
        .map(t => ({
          maquinaId: id,
          parcelas: t.parcelas,
          taxaPercentual: t.taxaPercentual,
          taxaAntecipacaoPercentual: t.taxaAntecipacaoPercentual || null,
        }))
    );

    res.json(criadas);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
