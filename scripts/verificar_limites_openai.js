/**
 * Script para verificar uso diário de tokens da OpenAI
 * Baseado nas informações do suporte: 2.5M tokens/dia para gpt-4o-mini (tier 1)
 */

require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function verificarLimitesUso() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 VERIFICAÇÃO DE LIMITES DA OPENAI');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('🔑 Informações da Configuração:');
  console.log(`  • API Key: ${process.env.OPENAI_API_KEY?.substring(0, 20)}...`);
  console.log(`  • Modelo configurado: ${process.env.OPENAI_MODEL || 'gpt-4'}`);
  console.log('');

  console.log('📋 Limites para gpt-4o-mini (Tier 1):');
  console.log('  • Limite DIÁRIO: 2.500.000 tokens');
  console.log('  • Reset: 00:00 UTC (21:00 horário de Brasília)');
  console.log('  • Shared com outros modelos "mini"');
  console.log('');

  console.log('⚠️ DIAGNÓSTICO DO ERRO 429 - insufficient_quota:');
  console.log('');
  console.log('Possíveis causas identificadas pelo suporte:');
  console.log('');
  console.log('1️⃣ LIMITE DIÁRIO DE TOKENS (Mais provável)');
  console.log('   ❌ Você atingiu 2.5M tokens hoje no gpt-4o-mini');
  console.log('   ⏰ Aguarde até 00:00 UTC (21:00 BRT) para reset');
  console.log('   📍 Verifique em: https://platform.openai.com/usage');
  console.log('');
  console.log('2️⃣ QUOTA ESPECÍFICA DO PROJETO');
  console.log('   ❌ Sua chave/projeto pode ter limite menor');
  console.log('   🔍 Verifique em: https://platform.openai.com/account/limits');
  console.log('');
  console.log('3️⃣ CRÉDITOS TRIAL EXPIRADOS');
  console.log('   ❌ Créditos gratuitos expiraram');
  console.log('   💳 Configure método de pagamento');
  console.log('');
  console.log('4️⃣ RATE LIMITS (RPM/TPM)');
  console.log('   ❌ Muitas requisições por minuto');
  console.log('   ⏳ Aguarde alguns minutos');
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('💡 SOLUÇÕES RECOMENDADAS:');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('🔄 SOLUÇÃO IMEDIATA (escolha uma):');
  console.log('');
  console.log('A) Trocar para modelo com mais quota:');
  console.log('   • gpt-3.5-turbo (limites maiores, mais barato)');
  console.log('   • gpt-4o (se tiver acesso)');
  console.log('');
  console.log('B) Aguardar reset diário:');
  console.log('   • Próximo reset: 00:00 UTC');
  console.log('   • Horário de Brasília: 21:00');
  console.log('');
  console.log('C) Implementar cache/fallback:');
  console.log('   • Cachear respostas comuns');
  console.log('   • Ter modelo de backup');
  console.log('');

  console.log('📝 AÇÕES A FAZER:');
  console.log('');
  console.log('1. Acesse: https://platform.openai.com/usage');
  console.log('   → Expanda "Rate limits"');
  console.log('   → Verifique uso diário de gpt-4o-mini');
  console.log('');
  console.log('2. Acesse: https://platform.openai.com/account/limits');
  console.log('   → Verifique limites do projeto');
  console.log('   → Verifique se há quotas personalizadas');
  console.log('');
  console.log('3. Acesse: https://platform.openai.com/account/billing');
  console.log('   → Confirme método de pagamento ativo');
  console.log('   → Verifique se créditos trial expiraram');
  console.log('');

  console.log('═══════════════════════════════════════════════════════════\n');

  // Tentar fazer uma requisição de teste
  console.log('🧪 Tentando fazer requisição de teste...\n');
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Testando com modelo alternativo
      messages: [
        { role: 'user', content: 'Responda apenas: OK' }
      ],
      max_tokens: 5
    });

    console.log('✅ SUCESSO! O modelo gpt-3.5-turbo está funcionando!');
    console.log(`📝 Resposta: ${completion.choices[0].message.content}`);
    console.log(`🎯 Tokens usados: ${completion.usage.total_tokens}`);
    console.log('');
    console.log('💡 RECOMENDAÇÃO: Troque para gpt-3.5-turbo temporariamente!');
    console.log('   No seu .env, mude: OPENAI_MODEL=gpt-3.5-turbo');
    
  } catch (error) {
    if (error.status === 429) {
      console.log('❌ ERRO 429 - Ainda com limite excedido');
      console.log('');
      console.log('🔴 TODOS os modelos estão bloqueados!');
      console.log('');
      console.log('Isso indica:');
      console.log('  • Você atingiu o limite TOTAL da conta (não só do gpt-4o-mini)');
      console.log('  • OU créditos trial expiraram');
      console.log('  • OU projeto/chave com quota zero');
      console.log('');
      console.log('💡 AÇÃO URGENTE:');
      console.log('  1. Verifique billing: https://platform.openai.com/account/billing');
      console.log('  2. Adicione/valide método de pagamento');
      console.log('  3. Entre em contato com suporte OpenAI');
    } else {
      console.log('❌ Erro:', error.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
}

verificarLimitesUso().catch(console.error);
