/**
 * Verifica e persiste o status de inadimplência da clínica junto ao Asaas.
 * Usado no login e sempre que a tela de faturas é consultada, pra manter
 * o campo Clinica.inadimplente razoavelmente atualizado sem depender de webhook.
 */
const axios = require('axios');

const _rawKey = process.env.ASAAS_API_KEY || '';
const ASAAS_API_KEY = _rawKey.startsWith('$') ? _rawKey : '$' + _rawKey;
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

const asaasHeaders = {
  'Content-Type': 'application/json',
  'access_token': ASAAS_API_KEY,
};

/**
 * Consulta as cobranças da clínica no Asaas, atualiza clinica.inadimplente
 * e retorna o valor booleano atualizado. Nunca lança erro — se o Asaas
 * falhar, mantém o status atual salvo no banco (fail-safe).
 */
async function atualizarStatusInadimplencia(clinica) {
  if (!clinica?.asaasCustomerId) return clinica?.inadimplente || false;

  try {
    const resposta = await axios.get(
      `${ASAAS_API_URL}/payments?customer=${clinica.asaasCustomerId}&status=OVERDUE`,
      { headers: asaasHeaders }
    );
    const temVencida = (resposta.data?.data?.length || 0) > 0;

    if (temVencida !== clinica.inadimplente) {
      await clinica.update({
        inadimplente: temVencida,
        inadimplenteDesde: temVencida ? (clinica.inadimplenteDesde || new Date()) : null,
      });
    }
    return temVencida;
  } catch (err) {
    console.error('[Asaas] Falha ao verificar inadimplência da clínica', clinica.id, ':', err.response?.data || err.message);
    return clinica.inadimplente || false;
  }
}

module.exports = { atualizarStatusInadimplencia };
