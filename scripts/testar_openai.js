/**
 * Script para testar a API da OpenAI e verificar limites
 */

require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testarAPI() {
  try {
    console.log('🔍 Testando conexão com OpenAI...');
    console.log('🔑 API Key presente:', !!process.env.OPENAI_API_KEY);
    console.log('🤖 Modelo configurado:', process.env.OPENAI_MODEL || 'gpt-4');
    console.log('');

    // Teste simples
    console.log('📤 Enviando requisição de teste...');
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um assistente útil.' },
        { role: 'user', content: 'Responda apenas "OK" se você está funcionando.' }
      ],
      max_tokens: 10
    });

    console.log('✅ Teste bem-sucedido!');
    console.log('📝 Resposta:', completion.choices[0].message.content);
    console.log('');
    console.log('📊 Informações de uso:');
    console.log('  • Tokens usados:', completion.usage.total_tokens);
    console.log('  • Prompt tokens:', completion.usage.prompt_tokens);
    console.log('  • Completion tokens:', completion.usage.completion_tokens);
    console.log('  • Modelo usado:', completion.model);
    console.log('');
    console.log('✅ A API está funcionando normalmente!');
    process.exit(0);

  } catch (error) {
    console.error('❌ ERRO ao testar API:');
    console.error('');
    console.error('🔴 Código do erro:', error.status || error.code);
    console.error('📝 Mensagem:', error.message);
    console.error('');

    if (error.status === 429) {
      console.error('⚠️ ERRO 429 - RATE LIMIT OU QUOTA EXCEDIDA');
      console.error('');
      console.error('Possíveis causas:');
      console.error('  1. ❌ Limite de requisições por minuto (RPM) excedido');
      console.error('  2. ❌ Limite de tokens por minuto (TPM) excedido');
      console.error('  3. ❌ Quota mensal excedida');
      console.error('  4. ❌ Limites específicos do projeto');
      console.error('');
      console.error('📋 Detalhes do erro completo:');
      console.error(JSON.stringify(error, null, 2));
      console.error('');
      console.error('💡 SOLUÇÃO:');
      console.error('  • Verifique seu dashboard: https://platform.openai.com/usage');
      console.error('  • Verifique limites de rate: https://platform.openai.com/account/rate-limits');
      console.error('  • Entre em contato com o suporte da OpenAI');
    } else if (error.status === 401) {
      console.error('⚠️ ERRO 401 - CHAVE API INVÁLIDA');
      console.error('');
      console.error('💡 SOLUÇÃO:');
      console.error('  • Verifique se a chave API no .env está correta');
      console.error('  • Gere uma nova chave em: https://platform.openai.com/api-keys');
    } else {
      console.error('⚠️ ERRO DESCONHECIDO');
      console.error('');
      console.error('📋 Detalhes completos:');
      console.error(JSON.stringify(error, null, 2));
    }

    process.exit(1);
  }
}

testarAPI();
