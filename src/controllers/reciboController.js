/**
 * Controller de Recibos Carnê Leão / Receita Saúde
 *
 * Fluxo:
 *  1. Admin vê os lançamentos PF de uma clínica na aba Carnê Leão
 *  2. Para cada lançamento, emite um recibo manualmente no eCAC / Receita Saúde
 *  3. Anexa o recibo direto no lançamento correspondente (upload por faturamento → S3)
 */

const { Faturamento } = require('../models');
const { s3, S3_BUCKET, getPresignedUrl, extractS3Key } = require('../config/s3');

/* ─────────────────────────────────────────────────────────────────────────
   Listar lançamentos PF de uma clínica (com info do recibo já anexado)
   GET /api/operacional/clinicas/:clinicaId/carne-leao
   ───────────────────────────────────────────────────────────────────────── */
exports.listarPF = async (req, res) => {
  try {
    const { clinicaId } = req.params;

    const faturamentos = await Faturamento.findAll({
      where: { clinicaId, tipoPessoa: 'PF' },
      attributes: [
        'id', 'descricao', 'valor', 'data',
        'paciente', 'cpf', 'formaPagamento',
        'reciboUrl', 'reciboNome', 'reciboTamanho'
      ],
      order: [['data', 'DESC']]
    });

    res.json({ faturamentos: faturamentos.map(f => f.toJSON()) });
  } catch (error) {
    console.error('Erro ao listar lançamentos PF:', error);
    res.status(500).json({ erro: 'Erro ao listar lançamentos PF', detalhes: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   Upload de recibo para um lançamento → S3
   POST /api/operacional/faturamentos/:id/recibo
   Body: multipart/form-data com campo "recibo"
   ───────────────────────────────────────────────────────────────────────── */
exports.uploadRecibo = async (req, res) => {
  try {
    const { id } = req.params;

    const faturamento = await Faturamento.findByPk(id);
    if (!faturamento) {
      return res.status(404).json({ erro: 'Lançamento não encontrado' });
    }
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
    }

    // Remover arquivo anterior do S3 se existir
    if (faturamento.reciboUrl) {
      const oldKey = extractS3Key(faturamento.reciboUrl);
      if (oldKey) {
        try { await s3.deleteObject({ Bucket: S3_BUCKET, Key: oldKey }).promise(); } catch {}
      }
    }

    // multer-s3 preenche req.file.location (URL pública) e req.file.key (S3 key)
    faturamento.reciboUrl     = req.file.location;
    faturamento.reciboNome    = req.file.originalname;
    faturamento.reciboTamanho = req.file.size;
    await faturamento.save();

    res.json({
      mensagem:      'Recibo anexado com sucesso',
      reciboNome:    faturamento.reciboNome,
      reciboTamanho: faturamento.reciboTamanho,
    });
  } catch (error) {
    console.error('Erro ao fazer upload do recibo:', error);
    res.status(500).json({ erro: 'Erro ao fazer upload do recibo', detalhes: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   Download do recibo — gera URL pré-assinada (15 min) e redireciona
   GET /api/operacional/faturamentos/:id/recibo
   ───────────────────────────────────────────────────────────────────────── */
exports.downloadRecibo = async (req, res) => {
  try {
    const { id } = req.params;

    const faturamento = await Faturamento.findByPk(id, {
      attributes: ['id', 'reciboUrl', 'reciboNome']
    });
    if (!faturamento || !faturamento.reciboUrl) {
      return res.status(404).json({ erro: 'Recibo não encontrado' });
    }

    const key = extractS3Key(faturamento.reciboUrl);
    if (!key) {
      return res.status(500).json({ erro: 'Caminho do arquivo inválido' });
    }

    const presignedUrl = getPresignedUrl(key, 900); // válida por 15 min
    res.json({ url: presignedUrl });
  } catch (error) {
    console.error('Erro ao gerar link do recibo:', error);
    res.status(500).json({ erro: 'Erro ao gerar link do recibo', detalhes: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   Remover recibo de um lançamento (apaga do S3 também)
   DELETE /api/operacional/faturamentos/:id/recibo
   ───────────────────────────────────────────────────────────────────────── */
exports.removerRecibo = async (req, res) => {
  try {
    const { id } = req.params;

    const faturamento = await Faturamento.findByPk(id);
    if (!faturamento) {
      return res.status(404).json({ erro: 'Lançamento não encontrado' });
    }

    if (faturamento.reciboUrl) {
      const key = extractS3Key(faturamento.reciboUrl);
      if (key) {
        try { await s3.deleteObject({ Bucket: S3_BUCKET, Key: key }).promise(); } catch {}
      }
    }

    faturamento.reciboUrl     = null;
    faturamento.reciboNome    = null;
    faturamento.reciboTamanho = null;
    await faturamento.save();

    res.json({ mensagem: 'Recibo removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover recibo:', error);
    res.status(500).json({ erro: 'Erro ao remover recibo', detalhes: error.message });
  }
};
