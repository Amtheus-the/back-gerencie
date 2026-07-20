// Resumo financeiro do paciente
exports.resumoFinanceiroPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const clinicaId = req.user.clinicaId;
    const { Paciente } = require('../models');

    // Busca o nome do paciente para filtrar faturamentos pelo nome (FK pode não estar preenchida)
    const paciente = await Paciente.findByPk(pacienteId, { attributes: ['nome'] });
    if (!paciente) return res.json({ totalInvestido: 0, totalNFs: 0, totalPendentes: 0 });

    const { Op } = require('sequelize');
    const faturamentos = await Faturamento.findAll({
      where: {
        clinicaId,
        declarar: true,
        [Op.or]: [
          { pacienteId },
          { paciente: paciente.nome }
        ]
      }
    });

    const totalInvestido = faturamentos.reduce((sum, f) => sum + parseFloat(f.valor), 0);
    const totalNFs = faturamentos.filter(f => f.notaEmitida || f.reciboNome).length;
    const totalPendentes = faturamentos.filter(f => !f.notaEmitida && !f.reciboNome).length;

    res.json({ totalInvestido, totalNFs, totalPendentes });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar resumo financeiro', error: error.message });
  }
};
/**
 * Consulta parâmetros fiscais e códigos de serviço do município via Webmania®
 * GET /api/faturamento/parametros-municipio
 */
exports.consultarParametrosMunicipio = async (req, res) => {
  try {
    console.log('🔎 [NFS-e] Consultando parâmetros fiscais do município...');
    const response = await axios.get('https://api.webmania.com.br/2/nfse/status', {
      headers: {
        Authorization: 'Bearer Wr3XN0bzTtELmxlLmUgdfHlcjcO20KniHGeCtZKG',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      params: {
        cnpj: '60146430000148'
      }
    });
    console.log('✅ [NFS-e] Parâmetros fiscais recebidos:', JSON.stringify(response.data, null, 2));
    // Retorna todos os parâmetros disponíveis para o município
    return res.json({ success: true, parametros: response.data });
  } catch (error) {
    console.error('❌ [NFS-e] Erro ao consultar parâmetros do município:', error.response?.data || error.message);
    if (error.response) {
      console.error('❌ [NFS-e] Status:', error.response.status);
      console.error('❌ [NFS-e] Headers:', error.response.headers);
      console.error('❌ [NFS-e] Data:', error.response.data);
    }
    return res.status(500).json({ success: false, message: 'Erro ao consultar parâmetros do município', error: error.response?.data || error.message });
  }
};
/**
 * Controller de faturamento
 * Gerencia lógica de CRUD para faturamento
 */

const { Faturamento } = require('../models');
const { Op } = require('sequelize');

/**
 * Lista todo o faturamento do usuário autenticado
 */
exports.listarFaturamento = async (req, res) => {
  try {
    const { dataInicio, dataFim, tipoPessoa } = req.query;

    // Filtra por clínica — dentista e secretaria veem os mesmos faturamentos
    const where = { clinicaId: req.user.clinicaId };
    
    if (dataInicio && dataFim) {
      where.data = {
        [Op.between]: [dataInicio, dataFim]
      };
    }
    
    if (tipoPessoa) {
      where.tipoPessoa = tipoPessoa;
    }

    const faturamentos = await Faturamento.findAll({
      where,
      order: [['data', 'DESC']]
    });

    // Calcula total
    const total = faturamentos.reduce((sum, f) => sum + parseFloat(f.valor), 0);

    res.json({
      success: true,
      count: faturamentos.length,
      total: total.toFixed(2),
      data: faturamentos
    });
  } catch (error) {
    console.error('Erro ao listar faturamento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar faturamento' 
    });
  }
};

/**
 * Registra um novo faturamento
 */
exports.criarFaturamento = async (req, res) => {
  try {
  const { notificarNovoFaturamento } = require('../services/emailService');
  const userId = req.user.id;
  let { descricao, valor, data, formaPagamento, paciente_id, paciente, tipoPessoa, observacoes, cpf, declarar,
        maquinaCartaoId, parcelasCartao, cartaoAntecipado, taxaCartaoResponsavel } = req.body;
  console.log('🔎 [DEBUG] Corpo da requisição faturamento:', req.body);
  const { Paciente, MaquinaCartao, TaxaMaquinaCartao, Despesa } = require('../models');
  // Se vier só nome, buscar o id
  if (!paciente_id && paciente) {
    const pacienteObj = await Paciente.findOne({ where: { nome: paciente } });
    paciente_id = pacienteObj ? pacienteObj.id : null;
  }
  // Se vier só id, buscar o nome
  if (paciente_id && !paciente) {
    const pacienteObj = await Paciente.findByPk(paciente_id);
    paciente = pacienteObj ? pacienteObj.nome : null;
  }

    // Validação básica
    if (!descricao || !valor || !data || !formaPagamento || !paciente || !tipoPessoa) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios faltando'
      });
    }

    // Buscar clinicaId do usuário
    const { User } = require('../models');
    const usuario = await User.findByPk(userId, {
      attributes: ['clinicaId']
    });

    // Taxa de máquina de cartão (só se veio máquina + parcelas selecionadas)
    let taxaCartaoPercentual = null;
    let taxaCartaoValor = null;
    let maquinaCartaoNome = null;
    if (formaPagamento === 'Cartão de Crédito' && maquinaCartaoId && parcelasCartao) {
      const maquina = await MaquinaCartao.findOne({ where: { id: maquinaCartaoId, clinicaId: usuario.clinicaId } });
      const taxaLinha = maquina && await TaxaMaquinaCartao.findOne({
        where: { maquinaId: maquinaCartaoId, parcelas: parcelasCartao }
      });
      if (taxaLinha) {
        maquinaCartaoNome = maquina.nome;
        taxaCartaoPercentual = (cartaoAntecipado && taxaLinha.taxaAntecipacaoPercentual !== null)
          ? taxaLinha.taxaAntecipacaoPercentual
          : taxaLinha.taxaPercentual;
        taxaCartaoValor = Math.round(parseFloat(valor) * (parseFloat(taxaCartaoPercentual) / 100) * 100) / 100;
      }
    }

    const novoFaturamento = await Faturamento.create({
      userId,
      clinicaId: usuario.clinicaId, // Adicionar clinicaId
      descricao,
      valor,
      data,
      formaPagamento,
      paciente_id,
      paciente,
      cpf,
      tipoPessoa,
      observacoes,
      declarar: declarar !== undefined ? Boolean(declarar) : true,
      ...(taxaCartaoValor !== null && {
        maquinaCartaoId,
        parcelasCartao,
        cartaoAntecipado: !!cartaoAntecipado,
        taxaCartaoResponsavel: taxaCartaoResponsavel || null,
        taxaCartaoPercentual,
        taxaCartaoValor,
      }),
    });

    // Se a clínica absorve a taxa, lança automaticamente como despesa dedutível
    if (taxaCartaoValor !== null && taxaCartaoResponsavel === 'clinica') {
      const despesaTaxa = await Despesa.create({
        userId,
        clinicaId: usuario.clinicaId,
        descricao: `Taxa de cartão (${maquinaCartaoNome} - ${parcelasCartao}x${cartaoAntecipado ? ' antecipado' : ''})`,
        valor: taxaCartaoValor,
        categoria: 'Outros',
        data,
        tipo: 'variavel',
        dedutivel: true,
        observacoes: `Gerada automaticamente a partir do faturamento "${descricao}"`,
      });
      await novoFaturamento.update({ despesaTaxaCartaoId: despesaTaxa.id });
    }

    res.status(201).json({
      success: true,
      message: 'Faturamento registrado com sucesso',
      data: novoFaturamento
    });

    // Notifica admins (assíncrono, não bloqueia a resposta)
    const { Clinica } = require('../models');
    const clinicaObj = await Clinica.findByPk(usuario.clinicaId, { attributes: ['nome'] }).catch(() => null);
    notificarNovoFaturamento({
      dentista: req.user.nome || req.user.email,
      clinica: clinicaObj?.nome || 'N/A',
      paciente,
      valor,
      data,
      tipoPessoa,
      formaPagamento,
    });
  } catch (error) {
    console.error('Erro ao criar faturamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar faturamento'
    });
  }
};

/**
 * Busca um faturamento específico
 */
exports.buscarFaturamento = async (req, res) => {
  try {
    const { id } = req.params;

    const faturamento = await Faturamento.findOne({
      where: { id, clinicaId: req.user.clinicaId }
    });
    
    if (!faturamento) {
      return res.status(404).json({
        success: false,
        message: 'Faturamento não encontrado'
      });
    }

    res.json({
      success: true,
      data: faturamento
    });
  } catch (error) {
    console.error('Erro ao buscar faturamento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar faturamento' 
    });
  }
};

/**
 * Atualiza um faturamento
 */
exports.atualizarFaturamento = async (req, res) => {
  try {
    const { id } = req.params;
    const dadosAtualizacao = req.body;

    const faturamento = await Faturamento.findOne({
      where: { id, clinicaId: req.user.clinicaId }
    });
    
    if (!faturamento) {
      return res.status(404).json({
        success: false,
        message: 'Faturamento não encontrado'
      });
    }

    if (faturamento.reciboUrl) {
      return res.status(403).json({
        success: false,
        message: 'Este lançamento possui um recibo emitido e não pode ser editado. Solicite a remoção do recibo ao admin.'
      });
    }

    await faturamento.update(dadosAtualizacao);
    
    res.json({
      success: true,
      message: 'Faturamento atualizado com sucesso',
      data: faturamento
    });
  } catch (error) {
    console.error('Erro ao atualizar faturamento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar faturamento' 
    });
  }
};

/**
 * Remove um faturamento
 */
exports.deletarFaturamento = async (req, res) => {
  try {
    const { id } = req.params;

    const faturamento = await Faturamento.findOne({
      where: { id, clinicaId: req.user.clinicaId }
    });
    
    if (!faturamento) {
      return res.status(404).json({
        success: false,
        message: 'Faturamento não encontrado'
      });
    }

    // Bloqueio: não permite excluir se o admin já anexou um recibo
    if (faturamento.reciboUrl) {
      return res.status(403).json({
        success: false,
        message: 'Este lançamento possui um recibo anexado pelo administrador e não pode ser excluído. Solicite a remoção do recibo ao admin.'
      });
    }

    await faturamento.destroy();

    res.json({
      success: true,
      message: 'Faturamento removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar faturamento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao deletar faturamento' 
    });
  }
};


/**
 * Emite Nota Fiscal via Nuvem Fiscal (padrão DPS)
 * POST /api/faturamento/:id/emitir-nota
 */
const axios = require('axios');
exports.emitirNotaFiscal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { User, Clinica, Paciente } = require('../models');

    // Buscar faturamento
    const faturamento = await Faturamento.findOne({ where: { id, userId } });
    if (!faturamento) {
      return res.status(404).json({ success: false, message: 'Faturamento não encontrado' });
    }

    // Buscar usuário e clínica
    const usuario = await User.findByPk(userId);
    const clinicaId = usuario.clinicaId || usuario.clinica_id;
    const clinica = await Clinica.findByPk(clinicaId);
    if (!clinica) {
      return res.status(404).json({ success: false, message: 'Clínica não encontrada' });
    }

    // Validar campos obrigatórios da clínica para emissão
    const camposFaltando = [];
    if (!clinica.cnpj) camposFaltando.push('CNPJ da clínica');
    if (!clinica.codigoServico) camposFaltando.push('Código do Serviço (NFS-e)');
    if (!clinica.descricaoPadraoNota) camposFaltando.push('Descrição Padrão da Nota Fiscal');
    if (!clinica.cidade) camposFaltando.push('Cidade da clínica');
    if (!clinica.estado) camposFaltando.push('UF da clínica');

    if (camposFaltando.length > 0) {
      return res.status(422).json({
        success: false,
        message: `Complete os dados da clínica antes de emitir a nota fiscal. Faltando: ${camposFaltando.join(', ')}.`,
        camposFaltando,
        redirect: '/perfil',
      });
    }

    // Buscar paciente se houver (tenta pelo ID, depois pelo CPF)
    let paciente = null;
    const pacienteId = faturamento.pacienteId || faturamento.paciente_id;
    if (pacienteId) {
      paciente = await Paciente.findByPk(pacienteId);
    }
    if (!paciente && faturamento.cpf) {
      const cpfLimpo = faturamento.cpf.replace(/\D/g, '');
      paciente = await Paciente.findOne({ where: { cpf_cnpj: faturamento.cpf } })
        || await Paciente.findOne({ where: { cpf_cnpj: cpfLimpo } });
    }
    console.log('👤 Paciente encontrado:', paciente ? `${paciente.nome} / ${paciente.email}` : 'NÃO ENCONTRADO');

    // Dados do tomador
    const cpfTomador = (paciente?.cpf_cnpj || faturamento.cpf || faturamento.pagador_cpf || '').replace(/\D/g, '');
    const cnpjTomador = (faturamento.cnpj || faturamento.pagador_cnpj || '').replace(/\D/g, '');
    const nomeTomador = paciente?.nome || faturamento.paciente || faturamento.pagador_nome || '';
    const isPJ = faturamento.tipo_pessoa === 'PJ';

    // Inscrição municipal da clínica (campo no banco)
    const inscricaoMunicipal = clinica.inscricao_municipal || clinica.inscricaoMunicipal || '7929948-2';
    const cnpjClinica = (clinica.cnpj || '').replace(/\D/g, '');

    // Montar payload no formato DPS (padrão nacional Nuvem Fiscal)
    const nfsePayload = {
      provedor: 'padrao',
      ambiente: 'producao',
      infDPS: {
        dhEmi: new Date(faturamento.data || Date.now()).toISOString(),
        prest: {
          CNPJ: cnpjClinica,
        },
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

    console.log('--- DEBUG NFS-e (DPS) ---');
    console.log('CNPJ Clínica:', cnpjClinica);
    console.log('IM Clínica:', inscricaoMunicipal);
    console.log('Tomador:', isPJ ? `CNPJ: ${cnpjTomador}` : `CPF: ${cpfTomador}`);
    console.log('Nome Tomador:', nomeTomador);
    console.log('Valor:', faturamento.valor);
    console.log('Payload DPS:', JSON.stringify(nfsePayload, null, 2));

    // Obter token e chamar API
    const { getNuvemFiscalToken } = require('../services/nuvemFiscalService');
    const token = await getNuvemFiscalToken();

    const endpoint = 'https://api.nuvemfiscal.com.br/nfse/dps';
    const response = await axios.post(endpoint, nfsePayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    console.log('✅ Resposta Nuvem Fiscal:', JSON.stringify(response.data, null, 2));

    const nfseId = response.data?.id || response.data?.data?.id || null;
    await faturamento.update({ notaEmitida: true, numeroNota: nfseId || response.data?.numero });

    return res.json({ success: true, message: 'Nota Fiscal enviada para emissão!', data: response.data });

  } catch (error) {
    console.error('Erro ao emitir nota fiscal:');
    console.error('  Status:', error.response?.status);
    console.error('  Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('  Message:', error.message);
    return res.status(500).json({ success: false, message: 'Erro ao emitir nota fiscal', error: error.response?.data || error.message });
  }
};

/**
 * Gera URL pré-assinada S3 para o recibo do próprio faturamento (acesso do dentista)
 * GET /api/faturamento/:id/recibo
 */
exports.downloadReciboUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const faturamento = await Faturamento.findOne({
      where: { id, userId },
      attributes: ['id', 'reciboUrl', 'reciboNome']
    });

    if (!faturamento) {
      return res.status(404).json({ success: false, message: 'Faturamento não encontrado' });
    }
    if (!faturamento.reciboUrl) {
      return res.status(404).json({ success: false, message: 'Recibo não anexado ainda' });
    }

    const { getPresignedUrl, extractS3Key } = require('../config/s3');
    const key = extractS3Key(faturamento.reciboUrl);
    if (!key) return res.status(500).json({ success: false, message: 'URL do recibo inválida' });

    const url = getPresignedUrl(key, 900);
    res.json({ success: true, url });
  } catch (error) {
    console.error('Erro ao gerar link do recibo:', error);
    res.status(500).json({ success: false, message: 'Erro ao gerar link do recibo' });
  }
};

/**
 * Cancela Nota Fiscal na Nuvem Fiscal
 * POST /api/faturamento/:id/cancelar-nota
 */
exports.cancelarNotaFiscal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { motivo } = req.body;

    const faturamento = await Faturamento.findOne({ where: { id, userId } });
    if (!faturamento) {
      return res.status(404).json({ success: false, message: 'Faturamento não encontrado' });
    }
    if (!faturamento.notaEmitida || !faturamento.numeroNota) {
      return res.status(400).json({ success: false, message: 'Este faturamento não possui nota fiscal emitida' });
    }

    console.log(`🗑️ Cancelando nota ${faturamento.numeroNota}...`);

    const { getNuvemFiscalToken } = require('../services/nuvemFiscalService');
    const token = await getNuvemFiscalToken();

    const response = await axios.post(
      `https://api.nuvemfiscal.com.br/nfse/${faturamento.numeroNota}/cancelamento`,
      { motivo: motivo || 'Cancelamento solicitado pelo prestador.' },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    console.log('✅ Cancelamento resposta:', JSON.stringify(response.data, null, 2));

    await faturamento.update({ notaEmitida: false, numeroNota: null });

    return res.json({ success: true, message: 'Nota Fiscal cancelada com sucesso!', data: response.data });
  } catch (error) {
    console.error('Erro ao cancelar nota fiscal:');
    console.error('  Status:', error.response?.status);
    console.error('  Data:', JSON.stringify(error.response?.data, null, 2));
    return res.status(500).json({ success: false, message: 'Erro ao cancelar nota fiscal', error: error.response?.data || error.message });
  }
};

/**
 * Baixa PDF da Nota Fiscal via Nuvem Fiscal
 * GET /api/faturamento/:id/baixar-nota
 */
exports.baixarNotaFiscal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const faturamento = await Faturamento.findOne({ where: { id, userId } });
    if (!faturamento) return res.status(404).json({ success: false, message: 'Faturamento não encontrado' });

    // Nota com URL S3 direta (migrada do sistema antigo OU emitida manualmente):
    // tem notaFiscalUrl mas não tem numeroNota da NuvemFiscal (ou é prefixo MANUAL-)
    const isManual = faturamento.notaFiscalUrl && (
      !faturamento.numeroNota || String(faturamento.numeroNota).startsWith('MANUAL')
    );
    if (isManual) {
      const response = await axios.get(faturamento.notaFiscalUrl, { responseType: 'arraybuffer' });
      const nomeArquivo = faturamento.notaFiscalUrl.split('/').pop() || 'nota-fiscal.pdf';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
      return res.send(response.data);
    }

    if (!faturamento.numeroNota) return res.status(400).json({ success: false, message: 'Nota fiscal não emitida' });

    const { getNuvemFiscalToken } = require('../services/nuvemFiscalService');
    const token = await getNuvemFiscalToken();

    console.log(`📄 Baixando PDF da nota ${faturamento.numeroNota}...`);
    const response = await axios.get(
      `https://api.nuvemfiscal.com.br/nfse/${faturamento.numeroNota}/pdf`,
      { headers: { Authorization: `Bearer ${token}` }, responseType: 'arraybuffer' }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=nota-${faturamento.numeroNota}.pdf`);
    res.send(response.data);
  } catch (error) {
    console.error('Erro ao baixar PDF:', error.response?.status, error.response?.data?.toString() || error.message);
    res.status(500).json({ success: false, message: 'Erro ao baixar PDF da nota fiscal' });
  }
};

module.exports = exports;

