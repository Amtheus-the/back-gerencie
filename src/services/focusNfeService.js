/**
 * Integração com a Focus NFe (substitui a Nuvem Fiscal, que saiu do ar).
 *
 * Diferença importante de arquitetura: a Focus NFe não usa um token único
 * pra todas as clínicas. Cada clínica precisa ser cadastrada como "empresa"
 * (cadastrarEmpresa, com certificado digital) e recebe um token próprio
 * (clinica.focusNfeToken) — é esse token que autentica a emissão/consulta/
 * cancelamento de NFS-e daquela clínica específica.
 */
const axios = require('axios');

const AMBIENTE = process.env.FOCUS_NFE_AMBIENTE || 'producao';
const BASE_URL = AMBIENTE === 'homologacao'
  ? 'https://homologacao.focusnfe.com.br/v2'
  : 'https://api.focusnfe.com.br/v2';

const MASTER_TOKEN = process.env.FOCUS_NFE_TOKEN;

function authHeader(token) {
  return { Authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}` };
}

/**
 * Cadastra a clínica como empresa emissora na Focus NFe.
 * Devolve o payload da Focus, que inclui token_producao/token_homologacao —
 * quem chama precisa salvar isso em clinica.focusNfeToken.
 */
async function cadastrarEmpresa({
  nome, cnpj, cpf, logradouro, numero, bairro, municipio, uf, cep,
  codigoMunicipio, regimeTributario, inscricaoMunicipal, email,
  certificadoBase64, senhaCertificado,
}) {
  if (!MASTER_TOKEN) throw new Error('FOCUS_NFE_TOKEN (token mestre da conta) não configurado no .env');

  const payload = {
    nome,
    ...(cnpj ? { cnpj } : { cpf }),
    logradouro,
    numero,
    bairro,
    municipio,
    uf,
    cep,
    codigo_municipio: codigoMunicipio,
    regime_tributario: regimeTributario,
    inscricao_municipal: inscricaoMunicipal,
    email,
    habilita_nfse: true,
    arquivo_certificado_base64: certificadoBase64,
    senha_certificado: senhaCertificado,
  };

  const { data } = await axios.post(`${BASE_URL}/empresas`, payload, {
    headers: { ...authHeader(MASTER_TOKEN), 'Content-Type': 'application/json' },
  });
  return data;
}

/**
 * Ajusta o próximo número de RPS da empresa. Necessário sempre que a clínica
 * já emitiu NFS-e antes por outro sistema — em São Paulo, reaproveitar um
 * número de RPS já usado há mais de 6 meses é rejeitado pela prefeitura
 * ("Operação não autorizada por meio eletrônico em razão de ultrapassado o
 * prazo permitido"). Cadastro novo sempre começa do 1, então precisa ser
 * ajustado pra continuar de onde a numeração real da clínica parou.
 */
async function definirProximoNumeroRps(empresaId, proximoNumero) {
  if (!MASTER_TOKEN) throw new Error('FOCUS_NFE_TOKEN (token mestre da conta) não configurado no .env');
  const { data } = await axios.put(`${BASE_URL}/empresas/${empresaId}`, {
    proximo_numero_nfse_producao: String(proximoNumero),
  }, {
    headers: { ...authHeader(MASTER_TOKEN), 'Content-Type': 'application/json' },
  });
  return data;
}

/**
 * Emite a NFS-e. `ref` é um identificador único que a gente escolhe (usamos
 * o id do faturamento) — é ele que depois consulta/cancela a nota.
 */
// `nacional: true` → Ambiente Nacional (/v2/nfsen, layout DPS); senão a NFS-e municipal (/v2/nfse).
const rota = (nacional) => (nacional ? 'nfsen' : 'nfse');

async function emitirNfse(clinicaToken, ref, payload, { nacional = false } = {}) {
  const { data } = await axios.post(`${BASE_URL}/${rota(nacional)}?ref=${encodeURIComponent(ref)}`, payload, {
    headers: { ...authHeader(clinicaToken), 'Content-Type': 'application/json' },
  });
  return data;
}

async function consultarNfse(clinicaToken, ref, { nacional = false } = {}) {
  const { data } = await axios.get(`${BASE_URL}/${rota(nacional)}/${encodeURIComponent(ref)}`, {
    headers: authHeader(clinicaToken),
  });
  return data;
}

/**
 * Monta o payload da NFS-e Nacional (DPS) — formato PLANO da Focus (POST /v2/nfsen).
 * Campos conforme o exemplo oficial da Focus e campos.focusnfe.com.br/nfse_nacional/EmissaoDPSXml.html.
 *
 * ATENÇÃO — pontos ainda NÃO validados contra a prefeitura (confirmar na 1ª emissão real):
 *  • numero_dps/serie_dps: omitidos (o exemplo da Focus também omite; a Focus numera).
 *  • grupo IBS/CBS (leiaute 2): a rejeição de 01/11/2026 cita o leiaute 2; os valores abaixo
 *    (CST 000 / cClassTrib 000001) são o padrão "tributação integral" e podem precisar de ajuste.
 */
function derivarCodigoTributacaoNacional(clinica) {
  if (clinica.codigoTributacaoNacional) return String(clinica.codigoTributacaoNacional).replace(/\D/g, '');
  // item da LC 116 ("4.12", "0412", "04.12") → item(2) + subitem(2) + desdobro "01"
  // só aceita formatos inequívocos ("4.12", "04.12", "0412"); códigos municipais (ex: SP "02692") não derivam
  const item = String(clinica.itemListaServico || '').trim();
  if (/^\d{6}$/.test(item)) return item; // já é um cTribNac
  const m = item.match(/^(\d{1,2})\.(\d{2})$/) || item.match(/^(\d{2})(\d{2})$/);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 40) return null;
  return `${m[1].padStart(2, '0')}${m[2]}01`;
}

function dataHoraBrasilia(date = new Date()) {
  const br = new Date(date.getTime() - 3 * 3600 * 1000);
  return `${br.toISOString().slice(0, 19)}-0300`;
}

function montarDpsNacional({ clinica, faturamento, tomador, descricao }) {
  const regime = String(clinica.regimeTributario || '');
  const opcaoSimples = regime === '4' ? 2 : ['1', '2'].includes(regime) ? 3 : 1; // 1 não optante · 2 MEI · 3 ME/EPP
  const cTribNac = derivarCodigoTributacaoNacional(clinica);
  if (!cTribNac) {
    const e = new Error('Informe o Código de Tributação Nacional da clínica (ex: 041201 para Odontologia) ou o Item da Lista de Serviço (LC 116).');
    e.status = 422;
    throw e;
  }
  const ibge = Number(clinica.codigoMunicipioIbge);
  const hojeBR = dataHoraBrasilia().slice(0, 10);
  const competencia = String(faturamento.data || hojeBR).slice(0, 10);
  const documentoPrestador = String(clinica.cnpj || '').replace(/\D/g, '');

  const dps = {
    // 1 min no passado: a DPS não pode ter data/hora posterior ao relógio do servidor da prefeitura
    data_emissao: dataHoraBrasilia(new Date(Date.now() - 60 * 1000)),
    data_competencia: competencia > hojeBR ? hojeBR : competencia,
    codigo_municipio_emissora: ibge,
    cnpj_prestador: documentoPrestador,
    ...(clinica.inscricaoMunicipal ? { inscricao_municipal_prestador: String(clinica.inscricaoMunicipal).replace(/\D/g, '') } : {}),
    codigo_opcao_simples_nacional: opcaoSimples,
    ...(opcaoSimples === 3 ? { regime_tributario_simples_nacional: regime === '2' ? 2 : 1 } : {}),
    regime_especial_tributacao: 0,

    ...(tomador.documento.length === 14 ? { cnpj_tomador: tomador.documento } : { cpf_tomador: tomador.documento }),
    razao_social_tomador: tomador.nome,
    ...(tomador.email ? { email_tomador: tomador.email } : {}),
    ...(tomador.endereco ? {
      codigo_municipio_tomador: Number(tomador.endereco.codigo_municipio),
      cep_tomador: tomador.endereco.cep,
      logradouro_tomador: tomador.endereco.logradouro,
      numero_tomador: tomador.endereco.numero,
      ...(tomador.endereco.complemento ? { complemento_tomador: tomador.endereco.complemento } : {}),
      bairro_tomador: tomador.endereco.bairro,
    } : {}),

    codigo_municipio_prestacao: ibge,
    codigo_tributacao_nacional_iss: cTribNac,
    descricao_servico: String(descricao || '').slice(0, 1000),
    valor_servico: parseFloat(faturamento.valor),
    ...(clinica.aliquotaIssqn != null ? { percentual_aliquota_relativa_municipio: parseFloat(clinica.aliquotaIssqn) } : {}),
    tributacao_iss: 1,        // 1 = operação tributável
    tipo_retencao_iss: 1,     // 1 = ISS não retido
    indicador_total_tributacao: '0',

    // Reforma tributária — leiaute 2 (ver aviso no topo da função)
    finalidade_emissao: 0,
    consumidor_final: 1,
    // cIndOp (Anexo VII): saúde (item 04 da LC 116) = serviço físico sobre a pessoa no estabelecimento do
    // prestador; demais serviços (ex: software) = "demais serviços onerosos" (domicílio do adquirente).
    codigo_indicador_operacao: cTribNac.startsWith('04') ? '030101' : '100301',
    indicador_destinatario: 0,
    ibs_cbs_situacao_tributaria: '000',
    ibs_cbs_classificacao_tributaria: '000001',
  };
  return dps;
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fica consultando a nota até ela sair de "processando_autorizacao" ou
 * estourar o orçamento de tempo. A emissão em si é assíncrona (a prefeitura
 * processa depois) — sem isso, o sistema marcaria a nota como "emitida"
 * mesmo quando a prefeitura ainda vai rejeitar.
 *
 * Usa um orçamento de tempo (não um nº fixo de tentativas) porque o
 * frontend tem timeout de 10s na requisição — precisa garantir que o
 * backend sempre responde antes disso, não importa quanto cada consulta
 * individual demorou.
 */
async function aguardarAutorizacaoNfse(clinicaToken, ref, { orcamentoMs = 6000, intervaloMs = 1000, nacional = false } = {}) {
  const inicio = Date.now();
  let ultimaConsulta = null;
  while (Date.now() - inicio < orcamentoMs) {
    await esperar(intervaloMs);
    ultimaConsulta = await consultarNfse(clinicaToken, ref, { nacional });
    if (ultimaConsulta.status !== 'processando_autorizacao') return ultimaConsulta;
  }
  return ultimaConsulta;
}

async function cancelarNfse(clinicaToken, ref, justificativa, { nacional = false } = {}) {
  const { data } = await axios.delete(`${BASE_URL}/${rota(nacional)}/${encodeURIComponent(ref)}`, {
    headers: { ...authHeader(clinicaToken), 'Content-Type': 'application/json' },
    data: { justificativa: justificativa || 'Cancelamento solicitado pelo prestador.' },
  });
  return data;
}

// Cache em memória (dura o processo) — evita bater na API do IBGE de novo pra
// cada nota quando várias notas seguidas são da mesma cidade (o comum).
const _cacheIbge = new Map();

/**
 * Resolve o código IBGE (7 dígitos) de uma cidade a partir do nome + UF,
 * usando a API pública do IBGE. Usado pra preencher o endereço do tomador
 * na nota — sem isso o endereço fica sem o codigo_municipio obrigatório.
 * Devolve null se não achar (endereço do tomador então é omitido).
 */
async function buscarCodigoMunicipioIbge(cidade, uf) {
  if (!cidade || !uf) return null;
  const chave = `${cidade.trim().toLowerCase()}|${uf.trim().toUpperCase()}`;
  if (_cacheIbge.has(chave)) return _cacheIbge.get(chave);

  try {
    const { data } = await axios.get(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
    const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const alvo = normalizar(cidade);
    const encontrado = data.find((m) => normalizar(m.nome) === alvo);
    const codigo = encontrado ? String(encontrado.id) : null;
    _cacheIbge.set(chave, codigo);
    return codigo;
  } catch (err) {
    console.error('[focusNfeService] Erro ao buscar código IBGE:', err.message);
    return null;
  }
}

module.exports = {
  cadastrarEmpresa, definirProximoNumeroRps, emitirNfse, consultarNfse,
  aguardarAutorizacaoNfse, cancelarNfse, buscarCodigoMunicipioIbge,
  montarDpsNacional, derivarCodigoTributacaoNacional,
};
