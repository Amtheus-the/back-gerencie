/**
 * Configuração da OpenAI para análise tributária
 */

const OpenAI = require('openai');

// Inicializa o cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analisa os dados financeiros e recomenda a melhor estrutura jurídica
 * @param {Object} dadosFinanceiros - Dados de despesas e faturamento
 * @returns {Promise<Object>} Recomendações da IA
 */
const analisarEstruturaTributaria = async (dadosFinanceiros) => {
  try {
    const prompt = `
      Você é um especialista em planejamento tributário para profissionais da saúde no Brasil.
      
      Analise os seguintes dados financeiros de um dentista:
      - Faturamento mensal médio: R$ ${dadosFinanceiros.faturamentoMedio}
      - Despesas mensais médias: R$ ${dadosFinanceiros.despesasMedias}
      - Margem de lucro: ${dadosFinanceiros.margemLucro}%
      
      Com base nestes dados, recomende:
      1. A melhor estrutura jurídica (MEI, Simples Nacional, Lucro Presumido ou Lucro Real)
      2. O regime tributário mais vantajoso
      3. Estimativa de economia fiscal
      4. Ações práticas para redução legal de impostos
      
      Forneça uma análise detalhada e fundamentada na legislação brasileira atual.
    `;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Você é um consultor tributário especializado em profissionais da saúde no Brasil.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return {
      recomendacao: completion.choices[0].message.content,
      dadosAnalisados: dadosFinanceiros,
      dataAnalise: new Date()
    };
  } catch (error) {
    console.error('Erro ao analisar estrutura tributária:', error);
    throw new Error('Não foi possível realizar a análise tributária');
  }
};

module.exports = {
  openai,
  analisarEstruturaTributaria
};
