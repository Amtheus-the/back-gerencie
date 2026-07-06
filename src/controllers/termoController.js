const { Termo, DocumentoPaciente, Paciente, User } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const PDFDocument = require('pdfkit');

const AUTENTIQUE_TOKEN = process.env.AUTENTIQUE_TOKEN;
const AUTENTIQUE_URL = 'https://api.autentique.com.br/v2/graphql';
const AUTENTIQUE_SANDBOX = process.env.AUTENTIQUE_SANDBOX === 'true';

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '  • ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function gerarPDF(htmlContent, titulo) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.fontSize(14).font('Helvetica-Bold').text(titulo, { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).font('Helvetica').text(stripHtml(htmlContent), { align: 'justify', lineGap: 4 });
    doc.end();
  });
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
    document: { name: titulo },
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

    console.log('[Termo/enviar] AUTENTIQUE_TOKEN configurado:', !!AUTENTIQUE_TOKEN);
    console.log('[Termo/enviar] AUTENTIQUE_SANDBOX:', AUTENTIQUE_SANDBOX);

    if (!AUTENTIQUE_TOKEN) {
      return res.status(500).json({ error: 'Integração de assinatura digital não configurada. Adicione AUTENTIQUE_TOKEN nas variáveis de ambiente.' });
    }

    console.log('[Autentique] Gerando PDF do termo:', termo.titulo);
    const pdfBuffer = await gerarPDF(conteudo, termo.titulo);
    console.log('[Autentique] PDF gerado, tamanho:', pdfBuffer.length, 'bytes');

    console.log('[Autentique] Criando documento para paciente:', paciente.nome);
    const docAutentique = await criarDocumentoAutentique(pdfBuffer, termo.titulo, { nome: paciente.nome });
    autentiqueId = docAutentique.id;
    const sigPaciente = docAutentique.signatures?.find(s => s.link?.short_link);
    link = sigPaciente?.link?.short_link;
    console.log('[Autentique] Documento criado! ID:', autentiqueId);
    console.log('[Autentique] Link de assinatura:', link);
    console.log('[Autentique] Signatures:', JSON.stringify(docAutentique.signatures, null, 2));

    if (!link) {
      return res.status(500).json({ error: 'Autentique não retornou link de assinatura. Verifique o token e tente novamente.' });
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

// Sincronizar status e buscar link de download de um documento via Autentique
const sincronizarDocumento = async (req, res) => {
  try {
    console.log('[sincronizar] iniciando para doc:', req.params.id);
    const { id } = req.params;
    const { clinicaId } = req.user;
    const doc = await DocumentoPaciente.findOne({ where: { id, clinicaId } });
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });
    if (!doc.autentiqueId) return res.status(400).json({ error: 'Documento não vinculado à Autentique' });

    const query = `
      query ($id: UUID!) {
        document(id: $id) {
          id name
          signatures {
            public_id name email
            signed { created_at }
            link { short_link }
          }
          files { original signed }
        }
      }
    `;

    const resp = await axios.post(AUTENTIQUE_URL,
      { query, variables: { id: doc.autentiqueId } },
      { headers: { Authorization: `Bearer ${AUTENTIQUE_TOKEN}`, 'Content-Type': 'application/json' } }
    );

    if (resp.data.errors) {
      console.error('[Autentique sincronizar] Erro GraphQL:', JSON.stringify(resp.data.errors));
      throw new Error(resp.data.errors[0].message);
    }

    const docAut = resp.data.data.document;
    if (!docAut) return res.status(404).json({ error: 'Documento não encontrado na Autentique.' });

    const signatarios = docAut.signatures || [];
    // Ignora o slot do dono da conta (name: null) — ele nunca assina
    const signatariosReais = signatarios.filter(s => s.name !== null);
    const todasAssinadas = signatariosReais.length > 0 && signatariosReais.every(s => s.signed?.created_at);
    const algumaAssinada = signatariosReais.some(s => s.signed?.created_at);

    if (todasAssinadas && doc.status !== 'assinado') {
      const sigPac = signatariosReais.find(s => s.signed?.created_at);
      await doc.update({
        status: 'assinado',
        nomeAssinante: sigPac?.name || null,
        assinadoEm: sigPac?.signed?.created_at ? new Date(sigPac.signed.created_at) : new Date(),
      });
    }

    res.json({
      status: todasAssinadas ? 'assinado' : algumaAssinada ? 'parcial' : 'pendente',
      downloadUrl: docAut.files?.signed || docAut.files?.original || null,
      signatures: signatarios.map(s => ({
        name: s.name,
        email: s.email,
        signed: s.signed?.created_at || null,
        link: s.link?.short_link || null,
      })),
    });
  } catch (e) {
    console.error('[sincronizar] ERRO:', e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
};

module.exports = { listar, criar, atualizar, deletar, clonar, enviar, listarDocumentos, sincronizarDocumento };
