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
async function emitirNfse(clinicaToken, ref, payload) {
  const { data } = await axios.post(`${BASE_URL}/nfse?ref=${encodeURIComponent(ref)}`, payload, {
    headers: { ...authHeader(clinicaToken), 'Content-Type': 'application/json' },
  });
  return data;
}

async function consultarNfse(clinicaToken, ref) {
  const { data } = await axios.get(`${BASE_URL}/nfse/${encodeURIComponent(ref)}`, {
    headers: authHeader(clinicaToken),
  });
  return data;
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
async function aguardarAutorizacaoNfse(clinicaToken, ref, { orcamentoMs = 6000, intervaloMs = 1000 } = {}) {
  const inicio = Date.now();
  let ultimaConsulta = null;
  while (Date.now() - inicio < orcamentoMs) {
    await esperar(intervaloMs);
    ultimaConsulta = await consultarNfse(clinicaToken, ref);
    if (ultimaConsulta.status !== 'processando_autorizacao') return ultimaConsulta;
  }
  return ultimaConsulta;
}

async function cancelarNfse(clinicaToken, ref, justificativa) {
  const { data } = await axios.delete(`${BASE_URL}/nfse/${encodeURIComponent(ref)}`, {
    headers: { ...authHeader(clinicaToken), 'Content-Type': 'application/json' },
    data: { justificativa: justificativa || 'Cancelamento solicitado pelo prestador.' },
  });
  return data;
}

module.exports = { cadastrarEmpresa, definirProximoNumeroRps, emitirNfse, consultarNfse, aguardarAutorizacaoNfse, cancelarNfse };
