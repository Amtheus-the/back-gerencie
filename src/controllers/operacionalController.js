/**
 * Controller para Operações Administrativas
 * Gerencia visualização detalhada dos usuários e upload de documentos
 */

const { Clinica, User, Faturamento, Despesa, Analise, Documento, Paciente } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

/**
 * Listar usuários com resumo para painel operacional
 */
exports.listarUsuariosOperacional = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.and]: [
        { isAdmin: false }, // Não mostrar admins
        {
          [Op.or]: [
            { nome: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { nomeClinica: { [Op.like]: `%${search}%` } }
          ]
        }
      ]
    } : { isAdmin: false };

    const usuarios = await User.findAndCountAll({
      where: whereClause,
      attributes: {
        exclude: ['senha'],
        include: [
          // Total de faturamentos
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM faturamentos
              WHERE faturamentos.user_id = User.id
            )`),
            'totalFaturamentos'
          ],
          // Total de despesas
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM despesas
              WHERE despesas.user_id = User.id
            )`),
            'totalDespesas'
          ],
          // Total de documentos
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM documentos
              WHERE documentos.user_id = User.id
            )`),
            'totalDocumentos'
          ],
          // Valor total de faturamento
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(valor), 0)
              FROM faturamentos
              WHERE faturamentos.user_id = User.id
            )`),
            'valorTotalFaturamento'
          ],
          // Valor total de despesas
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(valor), 0)
              FROM despesas
              WHERE despesas.user_id = User.id
            )`),
            'valorTotalDespesas'
          ],
          // Último faturamento
          [
            sequelize.literal(`(
              SELECT data
              FROM faturamentos
              WHERE faturamentos.user_id = User.id
              ORDER BY data DESC
              LIMIT 1
            )`),
            'ultimoFaturamento'
          ],
          // Última despesa
          [
            sequelize.literal(`(
              SELECT data
              FROM despesas
              WHERE despesas.user_id = User.id
              ORDER BY data DESC
              LIMIT 1
            )`),
            'ultimaDespesa'
          ]
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      usuarios: usuarios.rows,
      totalUsuarios: usuarios.count,
      paginaAtual: parseInt(page),
      totalPaginas: Math.ceil(usuarios.count / limit)
    });
  } catch (error) {
    console.error('Erro ao listar usuários operacional:', error);
    res.status(500).json({
      erro: 'Erro ao listar usuários',
      detalhes: error.message
    });
  }
};

/**
 * Obter perfil completo do usuário
 */
exports.getPerfilCompleto = async (req, res) => {
  try {
    const { userId } = req.params;

    // Buscar usuário
    const usuario = await User.findByPk(userId, {
      attributes: { exclude: ['senha'] }
    });

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Buscar faturamentos
    const faturamentos = await Faturamento.findAll({
      where: { userId },
      order: [['data', 'DESC']],
      limit: 50
    });

    // Buscar despesas
    const despesas = await Despesa.findAll({
      where: { userId },
      order: [['data', 'DESC']],
      limit: 50
    });

    // Buscar documentos
    const documentos = await Documento.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    // Calcular estatísticas
    const totalFaturamento = faturamentos.reduce((sum, f) => sum + parseFloat(f.valor), 0);
    const totalDespesas = despesas.reduce((sum, d) => sum + parseFloat(d.valor), 0);
    const saldo = totalFaturamento - totalDespesas;

    // Calcular impostos estimados (simplificado)
    const impostosEstimados = totalFaturamento * 0.065; // 6,5% estimado para Simples Nacional

    res.json({
      usuario: usuario.toJSON(),
      estatisticas: {
        totalFaturamentos: faturamentos.length,
        totalDespesas: despesas.length,
        totalDocumentos: documentos.length,
        valorTotalFaturamento: totalFaturamento,
        valorTotalDespesas: totalDespesas,
        saldo: saldo,
        impostosEstimados: impostosEstimados,
        lucroLiquido: saldo - impostosEstimados
      },
      faturamentos,
      despesas,
      documentos
    });
  } catch (error) {
    console.error('Erro ao buscar perfil completo:', error);
    res.status(500).json({
      erro: 'Erro ao buscar perfil completo',
      detalhes: error.message
    });
  }
};

/**
 * Upload de documento para o usuário
 */
exports.uploadDocumento = async (req, res) => {
  try {
    const { userId } = req.params;
    const { tipo, titulo, descricao, valor, dataReferencia, faturamentoId, despesaId } = req.body;
    const adminId = req.userId;

    // Verificar se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo foi enviado' });
    }

    // Verificar se o usuário existe
    const usuario = await User.findByPk(userId);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Criar registro do documento
    const documento = await Documento.create({
      userId,
      tipo: tipo || 'outros',
      titulo,
      descricao,
      nomeArquivo: req.file.originalname,
      caminhoArquivo: req.file.path,
      tamanhoArquivo: req.file.size,
      tipoMime: req.file.mimetype,
      uploadPorAdmin: true,
      adminId,
      valor: valor ? parseFloat(valor) : null,
      dataReferencia: dataReferencia || null,
      faturamentoId: faturamentoId || null,
      despesaId: despesaId || null
    });

    res.status(201).json({
      mensagem: 'Documento enviado com sucesso',
      documento
    });
  } catch (error) {
    console.error('Erro ao fazer upload do documento:', error);
    res.status(500).json({
      erro: 'Erro ao fazer upload do documento',
      detalhes: error.message
    });
  }
};

/**
 * Listar documentos de um usuário
 */
exports.listarDocumentosUsuario = async (req, res) => {
  try {
    const { userId } = req.params;
    const { tipo } = req.query;

    const whereClause = { userId };
    if (tipo) {
      whereClause.tipo = tipo;
    }

    const documentos = await Documento.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Faturamento,
          as: 'faturamento',
          attributes: ['id', 'descricao', 'valor', 'data']
        },
        {
          model: Despesa,
          as: 'despesa',
          attributes: ['id', 'descricao', 'valor', 'data']
        }
      ]
    });

    res.json(documentos);
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    res.status(500).json({
      erro: 'Erro ao listar documentos',
      detalhes: error.message
    });
  }
};

/**
 * Download de documento
 */
exports.downloadDocumento = async (req, res) => {
  try {
    const { documentoId } = req.params;

    const documento = await Documento.findByPk(documentoId);

    if (!documento) {
      return res.status(404).json({ erro: 'Documento não encontrado' });
    }

    // Verificar se o arquivo existe
    try {
      await fs.access(documento.caminhoArquivo);
    } catch {
      return res.status(404).json({ erro: 'Arquivo não encontrado no servidor' });
    }

    // Marcar como visualizado
    if (!documento.visualizado) {
      documento.visualizado = true;
      documento.dataVisualizacao = new Date();
      await documento.save();
    }

    // Enviar arquivo
    res.download(documento.caminhoArquivo, documento.nomeArquivo);
  } catch (error) {
    console.error('Erro ao fazer download do documento:', error);
    res.status(500).json({
      erro: 'Erro ao fazer download do documento',
      detalhes: error.message
    });
  }
};

/**
 * Deletar documento
 */
exports.deletarDocumento = async (req, res) => {
  try {
    const { documentoId } = req.params;

    const documento = await Documento.findByPk(documentoId);

    if (!documento) {
      return res.status(404).json({ erro: 'Documento não encontrado' });
    }

    // Tentar deletar o arquivo físico
    try {
      await fs.unlink(documento.caminhoArquivo);
    } catch (err) {
      console.warn('Arquivo físico não encontrado:', err.message);
    }

    // Deletar registro do banco
    await documento.destroy();

    res.json({ mensagem: 'Documento deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    res.status(500).json({
      erro: 'Erro ao deletar documento',
      detalhes: error.message
    });
  }
};

/**
 * Listar clínicas com resumo para painel operacional
 */
exports.listarClinicasOperacional = async (req, res) => {
  try {
    console.log('🔵 [Operacional] GET /api/operacional/clinicas - Requisição recebida');
    const { search = '', page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        { nome: { [Op.like]: `%${search}%` } },
        { cpf: { [Op.like]: `%${search}%` } },
        { cnpj: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    console.log('🔍 [Operacional] Buscando clínicas no banco...');
    const clinicas = await Clinica.findAndCountAll({
      where: whereClause,
      attributes: {
        include: [
          // Número de usuários
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM users
              WHERE users.clinica_id = Clinica.id
              AND users.is_admin = false
            )`),
            'numeroUsuarios'
          ],
          // Total de faturamentos
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM faturamentos
              WHERE faturamentos.clinica_id = Clinica.id
            )`),
            'totalFaturamentos'
          ],
          // Total de despesas
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM despesas
              WHERE despesas.clinica_id = Clinica.id
            )`),
            'totalDespesas'
          ],
          // Total de documentos
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM documentos
              WHERE documentos.clinica_id = Clinica.id
            )`),
            'totalDocumentos'
          ],
          // Valor total de faturamento
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(valor), 0)
              FROM faturamentos
              WHERE faturamentos.clinica_id = Clinica.id
            )`),
            'valorTotalFaturamento'
          ],
          // Valor total de despesas
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(valor), 0)
              FROM despesas
              WHERE despesas.clinica_id = Clinica.id
            )`),
            'valorTotalDespesas'
          ]
        ]
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['nome', 'ASC']]
    });

    console.log(`✅ [Operacional] ${clinicas.count} clínica(s) encontrada(s)`);
    
    res.json({
      clinicas: clinicas.rows,
      total: clinicas.count,
      totalPaginas: Math.ceil(clinicas.count / limit),
      paginaAtual: parseInt(page)
    });

  } catch (error) {
    console.error('❌ [Operacional] Erro ao listar clínicas:', error);
    res.status(500).json({
      erro: 'Erro ao listar clínicas',
      detalhes: error.message
    });
  }
};

/**
 * Buscar perfil completo de uma clínica
 */
exports.getPerfilCompletoClinica = async (req, res) => {
  try {
    const { clinicaId } = req.params;

    // Buscar clínica
    const clinica = await Clinica.findByPk(clinicaId, {
      include: [
        {
          model: User,
          as: 'usuarios',
          attributes: { exclude: ['senha'] },
          where: { isAdmin: false },
          required: false
        }
      ]
    });

    if (!clinica) {
      return res.status(404).json({ erro: 'Clínica não encontrada' });
    }

    // Buscar faturamentos
    const faturamentos = await Faturamento.findAll({
      where: { clinicaId },
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['nome']
        }
      ],
      order: [['data', 'DESC']],
      limit: 50
    });

    // Buscar despesas
    const despesas = await Despesa.findAll({
      where: { clinicaId },
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['nome']
        }
      ],
      order: [['data', 'DESC']],
      limit: 50
    });

    // Buscar documentos
    const documentos = await Documento.findAll({
      where: { clinicaId },
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['nome']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Calcular estatísticas
    const totalFaturamento = faturamentos.reduce((sum, f) => sum + parseFloat(f.valor), 0);
    const totalDespesas = despesas.reduce((sum, d) => sum + parseFloat(d.valor), 0);
    const saldo = totalFaturamento - totalDespesas;
    const impostosEstimados = totalFaturamento * 0.065;

    res.json({
      clinica: clinica.toJSON(),
      faturamentos,
      despesas,
      documentos,
      estatisticas: {
        totalFaturamento,
        totalDespesas,
        saldo,
        impostosEstimados,
        numeroUsuarios: clinica.usuarios?.length || 0,
        numeroFaturamentos: faturamentos.length,
        numeroDespesas: despesas.length,
        numeroDocumentos: documentos.length
      }
    });

  } catch (error) {
    console.error('Erro ao buscar perfil da clínica:', error);
    res.status(500).json({
      erro: 'Erro ao buscar perfil completo da clínica',
      detalhes: error.message
    });
  }
};

/**
 * Emitir nota fiscal de um faturamento PJ em nome do dentista (admin)
 * POST /api/operacional/faturamentos/:id/emitir-nota
 */
exports.emitirNotaFiscalAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const faturamento = await Faturamento.findByPk(id);
    if (!faturamento) {
      return res.status(404).json({ success: false, message: 'Faturamento não encontrado' });
    }

    if (faturamento.notaEmitida) {
      return res.status(422).json({ success: false, message: 'Nota fiscal já foi emitida para este lançamento.' });
    }

    const usuario = await User.findByPk(faturamento.userId || faturamento.user_id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuário do faturamento não encontrado' });
    }

    const clinicaId = usuario.clinicaId || usuario.clinica_id;
    const clinica = await Clinica.findByPk(clinicaId);
    if (!clinica) {
      return res.status(404).json({ success: false, message: 'Clínica não encontrada' });
    }

    const camposFaltando = [];
    if (!clinica.cnpj) camposFaltando.push('CNPJ da clínica');
    if (!clinica.codigoServico) camposFaltando.push('Código do Serviço (NFS-e)');
    if (!clinica.descricaoPadraoNota) camposFaltando.push('Descrição Padrão da Nota Fiscal');
    if (!clinica.cidade) camposFaltando.push('Cidade da clínica');
    if (!clinica.estado) camposFaltando.push('UF da clínica');

    if (camposFaltando.length > 0) {
      return res.status(422).json({
        success: false,
        message: `Complete os dados da clínica antes de emitir. Faltando: ${camposFaltando.join(', ')}.`,
        camposFaltando,
      });
    }

    let paciente = null;
    const pacienteId = faturamento.pacienteId || faturamento.paciente_id;
    if (pacienteId) paciente = await Paciente.findByPk(pacienteId);
    if (!paciente && faturamento.cpf) {
      const cpfLimpo = faturamento.cpf.replace(/\D/g, '');
      paciente = await Paciente.findOne({ where: { cpf_cnpj: faturamento.cpf } })
        || await Paciente.findOne({ where: { cpf_cnpj: cpfLimpo } });
    }

    const cpfTomador  = (paciente?.cpf_cnpj || faturamento.cpf || faturamento.pagador_cpf || '').replace(/\D/g, '');
    const cnpjTomador = (faturamento.cnpj || faturamento.pagador_cnpj || '').replace(/\D/g, '');
    const nomeTomador = paciente?.nome || faturamento.paciente || faturamento.pagador_nome || '';
    const isPJ = faturamento.tipo_pessoa === 'PJ';
    const cnpjClinica = (clinica.cnpj || '').replace(/\D/g, '');

    // Valida CPF/CNPJ do tomador antes de enviar
    if (isPJ && cnpjTomador.length !== 14) {
      return res.status(422).json({ success: false, message: `CNPJ do tomador inválido ou não cadastrado (encontrado: "${cnpjTomador}"). Verifique o cadastro do paciente/empresa.` });
    }
    if (!isPJ && cpfTomador.length !== 11) {
      return res.status(422).json({ success: false, message: `CPF do tomador inválido ou não cadastrado (encontrado: "${cpfTomador}"). Verifique o CPF no lançamento ou no cadastro do paciente.` });
    }

    const nfsePayload = {
      provedor: 'padrao',
      ambiente: 'producao',
      infDPS: {
        dhEmi: new Date(faturamento.data || Date.now()).toISOString(),
        prest: { CNPJ: cnpjClinica },
        toma: {
          ...(isPJ ? { CNPJ: cnpjTomador } : { CPF: cpfTomador }),
          xNome: nomeTomador,
          ...(paciente?.email || faturamento.email ? { email: paciente?.email || faturamento.email } : {}),
        },
        serv: {
          cServ: {
            cTribNac: clinica.codigoServico || '04693',
            xDescServ: clinica.descricaoPadraoNota || faturamento.descricao,
          },
        },
        valores: {
          vServPrest: { vServ: parseFloat(faturamento.valor) },
          trib: { tribMun: { tribISSQN: 1 } },
        },
      },
    };

    const { getNuvemFiscalToken } = require('../services/nuvemFiscalService');
    const token = await getNuvemFiscalToken();

    const response = await axios.post('https://api.nuvemfiscal.com.br/nfse/dps', nfsePayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const nfseId = response.data?.id || response.data?.data?.id || null;
    await faturamento.update({ notaEmitida: true, numeroNota: nfseId || response.data?.numero });

    return res.json({ success: true, message: 'Nota Fiscal enviada para emissão!', data: response.data });

  } catch (error) {
    console.error('Erro ao emitir NF (admin):', error.response?.status, error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Erro ao emitir nota fiscal',
      error: error.response?.data || error.message,
    });
  }
};

/**
 * Cancelar nota fiscal junto à prefeitura via Nuvem Fiscal (admin)
 * DELETE /api/operacional/faturamentos/:id/nota
 */
exports.cancelarNotaFiscalAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const faturamento = await Faturamento.findByPk(id);
    if (!faturamento) {
      return res.status(404).json({ success: false, message: 'Faturamento não encontrado' });
    }

    if (!faturamento.notaEmitida) {
      return res.status(422).json({ success: false, message: 'Este lançamento não possui nota fiscal emitida.' });
    }

    const nfseId = faturamento.numeroNota || faturamento.notaFiscalId;
    if (!nfseId) {
      return res.status(422).json({ success: false, message: 'ID da nota fiscal não encontrado. Não é possível cancelar.' });
    }

    const { getNuvemFiscalToken } = require('../services/nuvemFiscalService');
    const token = await getNuvemFiscalToken();

    await axios.post(
      `https://api.nuvemfiscal.com.br/nfse/${nfseId}/cancelamento`,
      { motivo: motivo || 'Cancelamento solicitado pelo administrador.' },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    await faturamento.update({ notaEmitida: false, numeroNota: null });

    return res.json({ success: true, message: 'Nota fiscal cancelada com sucesso.' });

  } catch (error) {
    console.error('Erro ao cancelar NF (admin):', error.response?.status, error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Erro ao cancelar nota fiscal',
      error: error.response?.data || error.message,
    });
  }
};

/**
 * Alterar tipoPessoa de um faturamento (PF ↔ PJ)
 * PATCH /api/operacional/faturamentos/:id/tipo
 */
exports.alterarTipoPessoa = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipoPessoa } = req.body;

    if (!['PF', 'PJ'].includes(tipoPessoa)) {
      return res.status(400).json({ success: false, message: 'tipoPessoa deve ser PF ou PJ' });
    }

    const faturamento = await Faturamento.findByPk(id);
    if (!faturamento) return res.status(404).json({ success: false, message: 'Faturamento não encontrado' });

    if (faturamento.notaEmitida || faturamento.reciboNome) {
      return res.status(422).json({ success: false, message: 'Não é possível alterar o tipo de um lançamento que já possui nota fiscal ou recibo emitido.' });
    }

    await faturamento.update({ tipoPessoa });

    return res.json({ success: true, tipoPessoa: faturamento.tipoPessoa });
  } catch (error) {
    console.error('Erro ao alterar tipo pessoa:', error.message);
    return res.status(500).json({ success: false, message: 'Erro ao alterar tipo pessoa' });
  }
};

/**
 * Registrar emissão manual de NF + upload do PDF para S3
 * POST /api/operacional/faturamentos/:id/nota-manual
 * Body: multipart/form-data com campo "nota" (PDF) + campo "numeroNota" (opcional)
 */
exports.registrarNotaManual = async (req, res) => {
  try {
    const { id } = req.params;
    const { numeroNota } = req.body;

    const faturamento = await Faturamento.findByPk(id);
    if (!faturamento) return res.status(404).json({ success: false, message: 'Faturamento não encontrado' });

    const notaUrl = req.file?.location || req.file?.path || null;

    await faturamento.update({
      notaEmitida: true,
      numeroNota: numeroNota || `MANUAL-${Date.now()}`,
      notaFiscalUrl: notaUrl,
    });

    return res.json({ success: true, message: 'Nota fiscal registrada manualmente com sucesso.', notaUrl });
  } catch (error) {
    console.error('Erro ao registrar nota manual:', error.message);
    return res.status(500).json({ success: false, message: 'Erro ao registrar nota manual', error: error.message });
  }
};

/**
 * Baixar/visualizar o PDF da nota fiscal de um faturamento (admin)
 * Funciona tanto para NF anexada manualmente (arquivo no S3) quanto para
 * NF emitida via API (busca o PDF direto na Nuvem Fiscal)
 * GET /api/operacional/faturamentos/:id/nota-manual
 */
exports.visualizarNotaManual = async (req, res) => {
  try {
    const { id } = req.params;

    const faturamento = await Faturamento.findByPk(id);
    if (!faturamento) {
      return res.status(404).json({ success: false, message: 'Faturamento não encontrado' });
    }

    const isManual = faturamento.notaFiscalUrl && (
      !faturamento.numeroNota || String(faturamento.numeroNota).startsWith('MANUAL')
    );

    if (isManual) {
      const response = await axios.get(faturamento.notaFiscalUrl, { responseType: 'arraybuffer' });
      const nomeArquivo = faturamento.notaFiscalUrl.split('/').pop() || 'nota-fiscal.pdf';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${nomeArquivo}"`);
      return res.send(response.data);
    }

    if (!faturamento.numeroNota) {
      return res.status(404).json({ success: false, message: 'Nota fiscal não encontrada' });
    }

    const { getNuvemFiscalToken } = require('../services/nuvemFiscalService');
    const token = await getNuvemFiscalToken();

    const response = await axios.get(
      `https://api.nuvemfiscal.com.br/nfse/${faturamento.numeroNota}/pdf`,
      { headers: { Authorization: `Bearer ${token}` }, responseType: 'arraybuffer' }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="nota-${faturamento.numeroNota}.pdf"`);
    return res.send(response.data);
  } catch (error) {
    console.error('Erro ao baixar PDF da nota (admin):', error.response?.status, error.response?.data?.toString?.() || error.message);
    return res.status(500).json({ success: false, message: 'Erro ao baixar PDF da nota fiscal' });
  }
};

module.exports = exports;
