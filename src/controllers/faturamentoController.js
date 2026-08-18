// Resumo financeiro do paciente — investido, saldo em aberto, histórico real e série mensal
exports.resumoFinanceiroPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const clinicaId = req.user.clinicaId;
    const { Paciente, Orcamento } = require('../models');

    // Busca o nome do paciente para filtrar faturamentos pelo nome (FK pode não estar preenchida)
    const paciente = await Paciente.findByPk(pacienteId, { attributes: ['nome'] });
    if (!paciente) {
      return res.json({ totalInvestido: 0, totalNFs: 0, totalPendentes: 0, saldoEmAberto: 0, historico: [], porMes: [] });
    }

    const { Op } = require('sequelize');
    const faturamentos = await Faturamento.findAll({
      where: {
        clinicaId,
        declarar: true,
        [Op.or]: [
          { pacienteId },
          { paciente: paciente.nome }
        ]
      },
      order: [['data', 'DESC']],
    });

    const totalInvestido = faturamentos.reduce((sum, f) => sum + parseFloat(f.valor), 0);
    const totalNFs = faturamentos.filter(f => f.notaEmitida || f.reciboNome).length;
    const totalPendentes = faturamentos.filter(f => !f.notaEmitida && !f.reciboNome).length;

    // Saldo em aberto: soma os orçamentos fechados desse paciente e desconta os faturamentos já vinculados a cada um
    const orcamentos = await Orcamento.findAll({ where: { paciente_id: pacienteId, clinica_id: clinicaId, status: 'fechado' } });
    let saldoEmAberto = 0;
    if (orcamentos.length > 0) {
      const orcamentoIds = orcamentos.map(o => o.id);
      const pagosPorOrcamento = await Faturamento.findAll({
        where: { orcamentoId: { [Op.in]: orcamentoIds } },
        attributes: ['orcamentoId', 'valor'],
      });
      const pagoMap = {};
      pagosPorOrcamento.forEach(f => {
        pagoMap[f.orcamentoId] = (pagoMap[f.orcamentoId] || 0) + parseFloat(f.valor);
      });
      saldoEmAberto = orcamentos.reduce((soma, o) => {
        const valorTotal = Object.values(o.valores || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0);
        const valorPago = pagoMap[o.id] || 0;
        return soma + Math.max(0, valorTotal - valorPago);
      }, 0);
      saldoEmAberto = Math.round(saldoEmAberto * 100) / 100;
    }

    // Histórico real (valores efetivamente cobrados, não preço de tabela)
    const historico = faturamentos.slice(0, 50).map(f => ({
      id: f.id,
      data: f.data,
      descricao: f.descricao,
      procedimento: f.procedimento,
      valor: parseFloat(f.valor),
      formaPagamento: f.formaPagamento,
      notaEmitida: f.notaEmitida,
    }));

    // Série mensal (últimos 6 meses) para gráfico
    const hoje = new Date();
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({ ano: d.getFullYear(), mes: d.getMonth() + 1, label: d.toLocaleDateString('pt-BR', { month: 'short' }) });
    }
    const porMes = meses.map(({ ano, mes, label }) => {
      const total = faturamentos
        .filter(f => {
          const df = new Date(f.data + 'T00:00:00');
          return df.getFullYear() === ano && df.getMonth() + 1 === mes;
        })
        .reduce((s, f) => s + parseFloat(f.valor), 0);
      return { label, valor: Math.round(total * 100) / 100 };
    });

    res.json({ totalInvestido, totalNFs, totalPendentes, saldoEmAberto, historico, porMes });
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
  let { descricao, valor, data, formaPagamento, pacienteId, paciente_id, paciente, tipoPessoa, observacoes, cpf, declarar,
        maquinaCartaoId, parcelasCartao, cartaoAntecipado, taxaCartaoResponsavel, orcamentoId,
        pagadorNome, pagadorCpf, pagadorTipoPessoa } = req.body;
  // Aceita tanto pacienteId (camelCase, atributo real do model) quanto paciente_id (compat com clientes antigos)
  pacienteId = pacienteId || paciente_id || null;
  console.log('🔎 [DEBUG] Corpo da requisição faturamento:', req.body);
  const { Paciente, MaquinaCartao, TaxaMaquinaCartao, Despesa } = require('../models');
  // Se vier só nome, buscar o id
  if (!pacienteId && paciente) {
    const pacienteObj = await Paciente.findOne({ where: { nome: paciente } });
    pacienteId = pacienteObj ? pacienteObj.id : null;
  }
  // Se vier só id, buscar o nome
  if (pacienteId && !paciente) {
    const pacienteObj = await Paciente.findByPk(pacienteId);
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
      pacienteId,
      paciente,
      cpf,
      tipoPessoa,
      observacoes,
      pagadorNome: pagadorNome || null,
      pagadorCpf: pagadorCpf || null,
      pagadorTipoPessoa: pagadorTipoPessoa || null,
      declarar: declarar !== undefined ? Boolean(declarar) : true,
      orcamentoId: orcamentoId || null,
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
 * Emite Nota Fiscal via Focus NFe
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

    if (!clinica.focusNfeToken) {
      return res.status(422).json({
        success: false,
        message: 'Esta clínica ainda não foi cadastrada como empresa emissora na Focus NFe. Rode scripts/cadastrar_empresa_focus.js antes de emitir.',
        redirect: '/perfil',
      });
    }
    if (!clinica.itemListaServico || !clinica.codigoMunicipioIbge) {
      return res.status(422).json({
        success: false,
        message: `Complete os dados fiscais da clínica antes de emitir. Faltando: ${[!clinica.itemListaServico && 'Item da Lista de Serviço (LC 116)', !clinica.codigoMunicipioIbge && 'Código IBGE do Município'].filter(Boolean).join(', ')}.`,
        redirect: '/perfil',
      });
    }

    // Montar payload no formato da Focus NFe
    const nfsePayload = {
      data_emissao: new Date(faturamento.data || Date.now()).toISOString(),
      natureza_operacao: '1',
      optante_simples_nacional: ['1', '2'].includes(String(clinica.regimeTributario)),
      prestador: {
        cnpj: cnpjClinica,
        inscricao_municipal: inscricaoMunicipal,
        codigo_municipio: clinica.codigoMunicipioIbge,
      },
      tomador: {
        ...(isPJ ? { cnpj: cnpjTomador } : { cpf: cpfTomador }),
        razao_social: nomeTomador,
        ...(paciente?.email || faturamento.email ? { email: paciente?.email || faturamento.email } : {}),
      },
      servico: {
        valor_servicos: parseFloat(faturamento.valor),
        iss_retido: false,
        item_lista_servico: clinica.itemListaServico,
        discriminacao: clinica.descricaoPadraoNota || faturamento.descricao,
        codigo_municipio: clinica.codigoMunicipioIbge,
        // Municípios com provedor Ginfes/ABRASF (ex: São Bernardo do Campo) exigem
        // esses dois campos além do item_lista_servico padrão — São Paulo não usa.
        ...(clinica.aliquotaIssqn != null ? { aliquota: parseFloat(clinica.aliquotaIssqn) } : {}),
        ...(clinica.codigoTributarioMunicipio ? { codigo_tributario_municipio: clinica.codigoTributarioMunicipio } : {}),
      },
    };

    console.log('--- DEBUG NFS-e (Focus NFe) ---');
    console.log('CNPJ Clínica:', cnpjClinica);
    console.log('IM Clínica:', inscricaoMunicipal);
    console.log('Tomador:', isPJ ? `CNPJ: ${cnpjTomador}` : `CPF: ${cpfTomador}`);
    console.log('Nome Tomador:', nomeTomador);
    console.log('Valor:', faturamento.valor);
    console.log('Payload:', JSON.stringify(nfsePayload, null, 2));

    const { emitirNfse, aguardarAutorizacaoNfse } = require('../services/focusNfeService');
    const ref = faturamento.id;
    await emitirNfse(clinica.focusNfeToken, ref, nfsePayload);

    const resultado = await aguardarAutorizacaoNfse(clinica.focusNfeToken, ref);
    console.log('✅ Resposta Focus NFe:', JSON.stringify(resultado, null, 2));

    if (resultado.status === 'autorizado') {
      await faturamento.update({ notaEmitida: true, numeroNota: ref, statusNota: 'autorizado', erroNota: null });
      return res.json({ success: true, message: 'Nota Fiscal autorizada pela prefeitura!', data: resultado });
    }

    if (resultado.status === 'erro_autorizacao') {
      const mensagemErro = (resultado.erros || []).map((e) => e.mensagem).join(' ') || 'Erro não especificado.';
      await faturamento.update({ notaEmitida: false, numeroNota: null, statusNota: 'erro', erroNota: mensagemErro });
      return res.status(422).json({ success: false, message: `Nota rejeitada pela prefeitura: ${mensagemErro}`, data: resultado });
    }

    // Ainda processando depois das tentativas — cidade mais lenta que o normal.
    // Não marca como emitida; fica pra consultar de novo em /status-nota.
    await faturamento.update({ notaEmitida: false, numeroNota: ref, statusNota: 'processando', erroNota: null });
    return res.json({
      success: true,
      aindaProcessando: true,
      message: 'Nota enviada, a prefeitura ainda está processando. Confira o status em instantes.',
      data: resultado,
    });

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
 * Cancela Nota Fiscal na Focus NFe
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

    const { User, Clinica } = require('../models');
    const usuario = await User.findByPk(userId);
    const clinica = await Clinica.findByPk(usuario.clinicaId || usuario.clinica_id);
    if (!clinica?.focusNfeToken) {
      return res.status(422).json({ success: false, message: 'Clínica não cadastrada na Focus NFe.' });
    }

    console.log(`🗑️ Cancelando nota ${faturamento.numeroNota}...`);

    const { cancelarNfse } = require('../services/focusNfeService');
    const resultado = await cancelarNfse(clinica.focusNfeToken, faturamento.numeroNota, motivo);

    console.log('✅ Cancelamento resposta:', JSON.stringify(resultado, null, 2));

    await faturamento.update({ notaEmitida: false, numeroNota: null });

    return res.json({ success: true, message: 'Nota Fiscal cancelada com sucesso!', data: resultado });
  } catch (error) {
    console.error('Erro ao cancelar nota fiscal:');
    console.error('  Status:', error.response?.status);
    console.error('  Data:', JSON.stringify(error.response?.data, null, 2));
    return res.status(500).json({ success: false, message: 'Erro ao cancelar nota fiscal', error: error.response?.data || error.message });
  }
};

/**
 * Baixa PDF da Nota Fiscal via Focus NFe
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

    const { User, Clinica } = require('../models');
    const usuario = await User.findByPk(userId);
    const clinica = await Clinica.findByPk(usuario.clinicaId || usuario.clinica_id);
    if (!clinica?.focusNfeToken) {
      return res.status(422).json({ success: false, message: 'Clínica não cadastrada na Focus NFe.' });
    }

    console.log(`📄 Baixando PDF da nota ${faturamento.numeroNota}...`);
    const { consultarNfse } = require('../services/focusNfeService');
    const consulta = await consultarNfse(clinica.focusNfeToken, faturamento.numeroNota);
    if (!consulta.url_danfse) {
      return res.status(400).json({ success: false, message: `Nota ainda sem PDF disponível (status: ${consulta.status}).` });
    }

    const response = await axios.get(consulta.url_danfse, { responseType: 'arraybuffer' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=nota-${faturamento.numeroNota}.pdf`);
    res.send(response.data);
  } catch (error) {
    console.error('Erro ao baixar PDF:', error.response?.status, error.response?.data?.toString() || error.message);
    res.status(500).json({ success: false, message: 'Erro ao baixar PDF da nota fiscal' });
  }
};

/**
 * Reconsulta o status de uma nota que ficou "processando" (cidade mais lenta
 * que o normal) e atualiza o faturamento com o resultado real.
 * GET /api/faturamento/:id/status-nota
 */
exports.statusNotaFiscal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const faturamento = await Faturamento.findOne({ where: { id, userId } });
    if (!faturamento) return res.status(404).json({ success: false, message: 'Faturamento não encontrado' });

    if (faturamento.statusNota !== 'processando' || !faturamento.numeroNota) {
      return res.json({
        success: true,
        statusNota: faturamento.statusNota,
        notaEmitida: faturamento.notaEmitida,
        erroNota: faturamento.erroNota,
      });
    }

    const { User, Clinica } = require('../models');
    const usuario = await User.findByPk(userId);
    const clinica = await Clinica.findByPk(usuario.clinicaId || usuario.clinica_id);
    if (!clinica?.focusNfeToken) {
      return res.status(422).json({ success: false, message: 'Clínica não cadastrada na Focus NFe.' });
    }

    const { consultarNfse } = require('../services/focusNfeService');
    const consulta = await consultarNfse(clinica.focusNfeToken, faturamento.numeroNota);

    if (consulta.status === 'autorizado') {
      await faturamento.update({ notaEmitida: true, statusNota: 'autorizado', erroNota: null });
    } else if (consulta.status === 'erro_autorizacao') {
      const mensagemErro = (consulta.erros || []).map((e) => e.mensagem).join(' ') || 'Erro não especificado.';
      await faturamento.update({ notaEmitida: false, numeroNota: null, statusNota: 'erro', erroNota: mensagemErro });
    }

    return res.json({
      success: true,
      statusNota: faturamento.statusNota,
      notaEmitida: faturamento.notaEmitida,
      erroNota: faturamento.erroNota,
      data: consulta,
    });
  } catch (error) {
    console.error('Erro ao consultar status da nota:', error.response?.data || error.message);
    return res.status(500).json({ success: false, message: 'Erro ao consultar status da nota fiscal' });
  }
};

module.exports = exports;

