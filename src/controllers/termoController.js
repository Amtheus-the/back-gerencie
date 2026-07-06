const { Termo, DocumentoPaciente, Paciente, User } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const htmlPdf = require('html-pdf-node');

const AUTENTIQUE_TOKEN = process.env.AUTENTIQUE_TOKEN;
const AUTENTIQUE_URL = 'https://api.autentique.com.br/v2/graphql';
const AUTENTIQUE_SANDBOX = process.env.AUTENTIQUE_SANDBOX === 'true';

async function gerarPDF(htmlContent, titulo) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>body{font-family:Arial,sans-serif;padding:40px;font-size:14px;line-height:1.6}
    h2{font-size:16px}ul{margin-left:20px}</style></head>
    <body>${htmlContent}</body></html>`;
  const file = { content: html };
  const options = { format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' } };
  return htmlPdf.generatePdf(file, options);
}

async function criarDocumentoAutentique(pdfBuffer, titulo, signatario) {
  const form = new FormData();

  const query = `
    mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
      createDocument(document: $document, signers: $signers, file: $file) {
        id
        name
        signatures { public_id name email link { short_link } }
      }
    }
  `;

  const variables = {
    document: { name: titulo, sandbox: AUTENTIQUE_SANDBOX },
    signers: [{ name: signatario.nome, action: 'SIGN' }],
    file: null,
  };

  form.append('operations', JSON.stringify({ query, variables }));
  form.append('map', JSON.stringify({ file: ['variables.file'] }));
  form.append('file', pdfBuffer, { filename: `${titulo}.pdf`, contentType: 'application/pdf' });

  const resp = await axios.post(AUTENTIQUE_URL, form, {
    headers: { Authorization: `Bearer ${AUTENTIQUE_TOKEN}`, ...form.getHeaders() },
  });

  if (resp.data.errors) throw new Error(resp.data.errors[0].message);
  return resp.data.data.createDocument;
}

// Lista termos: padrões do sistema + os da clínica do usuário
const listar = async (req, res) => {
  try {
    const { clinicaId } = req.user;
    const termos = await Termo.findAll({
      where: {
        ativo: true,
        [Op.or]: [{ clinicaId: null }, { clinicaId }]
      },
      order: [['padrao', 'DESC'], ['tipo', 'ASC'], ['titulo', 'ASC']]
    });
    res.json(termos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const criar = async (req, res) => {
  try {
    const { clinicaId } = req.user;
    const { titulo, tipo, conteudo } = req.body;
    const termo = await Termo.create({ titulo, tipo, conteudo, clinicaId, padrao: false });
    res.status(201).json(termo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.user;
    const termo = await Termo.findOne({ where: { id, clinicaId } }); // só edita o próprio
    if (!termo) return res.status(404).json({ error: 'Termo não encontrado' });
    await termo.update(req.body);
    res.json(termo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.user;
    const termo = await Termo.findOne({ where: { id, clinicaId } });
    if (!termo) return res.status(404).json({ error: 'Termo não encontrado' });
    await termo.update({ ativo: false });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Clonar um termo padrão para a clínica poder editar
const clonar = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.user;
    const original = await Termo.findByPk(id);
    if (!original) return res.status(404).json({ error: 'Termo não encontrado' });
    const clone = await Termo.create({
      titulo: `${original.titulo} (cópia)`,
      tipo: original.tipo,
      conteudo: original.conteudo,
      clinicaId,
      padrao: false,
    });
    res.status(201).json(clone);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Enviar documento para paciente assinar
const enviar = async (req, res) => {
  try {
    const { clinicaId } = req.user;
    const { pacienteId, termoId, via } = req.body;

    const paciente = await Paciente.findOne({ where: { id: pacienteId, clinica_id: clinicaId } });
    if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' });

    const termo = await Termo.findByPk(termoId);
    if (!termo) return res.status(404).json({ error: 'Termo não encontrado' });

    // Substituir variáveis no conteúdo
    const conteudo = (termo.conteudo || '')
      .replace(/\{\{PACIENTE_NOME\}\}/g, paciente.nome || '')
      .replace(/\{\{PACIENTE_CPF\}\}/g, paciente.cpf || '')
      .replace(/\{\{DATA\}\}/g, new Date().toLocaleDateString('pt-BR'));

    const token = crypto.randomBytes(32).toString('hex');
    let link = null;
    let autentiqueId = null;

    // Integração Autentique se token configurado
    if (AUTENTIQUE_TOKEN) {
      try {
        console.log('[Autentique] Gerando PDF...');
        const pdfBuffer = await gerarPDF(conteudo, termo.titulo);
        console.log('[Autentique] Criando documento...');
        const docAutentique = await criarDocumentoAutentique(pdfBuffer, termo.titulo, { nome: paciente.nome });
        autentiqueId = docAutentique.id;
        link = docAutentique.signatures?.[0]?.link?.short_link;
        console.log('[Autentique] Documento criado:', autentiqueId, '| Link:', link);
      } catch (err) {
        console.error('[Autentique] Erro:', err.message);
        // fallback para link interno
      }
    }

    // Fallback: link interno do sistema
    if (!link) {
      const frontendUrl = process.env.FRONTEND_URL || 'https://app.gerencieodonto.com.br';
      link = `${frontendUrl}/assinar/${token}`;
    }

    const doc = await DocumentoPaciente.create({
      clinicaId, pacienteId, termoId, token,
      status: 'pendente',
      enviadoVia: via || 'link',
      ...(autentiqueId && { autentiqueId }),
    });

    // Enviar via WhatsApp se solicitado
    if (via === 'whatsapp' && paciente.telefone) {
      const telefone = `55${paciente.telefone.replace(/\D/g, '')}`;
      const mensagem = `Olá ${paciente.nome}! O(a) dentista enviou um documento para você assinar digitalmente.\n\nClique no link abaixo para acessar:\n${link}`;
      try {
        await axios.post(
          `https://api.w-api.app/v1/message/send-text?instanceId=${process.env.WAPI_INSTANCE_ID}`,
          { phone: telefone, message: mensagem, delayMessage: 2 },
          { headers: { Authorization: `Bearer ${process.env.WAPI_TOKEN}`, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('[Termo] Erro WhatsApp:', err.response?.data || err.message);
      }
    }

    res.json({ success: true, link, documentoId: doc.id, token, via_autentique: !!autentiqueId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Listar documentos enviados para pacientes
const listarDocumentos = async (req, res) => {
  try {
    const { clinicaId } = req.user;
    const { pacienteId } = req.query;
    const where = { clinicaId };
    if (pacienteId) where.pacienteId = pacienteId;
    const docs = await DocumentoPaciente.findAll({
      where,
      include: [
        { model: Termo, as: 'termo', attributes: ['titulo', 'tipo'] },
        { model: Paciente, as: 'paciente', attributes: ['nome', 'telefone'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(docs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { listar, criar, atualizar, deletar, clonar, enviar, listarDocumentos };
