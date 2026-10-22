const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { Orcamento, Agendamento, Paciente, Faturamento, Clinica, Procedimento } = require('../models');
const { verificarToken } = require('../middleware/authMiddleware');
const { calcularDetalhes, descreverPagamento, resumoDentes } = require('../services/orcamentoCalculo');

router.use(verificarToken);

// procedimentos/valores podem voltar como string (driver não decodifica JSON
// automaticamente quando a coluna não é nativamente JSON) — normaliza sempre.
function parseJsonSeNecessario(valor, fallback) {
  if (typeof valor !== 'string') return valor ?? fallback;
  try { return JSON.parse(valor); } catch { return fallback; }
}

function normalizarOrcamento(orcamento) {
  const json = orcamento.toJSON ? orcamento.toJSON() : orcamento;
  return {
    ...json,
    procedimentos: parseJsonSeNecessario(json.procedimentos, []),
    valores: parseJsonSeNecessario(json.valores, {}),
    detalhes: parseJsonSeNecessario(json.detalhes, null),
  };
}

// Orçamento sempre dentro da clínica de quem está logado (id de outra clínica = não encontrado)
const buscarOrcamentoDaClinica = (id, req) => Orcamento.findOne({ where: { id, clinica_id: req.user.clinicaId } });

// Se vier `detalhes` (orçamento detalhado), o servidor recalcula procedimentos/valores/total
// e confere que todos os procedimentos são da clínica.
async function aplicarDetalhes(detalhes, clinicaId) {
  const calc = calcularDetalhes(detalhes);
  const encontrados = await Procedimento.count({ where: { id: calc.procedimentos, clinicaId } });
  if (encontrados !== calc.procedimentos.length) {
    const e = new Error('Um dos procedimentos do orçamento não existe mais. Atualize a página e tente de novo.'); e.status = 400; throw e;
  }
  return calc;
}

// Soma os valores negociados no orçamento (campo JSON { procedimentoId: valor })
function calcularValorTotal(orcamento) {
  const valores = orcamento.valores || {};
  return Object.values(valores).reduce((soma, v) => soma + (parseFloat(v) || 0), 0);
}

// Anexa valorTotal / valorPago / saldoAberto a um orçamento, somando os faturamentos vinculados
async function comSaldo(orcamento) {
  const json = normalizarOrcamento(orcamento);
  const valorTotal = calcularValorTotal(json);
  const faturamentos = await Faturamento.findAll({
    where: { orcamentoId: json.id },
    attributes: ['id', 'valor', 'data', 'formaPagamento', 'createdAt'],
    order: [['createdAt', 'ASC']],
  });
  const valorPago = faturamentos.reduce((soma, f) => soma + parseFloat(f.valor), 0);
  // Consulta marcada a partir deste orçamento (se já agendou) — pega a mais recente
  const agendamento = await Agendamento.findOne({
    where: { orcamento_id: json.id },
    attributes: ['id', 'data_hora', 'status'],
    order: [['data_hora', 'DESC']],
  });
  return {
    ...json,
    valorTotal,
    valorPago,
    saldoAberto: Math.max(0, Math.round((valorTotal - valorPago) * 100) / 100),
    pagamentos: faturamentos,
    agendamento: agendamento ? agendamento.toJSON() : null,
  };
}

// Criar (ou atualizar, se já existir um orçamento pra esse agendamento) orçamento
router.post('/', async (req, res) => {
  try {
    let { agendamento_id, paciente_id, status, procedimentos, valores, observacoes, detalhes } = req.body;
    // Buscar clinica_id do agendamento
    let clinica_id = null;
    if (agendamento_id) {
      const agendamento = await Agendamento.findByPk(agendamento_id);
      clinica_id = agendamento?.clinica_id || null;
    }
    if (!clinica_id) clinica_id = req.user.clinicaId || null;
    if (!clinica_id) {
      return res.status(400).json({ error: 'Não foi possível determinar a clínica do orçamento.' });
    }

    // O paciente precisa ser da clínica de quem está salvando
    const pacienteDaClinica = await Paciente.count({ where: { id: paciente_id, clinica_id } });
    if (!pacienteDaClinica) return res.status(404).json({ error: 'Paciente não encontrado.' });

    if (detalhes) {
      const calc = await aplicarDetalhes(detalhes, clinica_id);
      procedimentos = calc.procedimentos; valores = calc.valores; detalhes = calc.detalhes;
    }

    // Já existe um orçamento pra esse agendamento? Atualiza em vez de criar
    // outro — sem isso, cada "Salvar" gerava uma linha nova e a tela podia
    // reabrir mostrando uma versão antiga/vazia por acaso.
    let orcamento = agendamento_id
      ? await Orcamento.findOne({ where: { agendamento_id } })
      : null;

    if (orcamento) {
      await orcamento.update({ status, procedimentos, valores, observacoes, ...(detalhes && { detalhes }) });
    } else {
      orcamento = await Orcamento.create({
        agendamento_id,
        paciente_id,
        clinica_id,
        status,
        procedimentos,
        valores,
        observacoes,
        detalhes: detalhes || null
      });
    }
    res.status(201).json(await comSaldo(orcamento));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    console.error('[ORCAMENTO] Erro ao inserir:', err);
    res.status(500).json({ error: err.message });
  }
});

// Buscar orçamento por agendamento (com saldo já calculado)
router.get('/agendamento/:agendamento_id', async (req, res) => {
  try {
    const { agendamento_id } = req.params;
    const orcamento = await Orcamento.findOne({ where: { agendamento_id }, order: [['createdAt', 'DESC']] });
    if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado' });
    res.json(await comSaldo(orcamento));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar orçamentos de um paciente (com saldo em aberto de cada um) — usado na ficha do paciente
router.get('/paciente/:paciente_id', async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const orcamentos = await Orcamento.findAll({
      where: { paciente_id, clinica_id: req.user.clinicaId },
      order: [['createdAt', 'DESC']],
    });
    const comSaldos = await Promise.all(orcamentos.map(comSaldo));
    res.json(comSaldos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar um orçamento específico por id (com saldo)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orcamento = await buscarOrcamentoDaClinica(id, req);
    if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado' });
    res.json(await comSaldo(orcamento));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excluir orçamento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orcamento = await buscarOrcamentoDaClinica(id, req);
    if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado' });
    await orcamento.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar orçamento (status e, opcionalmente, procedimentos/valores/observações —
// usado tanto pra só mudar o status quanto pra editar um orçamento inteiro, ex: na
// ficha do paciente, onde não há agendamento pra decidir se cria ou atualiza)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let { status, procedimentos, valores, observacoes, detalhes } = req.body;
    const orcamento = await buscarOrcamentoDaClinica(id, req);
    if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado' });
    if (detalhes) {
      const calc = await aplicarDetalhes(detalhes, orcamento.clinica_id);
      procedimentos = calc.procedimentos; valores = calc.valores; detalhes = calc.detalhes;
    }
    const campos = {};
    if (status !== undefined) campos.status = status;
    if (procedimentos !== undefined) campos.procedimentos = procedimentos;
    if (valores !== undefined) campos.valores = valores;
    if (observacoes !== undefined) campos.observacoes = observacoes;
    if (detalhes) campos.detalhes = detalhes;
    await orcamento.update(campos);
    res.json(await comSaldo(orcamento));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

function bufferFromDataUri(dataUri) {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return null;
  const base64 = dataUri.split(',')[1];
  if (!base64) return null;
  try { return Buffer.from(base64, 'base64'); } catch { return null; }
}

function fmtBRL(v) {
  return `R$ ${(parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// PDF minimalista, no estilo "plano de tratamento" que a clínica já usava no
// sistema anterior — só texto simples e uma tabela, sem elementos decorativos.
function montarPdfOrcamento({ orcamento, clinica, paciente, procedimentosMap, dentistaNome }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const largura = doc.page.width;
    const margem = 40;
    const larguraUtil = largura - margem * 2;
    const logoBuffer = bufferFromDataUri(clinica?.logo);
    const textoX = logoBuffer ? margem + 100 : margem;

    if (logoBuffer) {
      try { doc.image(logoBuffer, margem, margem, { fit: [80, 80] }); } catch { /* logo inválida, ignora */ }
    }

    doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827')
      .text(clinica?.nome || 'Clínica', textoX, margem, { width: larguraUtil - (textoX - margem) });

    doc.font('Helvetica').fontSize(10).fillColor('#374151');
    const endereco = [clinica?.endereco, clinica?.numero ? `nº ${clinica.numero}` : null].filter(Boolean).join(', ');
    const bairroCidade = [clinica?.bairro, [clinica?.cidade, clinica?.estado].filter(Boolean).join(' - ')].filter(Boolean).join(', ');
    if (endereco) doc.text(endereco, textoX, doc.y);
    if (bairroCidade) doc.text(bairroCidade, textoX, doc.y);
    const telefones = [clinica?.telefone, clinica?.telefoneSecundario].filter(Boolean).join(' / ');
    if (telefones) doc.font('Helvetica-Bold').fontSize(10).text(telefones, textoX, doc.y);

    doc.y = Math.max(doc.y, margem + (logoBuffer ? 90 : 0)) + 25;
    doc.x = margem;

    doc.font('Helvetica').fontSize(22).fillColor('#111827').text('Plano de Tratamento', margem, doc.y);
    doc.moveDown(1.2);

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text('Paciente: ', margem, doc.y, { continued: true });
    doc.font('Helvetica').text(paciente?.nome || '');
    if (paciente?.cpfCnpj) {
      doc.font('Helvetica-Bold').text('CPF: ', margem, doc.y, { continued: true });
      doc.font('Helvetica').text(paciente.cpfCnpj);
    }
    doc.moveDown(1);

    const detalhes = orcamento.detalhes && Array.isArray(orcamento.detalhes.itens) ? orcamento.detalhes : null;
    const rodapeY = doc.page.height - 150;
    const novaPaginaSePreciso = (altura) => { if (doc.y + altura > rodapeY) { doc.addPage(); doc.x = margem; doc.y = margem; } };

    if (detalhes) {
      // ── Orçamento detalhado: procedimento (com dentes) | qtd | valor unitário | subtotal ──
      const colQtdX = margem + larguraUtil * 0.52;
      const colUnitX = margem + larguraUtil * 0.60;
      const colSubX = margem + larguraUtil * 0.80;
      const wDesc = colQtdX - margem - 16;
      const cabecalho = () => {
        const y = doc.y;
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280');
        doc.text('PROCEDIMENTO', margem + 6, y, { width: wDesc });
        doc.text('QTD', colQtdX, y, { width: 36, align: 'center' });
        doc.text('VALOR UNIT.', colUnitX, y, { width: colSubX - colUnitX - 8, align: 'right' });
        doc.text('SUBTOTAL', colSubX, y, { width: margem + larguraUtil - colSubX - 6, align: 'right' });
        doc.moveTo(margem, y + 14).lineTo(margem + larguraUtil, y + 14).strokeColor('#d1d5db').stroke();
        doc.y = y + 20; doc.x = margem;
      };
      cabecalho();

      detalhes.itens.forEach((it) => {
        const nome = procedimentosMap[it.procedimentoId]?.nome || it.nome || 'Procedimento';
        const dentes = it.cobranca === 'dente' && it.dentes?.length ? resumoDentes(it.dentes) : '';
        doc.font('Helvetica-Bold').fontSize(10);
        const hNome = doc.heightOfString(nome, { width: wDesc });
        doc.font('Helvetica').fontSize(8.5);
        const hDentes = dentes ? doc.heightOfString(dentes, { width: wDesc }) + 2 : 0;
        const altura = Math.max(hNome + hDentes + 14, 30);
        if (doc.y + altura > rodapeY) { doc.addPage(); doc.x = margem; doc.y = margem; cabecalho(); }
        const y = doc.y;
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(nome, margem + 6, y + 7, { width: wDesc });
        if (dentes) doc.font('Helvetica').fontSize(8.5).fillColor('#6b7280').text(dentes, margem + 6, y + 7 + hNome + 2, { width: wDesc });
        doc.font('Helvetica').fontSize(10).fillColor('#1f2937');
        doc.text(String(it.quantidade || 1), colQtdX, y + 7, { width: 36, align: 'center' });
        doc.text(fmtBRL(it.valorUnitario), colUnitX, y + 7, { width: colSubX - colUnitX - 8, align: 'right' });
        doc.font('Helvetica-Bold').text(fmtBRL(it.subtotal), colSubX, y + 7, { width: margem + larguraUtil - colSubX - 6, align: 'right' });
        doc.moveTo(margem, y + altura).lineTo(margem + larguraUtil, y + altura).strokeColor('#eef0f3').stroke();
        doc.y = y + altura + 2; doc.x = margem;
      });

      // totais
      novaPaginaSePreciso(150);
      doc.moveDown(0.8);
      const xRot = margem + larguraUtil * 0.55;
      const wRot = larguraUtil * 0.25;
      const wVal = margem + larguraUtil - (xRot + wRot) - 6;
      const linhaTotal = (rotulo, valor, opcoes = {}) => {
        const y = doc.y;
        doc.font(opcoes.negrito ? 'Helvetica-Bold' : 'Helvetica').fontSize(opcoes.tamanho || 10).fillColor(opcoes.cor || '#374151');
        doc.text(rotulo, xRot, y, { width: wRot, align: 'right' });
        doc.text(valor, xRot + wRot, y, { width: wVal, align: 'right' });
        doc.y = y + (opcoes.tamanho || 10) + 7; doc.x = margem;
      };
      linhaTotal('Subtotal', fmtBRL(detalhes.subtotal));
      if (detalhes.desconto?.emReais > 0) {
        const pct = detalhes.desconto.tipo === 'percentual' ? ` (${String(detalhes.desconto.valor).replace('.', ',')}%)` : '';
        linhaTotal(`Desconto${pct}`, `- ${fmtBRL(detalhes.desconto.emReais)}`, { cor: '#dc2626' });
      }
      doc.moveTo(xRot, doc.y).lineTo(margem + larguraUtil, doc.y).strokeColor('#d1d5db').stroke();
      doc.y += 6;
      linhaTotal('TOTAL', fmtBRL(detalhes.total), { negrito: true, tamanho: 13, cor: '#111827' });

      // condições de pagamento e validade
      doc.moveDown(0.8);
      novaPaginaSePreciso(90);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text('Condições de pagamento', margem, doc.y);
      doc.font('Helvetica').fontSize(10).fillColor('#374151').text(descreverPagamento(detalhes), margem, doc.y + 2, { width: larguraUtil });
      if (detalhes.validadeDias) {
        const base = orcamento.createdAt ? new Date(orcamento.createdAt) : new Date();
        const ate = new Date(base.getTime() + detalhes.validadeDias * 86400000);
        doc.moveDown(0.6);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text('Validade: ', margem, doc.y, { continued: true });
        doc.font('Helvetica').fillColor('#374151').text(`${detalhes.validadeDias} dias (até ${ate.toLocaleDateString('pt-BR')})`);
      }
      if (orcamento.observacoes) {
        doc.moveDown(0.6);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text('Observações', margem, doc.y);
        doc.font('Helvetica').fontSize(10).fillColor('#374151').text(orcamento.observacoes, margem, doc.y + 2, { width: larguraUtil });
      }
    } else {
      // ── Orçamento antigo (só procedimento + valor) ──
      const colValorX = margem + larguraUtil - 100;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827');
      doc.text('Procedimento', margem, doc.y);
      doc.text('Total', colValorX, doc.y - doc.currentLineHeight(), { width: 100, align: 'right' });
      doc.moveDown(0.8);

      const itens = (orcamento.procedimentos || []).map(id => ({
        nome: procedimentosMap[id]?.nome || 'Procedimento',
        valor: orcamento.valores?.[id] || 0,
      }));

      itens.forEach(item => {
        const y = doc.y;
        const altura = 30;
        doc.roundedRect(margem, y, larguraUtil, altura, 4).strokeColor('#d1d5db').stroke();
        doc.font('Helvetica').fontSize(10).fillColor('#1f2937')
          .text(item.nome, margem + 12, y + 10, { width: colValorX - margem - 24 });
        doc.text(fmtBRL(item.valor), colValorX, y + 10, { width: 100, align: 'right' });
        doc.y = y + altura + 8;
        doc.x = margem;
      });

      doc.moveDown(0.5);
      const valorTotal = itens.reduce((s, i) => s + (parseFloat(i.valor) || 0), 0);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827')
        .text(`Valor Total: ${fmtBRL(valorTotal)}`, margem, doc.y, { width: larguraUtil, align: 'right' });
    }

    // Assinaturas
    if (doc.y + 60 > doc.page.height - 100) { doc.addPage(); doc.y = margem; }
    const yAssinatura = Math.max(doc.y + 60, doc.page.height - 130);
    const largColuna = (larguraUtil - 40) / 2;
    doc.moveTo(margem, yAssinatura).lineTo(margem + largColuna, yAssinatura).strokeColor('#9ca3af').stroke();
    doc.moveTo(margem + largColuna + 40, yAssinatura).lineTo(margem + largColuna * 2 + 40, yAssinatura).strokeColor('#9ca3af').stroke();
    doc.font('Helvetica').fontSize(10).fillColor('#374151');
    doc.text(paciente?.nome || '', margem, yAssinatura + 8, { width: largColuna, align: 'center' });
    doc.text(orcamento.detalhes?.profissional || dentistaNome || '', margem + largColuna + 40, yAssinatura + 8, { width: largColuna, align: 'center' });

    doc.end();
  });
}

// Gera o PDF do orçamento (plano de tratamento) pra baixar/enviar ao paciente
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const orcamentoRaw = await buscarOrcamentoDaClinica(id, req);
    if (!orcamentoRaw) return res.status(404).json({ error: 'Orçamento não encontrado' });
    const orcamento = normalizarOrcamento(orcamentoRaw);

    const [clinica, paciente, procedimentos] = await Promise.all([
      Clinica.findByPk(orcamento.clinica_id),
      Paciente.findByPk(orcamento.paciente_id),
      Procedimento.findAll({ where: { id: orcamento.procedimentos } }),
    ]);
    const procedimentosMap = {};
    procedimentos.forEach(p => { procedimentosMap[p.id] = p; });

    const pdfBuffer = await montarPdfOrcamento({
      orcamento, clinica, paciente, procedimentosMap,
      dentistaNome: req.user?.nome || '',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="orcamento-${(paciente?.nome || 'paciente').replace(/\s+/g, '-')}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
