const axios = require('axios');

async function getNuvemFiscalToken() {
  const clientId = process.env.NUVEMFISCAL_CLIENT_ID;
  const clientSecret = process.env.NUVEMFISCAL_CLIENT_SECRET;
  const tokenUrl = 'https://auth.nuvemfiscal.com.br/oauth/token'; // URL correta!

  console.log('🔐 [NuvemFiscal] Iniciando autenticação...');
  console.log('🔑 CLIENT_ID:', clientId ? `"${clientId}"` : '❌ VAZIO');
  console.log('🔑 CLIENT_SECRET (primeiros 6):', clientSecret ? `"${clientSecret.slice(0, 6)}..." (len=${clientSecret.length})` : '❌ VAZIO');
  console.log('🌐 URL do token:', tokenUrl);

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', 'cep cnpj nfse');

  try {
    const response = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    console.log('✅ [NuvemFiscal] Token obtido com sucesso!');
    return response.data.access_token;
  } catch (err) {
    console.error('❌ [NuvemFiscal] Erro ao obter token:');
    console.error('   Status:', err.response?.status);
    console.error('   Resposta:', JSON.stringify(err.response?.data, null, 2));
    throw err;
  }
}

module.exports = { getNuvemFiscalToken };
