const PDFDocument = require('pdfkit');
const { Clinica } = require('../models');

const ORANGE = '#F97316';
const DARK = '#1a1a2e';

function bufferFromDataUri(dataUri) {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return null;
  const base64 = dataUri.split(',')[1];
  if (!base64) return null;
  try {
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
}

function formatarDataBR(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function desenharCabecalho(doc, { nome, cro, logoBuffer }) {
  const largura = doc.page.width;

  // Faixa diagonal decorativa no topo (laranja + azul-escuro), imitando o preview em tela
  doc.save();
  doc.polygon([largura * 0.55, 0], [largura, 0], [largura, 40], [largura * 0.72, 40]).fill(ORANGE);
  doc.polygon([largura * 0.72, 0], [largura, 0], [largura, 40], [largura * 0.85, 40]).fill(DARK);
  doc.restore();

  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(13)
    .text(`DR(A). ${(nome || 'Nome do Dentista').toUpperCase()}`, 40, 55);
  doc.fillColor('#64748b').font('Helvetica').fontSize(9)
    .text(cro ? `CRO ${cro}` : '', 40, 72);

  if (logoBuffer) {
    try {
      doc.image(logoBuffer, largura - 130, 45, { fit: [90, 45] });
    } catch { /* logo inválida, ignora */ }
  }

  doc.moveDown(2);
}

function desenharRodape(doc, { assinaturaBuffer, clinica }) {
  const largura = doc.page.width;
  const y = doc.page.height - 130;

  // Evita que o pdfkit crie uma página nova ao desenhar perto/dentro da margem inferior
  doc.page.margins.bottom = 0;

  doc.save();
  doc.polygon([0, y + 90], [largura * 0.75, y + 90], [largura * 0.55, y + 130], [0, y + 130]).fill(DARK);
  doc.polygon([largura * 0.55, y + 90], [largura * 0.75, y + 90], [largura * 0.62, y + 130], [largura * 0.4, y + 130]).fill(ORANGE);
  doc.restore();

  const assinaturaX = largura - 220;
  if (assinaturaBuffer) {
    try {
      doc.image(assinaturaBuffer, assinaturaX, y, { fit: [160, 40], align: 'center' });
    } catch { /* assinatura inválida, ignora */ }
  } else {
    doc.moveTo(assinaturaX, y + 38).lineTo(assinaturaX + 160, y + 38).strokeColor('#94a3b8').stroke();
  }
  doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8)
    .text('Assinatura do Dentista', assinaturaX, y + 44, { width: 160, align: 'center' });

  const linhas = [];
  if (clinica?.telefone) linhas.push(clinica.telefone);
  if (clinica?.endereco) linhas.push(`${clinica.endereco}${clinica.numero ? `, nº ${clinica.numero}` : ''}`);
  if (clinica?.email) linhas.push(clinica.email);
  doc.fillColor('#94a3b8').font('Helvetica').fontSize(7)
    .text(linhas.join(' | '), 40, y + 58, { width: largura - 80, align: 'right' });
}

async function montarPDF({ tipo, dados, user, clinica }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const logoBuffer = bufferFromDataUri(clinica?.logo);
    const assinaturaBuffer = bufferFromDataUri(clinica?.assinatura);

    desenharCabecalho(doc, { nome: user.nome, cro: user.cro, logoBuffer });

    const dataFormatada = formatarDataBR(dados.data);
    const titulo = tipo === 'receita'
      ? 'RECEITUÁRIO ODONTOLÓGICO'
      : tipo === 'declaracao'
        ? 'DECLARAÇÃO DE HORAS'
        : 'ATESTADO ODONTOLÓGICO';

    doc.moveDown(1);
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(15).text(titulo, { align: 'center' });
    doc.moveDown(1.2);

    if (tipo === 'receita') {
      doc.fillColor('#475569').font('Helvetica').fontSize(10);
      doc.text(`Paciente: ${dados.nome || '_______________'}`, { continued: true });
      doc.text(`     Data: ${dataFormatada}`, { align: 'right' });
      if (dados.cid) {
        doc.moveDown(0.3);
        doc.text(`CID: ${dados.cid}`);
      }
      doc.moveDown(0.8);
      doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.6);

      const medicamentos = Array.isArray(dados.medicamentos) ? dados.medicamentos : [];
      if (medicamentos.length === 0) {
        doc.fillColor('#94a3b8').font('Helvetica-Oblique').fontSize(10).text('Nenhum medicamento prescrito.');
      } else {
        medicamentos.forEach((med, i) => {
          doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11)
            .text(`${i + 1}. ${med.nome || `Medicamento ${i + 1}`}`);
          if (med.posologia) {
            doc.fillColor('#475569').font('Helvetica').fontSize(9.5)
              .text(med.posologia, { indent: 14 });
          }
          doc.moveDown(0.5);
        });
      }

      if (dados.observacoes) {
        doc.moveDown(0.5);
        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#e2e8f0').stroke();
        doc.moveDown(0.4);
        doc.fillColor('#475569').font('Helvetica-Bold').fontSize(9.5).text('Observações:', { continued: true });
        doc.font('Helvetica').text(` ${dados.observacoes}`);
      }
    } else {
      const cidadeClinica = clinica?.cidade || dados.cidade || 'Cidade';
      let texto;
      if (tipo === 'declaracao') {
        texto = `Declaramos para devidos fins que ${dados.nome || '___________'}, CPF: ${dados.cpf || '___________'}, residente e domiciliado(a) à ${dados.endereco || '___________'}, esteve sob tratamento odontológico neste consultório, no período das ${dados.horaInicio || '__:__'} às ${dados.horaFim || '__:__'} horas do dia ${dataFormatada}.\n\nProcedimento: ${dados.procedimento || '___________'}`;
      } else {
        texto = `Atesto para devidos fins que ${dados.nome || '___________'}, CPF: ${dados.cpf || '___________'}, residente e domiciliado(a) à ${dados.endereco || '___________'}, compareceu a esta clínica odontológica no dia ${dataFormatada}${dados.dias ? `, necessitando de ${dados.dias} dias de afastamento` : ''}.\n\nProcedimento: ${dados.procedimento || '___________'}`;
      }
      doc.fillColor('#1e293b').font('Helvetica').fontSize(11).text(texto, { align: 'justify', lineGap: 5 });
      doc.moveDown(1.5);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK)
        .text(`${cidadeClinica}, ${dataFormatada}`, { align: 'right' });
    }

    desenharRodape(doc, { assinaturaBuffer, clinica });

    doc.end();
  });
}

exports.gerarPdfDocumento = async (req, res) => {
  try {
    const { tipo, ...dados } = req.body;
    if (!['receita', 'atestado', 'declaracao'].includes(tipo)) {
      return res.status(400).json({ message: 'Tipo de documento inválido.' });
    }

    const clinica = req.user.clinicaId ? await Clinica.findByPk(req.user.clinicaId) : null;

    const pdfBuffer = await montarPDF({ tipo, dados, user: req.user, clinica });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${tipo}-${dados.nome || 'paciente'}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Erro ao gerar PDF do documento:', error);
    res.status(500).json({ message: 'Erro ao gerar PDF do documento', error: error.message });
  }
};
