
const express = require('express');
const router = express.Router();



// Webhook para status da mensagem do WhatsApp (sem autenticação)
router.post('/webhook-whatsapp/status_da_mensagem', async (req, res) => {
  try {
    console.log('[WHATSAPP][STATUS_DA_MENSAGEM] Body:', JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook para ao_enviar do WhatsApp (sem autenticação)
router.post('/webhook-whatsapp/ao_enviar', async (req, res) => {
  try {
    console.log('[WHATSAPP][AO_ENVIAR] Body:', JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook para receber mensagens do WhatsApp (sem autenticação)
router.post('/webhook-whatsapp', async (req, res) => {
  try {
    console.log('🔔 [Webhook] Content-Type:', req.headers['content-type']);
    let body = req.body;
    // Se o body vier como undefined, tenta parsear manualmente
    if (!body || Object.keys(body).length === 0) {
      let rawBody = '';
      await new Promise(resolve => {
        req.on('data', chunk => { rawBody += chunk; });
        req.on('end', resolve);
      });
      console.log('🔔 [Webhook] Body recebido como texto:', rawBody);
      try {
        body = JSON.parse(rawBody);
        console.log('🔔 [Webhook] Body convertido para JSON:', body);
      } catch (e) {
        console.log('❌ [Webhook] Falha ao converter body para JSON:', e.message);
        return res.status(400).json({ error: 'Body inválido, não é JSON.' });
      }
    } else {
      console.log('🔔 [Webhook] Body bruto:', body);
    }
    console.log('🔔 [Webhook] Dados recebidos:', body);

    // Ignora eventos de mensagens enviadas por nós mesmos (ex: confirmação de entrega)
    if (body.fromMe === true) {
      console.log('ℹ️ [Webhook] Ignorando evento fromMe=true');
      return res.json({ success: true, ignorado: 'mensagem enviada por nós mesmos' });
    }

    // Extrai telefone e resposta do usuário do objeto recebido
    let phone = null;
    let message = null;
    let buttonId = null;
    let agendamento_id = null;

    // Tenta extrair telefone do campo chat.id ou sender.id
    if (body.chat && body.chat.id) {
      phone = body.chat.id;
    } else if (body.sender && body.sender.id) {
      phone = body.sender.id;
    }

    // Resposta de clique em botão — cobre os dois formatos de botão da W-API:
    // "templateButtonReplyMessage" (endpoint de botões de ação) e
    // "buttonsResponseMessage" (endpoint send-button-list, usado na confirmação de agendamento)
    const tmplReply = body.msgContent?.templateButtonReplyMessage;
    const btnsReply = body.msgContent?.buttonsResponseMessage;
    if (tmplReply?.selectedDisplayText) {
      message = tmplReply.selectedDisplayText;
      buttonId = tmplReply.selectedId || null;
      agendamento_id = tmplReply.contextInfo?.agendamento_id || null;
    } else if (btnsReply?.selectedDisplayText || btnsReply?.selectedButtonId) {
      message = btnsReply.selectedDisplayText || null;
      buttonId = btnsReply.selectedButtonId || null;
    }

    // Se não veio de botão, tenta texto normal digitado
    if (!message && !buttonId) {
      message = body.msgContent?.conversation || body.msgContent?.extendedTextMessage?.text || body.message || null;
    }

    console.log('🔔 [Webhook] Dados extraídos:', { phone, message, buttonId, agendamento_id });
    if ((!phone && !agendamento_id) || (!message && !buttonId)) {
      console.log('❌ [Webhook] Dados insuficientes.');
      return res.status(400).json({ error: 'Dados insuficientes.' });
    }

    const { Agendamento, Paciente } = require('../models');
    let agendamento = null;
    const mensagem = message?.trim().toLowerCase() || '';

    if (agendamento_id) {
      agendamento = await Agendamento.findByPk(agendamento_id);
      console.log('🔍 [Webhook] Busca por agendamento_id:', agendamento_id, 'Resultado:', agendamento ? agendamento.toJSON() : null);
    } else if (phone) {
      let telefoneLimpo = phone.replace(/\D/g, '');
      // Remove DDI '55' se presente no início
      if (telefoneLimpo.startsWith('55') && telefoneLimpo.length > 11) {
        telefoneLimpo = telefoneLimpo.substring(2);
      }
      const paciente = await Paciente.findOne({ where: { telefone: telefoneLimpo } });
      console.log('🔍 [Webhook] Busca por telefone normalizado:', telefoneLimpo, 'Paciente:', paciente ? paciente.toJSON() : null);
      if (!paciente) {
        console.log('❌ [Webhook] Paciente não encontrado.');
        return res.status(404).json({ error: 'Paciente não encontrado.' });
      }
      agendamento = await Agendamento.findOne({
        where: {
          paciente_id: paciente.id,
          status: ['agendado', 'aguardando']
        },
        order: [['createdAt', 'DESC']]
      });
      console.log('🔍 [Webhook] Busca por agendamento do paciente:', paciente.id, 'Resultado:', agendamento ? agendamento.toJSON() : null);
    }
    if (!agendamento) {
      console.log('❌ [Webhook] Agendamento aguardando confirmação não encontrado.');
      return res.status(404).json({ error: 'Agendamento aguardando confirmação não encontrado.' });
    }

    // Se o status inicial for 'agendado', altere para 'aguardando' ao criar
    if (agendamento.status === 'agendado') {
      agendamento.status = 'aguardando';
      await agendamento.save();
      console.log('🟡 [Webhook] Status alterado para "aguardando"');
    }

    // Atualiza status conforme resposta (clique no botão tem prioridade sobre texto digitado)
    let novoStatus = agendamento.status;
    if (buttonId === 'confirmar' || mensagem === 'sim') {
      novoStatus = 'confirmado';
    } else if (buttonId === 'cancelar' || mensagem === 'não' || mensagem === 'nao') {
      novoStatus = 'cancelado';
    }
    if (novoStatus !== agendamento.status) {
      agendamento.status = novoStatus;
      await agendamento.save();
      console.log(`✅ [Webhook] Status alterado para "${novoStatus}"`);
    } else {
      console.log(`ℹ️ [Webhook] Status mantido: "${agendamento.status}"`);
    }

    res.json({ success: true });
  } catch (err) {
    console.log('❌ [Webhook] Erro:', err);
    res.status(500).json({ error: err.message });
  }
});

// Rota aberta para teste global
router.get('/teste-aberto', (req, res) => {
  res.send('Rota aberta funcionando!');
});

// Rota aberta de ping
router.get('/ping', (req, res) => {
  res.send('Ping aberto funcionando!');
});

// ─── Assinatura de documentos (sem login) ───────────────────────────────────

// Buscar documento pelo token (paciente abre o link)
router.get('/assinar/:token', async (req, res) => {
  try {
    const { DocumentoPaciente, Termo, Paciente } = require('../models');
    const doc = await DocumentoPaciente.findOne({
      where: { token: req.params.token },
      include: [
        { model: Termo, as: 'termo' },
        { model: Paciente, as: 'paciente', attributes: ['nome', 'cpfCnpj', 'telefone'] },
      ],
    });
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado ou link inválido.' });
    res.json({
      id: doc.id,
      status: doc.status,
      titulo: doc.termo.titulo,
      tipo: doc.termo.tipo,
      conteudo: doc.termo.conteudo,
      pacienteNome: doc.paciente.nome,
      pacienteCpf: doc.paciente.cpfCnpj,
      assinadoEm: doc.assinadoEm,
      nomeAssinante: doc.nomeAssinante,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Preenche os marcadores {{CAMPO: ...}} / {{SIMNAO: ...}} do conteúdo com as respostas do paciente,
// na mesma ordem em que aparecem no texto (respostas é um array ordenado).
function preencherRespostasNoConteudo(html, respostas) {
  let i = 0;
  return html.replace(/\{\{(CAMPO|SIMNAO):\s*([^}]+)\}\}/g, (match, tipo, label) => {
    const resp = respostas?.[i++];
    const valor = (resp?.valor || '').toString().trim();
    if (!valor) return '<em>(não respondido)</em>';
    const escapado = valor.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return tipo === 'SIMNAO' ? `<strong>${escapado}</strong>` : escapado;
  });
}

// Paciente assina o documento
router.post('/assinar/:token', async (req, res) => {
  try {
    const { DocumentoPaciente, Termo } = require('../models');
    const { nomeAssinante, cpfAssinante, aceito, respostas } = req.body;

    if (!aceito) return res.status(400).json({ error: 'Você precisa aceitar os termos para assinar.' });
    if (!nomeAssinante?.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });

    const doc = await DocumentoPaciente.findOne({ where: { token: req.params.token }, include: [{ model: Termo, as: 'termo' }] });
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
    if (doc.status === 'assinado') return res.status(400).json({ error: 'Documento já foi assinado.' });

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const temPerguntas = Array.isArray(respostas) && respostas.length > 0 && doc.termo;

    // Termo sem perguntas (responsabilidade "simples" enviado por este link): mantém o
    // comportamento antigo — consentimento registrado diretamente por nós, sem Autentique.
    if (!temPerguntas) {
      await doc.update({
        status: 'assinado',
        nomeAssinante: nomeAssinante.trim(),
        cpfAssinante: cpfAssinante?.trim() || null,
        ipAssinante: ip,
        assinadoEm: new Date(),
      });
      return res.json({ success: true, assinadoEm: doc.assinadoEm });
    }

    // Anamnese (ou qualquer termo com perguntas): agora que temos as respostas, geramos o
    // PDF final preenchido e só então criamos o documento na Autentique — a assinatura
    // oficial (com QR code de validação) acontece lá, então mandamos o paciente pra esse link.
    const { gerarPDF, criarDocumentoAutentique } = require('../controllers/termoController');
    const { s3, S3_BUCKET, S3_REGION } = require('../config/s3');

    const conteudoPreenchido = preencherRespostasNoConteudo(doc.termo.conteudo || '', respostas)
      .replace(/\{\{PACIENTE_NOME\}\}/g, nomeAssinante.trim())
      .replace(/\{\{PACIENTE_CPF\}\}/g, cpfAssinante?.trim() || '')
      .replace(/\{\{DATA\}\}/g, new Date().toLocaleDateString('pt-BR'));
    const pdfBuffer = await gerarPDF(conteudoPreenchido, doc.termo.titulo);

    const dadosAtualizacao = {
      respostas,
      nomeAssinante: nomeAssinante.trim(),
      cpfAssinante: cpfAssinante?.trim() || null,
      ipAssinante: ip,
    };

    try {
      const key = `anamneses/${doc.id}/preenchida-${Date.now()}.pdf`;
      await s3.upload({ Bucket: S3_BUCKET, Key: key, Body: pdfBuffer, ContentType: 'application/pdf' }).promise();
      dadosAtualizacao.pdfPreenchidoUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
    } catch (s3Err) {
      console.error('[Assinar] Erro ao salvar PDF preenchido no S3:', s3Err.message);
      // Não bloqueia o fluxo — o PDF preenchido é só uma cópia extra pra nós, a assinatura oficial é a da Autentique
    }

    let autentiqueLink = null;
    try {
      const docAutentique = await criarDocumentoAutentique(pdfBuffer, doc.termo.titulo, { nome: nomeAssinante.trim() });
      dadosAtualizacao.autentiqueId = docAutentique.id;
      autentiqueLink = docAutentique.signatures?.find(s => s.link?.short_link)?.link?.short_link || null;
    } catch (autErr) {
      console.error('[Assinar] Erro ao criar documento na Autentique:', autErr.message);
    }

    await doc.update(dadosAtualizacao);

    if (!autentiqueLink) {
      return res.status(500).json({ error: 'Respostas salvas, mas não foi possível gerar o link de assinatura oficial. Tente novamente em instantes.' });
    }

    res.json({ success: true, autentiqueLink });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Webhook Autentique — atualiza status quando documento é finalizado
router.post('/webhook-autentique', async (req, res) => {
  try {
    const { DocumentoPaciente } = require('../models');
    const body = req.body;
    const event = body.event || body.type;
    const document = body.document || body.data?.document || body.data;
    console.log('[Autentique Webhook] event:', event, '| doc id:', document?.id);
    console.log('[Autentique Webhook] body completo:', JSON.stringify(body, null, 2));

    if ((event === 'document.finished' || event === 'signature_accepted') && document?.id) {
      const sigPaciente = document.signatures?.find(s => s.name && (s.signed?.created_at || s.signed?.at));
      if (sigPaciente) {
        await DocumentoPaciente.update(
          {
            status: 'assinado',
            nomeAssinante: sigPaciente.name,
            assinadoEm: sigPaciente.signed?.created_at ? new Date(sigPaciente.signed.created_at) : new Date(),
          },
          { where: { autentiqueId: document.id } }
        );
        console.log('[Autentique Webhook] ✅ Status atualizado para assinado | doc:', document.id);
      } else {
        console.log('[Autentique Webhook] ⚠️ Evento recebido sem assinatura confirmada do paciente, ignorando | doc:', document.id);
      }
    }

    res.json({ received: true });
  } catch (e) {
    console.error('[Autentique Webhook] Erro:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
