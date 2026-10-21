/**
 * Controller do Chat com IA (Aline)
 *
 * A Aline é a assistente que ensina a usar o Gerencie Odonto: o que cada funcionalidade faz,
 * onde fica e o passo a passo. Ela NÃO dá orientação tributária e NÃO acessa dados da clínica —
 * só conhece o guia em services/ajudaSistema.js (atualize lá quando o sistema mudar).
 */

const OpenAI = require('openai');
const { montarPromptAjuda } = require('../services/ajudaSistema');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Limites pra controlar custo e abuso
const MAX_CARACTERES_MENSAGEM = 800;
const MAX_MENSAGENS_HISTORICO = 10;
const MAX_MENSAGENS_POR_DIA = 40;
const usoDiario = new Map(); // userId -> { dia, total }

function registrarUso(userId) {
  const hoje = new Date().toISOString().slice(0, 10);
  const atual = usoDiario.get(userId);
  if (!atual || atual.dia !== hoje) { usoDiario.set(userId, { dia: hoje, total: 1 }); return true; }
  atual.total += 1;
  return atual.total <= MAX_MENSAGENS_POR_DIA;
}

/**
 * Responde uma dúvida sobre o uso do sistema
 * Body: { message, conversationHistory: [{ sender: 'user'|'bot', text }] }
 */
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const message = String((req.body && req.body.message) || '').trim();
    const historico = Array.isArray(req.body && req.body.conversationHistory) ? req.body.conversationHistory : [];

    if (!message) {
      return res.status(400).json({ success: false, message: 'Mensagem vazia' });
    }
    if (message.length > MAX_CARACTERES_MENSAGEM) {
      return res.status(400).json({ success: false, message: `Mensagem muito longa (máximo ${MAX_CARACTERES_MENSAGEM} caracteres).` });
    }
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_ENABLE === 'false') {
      return res.json({ success: true, fallback: true, message: 'No momento não consigo responder. Tente de novo em instantes ou use a página **Sugestões** para falar com a equipe.' });
    }
    if (!registrarUso(userId)) {
      return res.json({ success: true, fallback: true, message: 'Você atingiu o limite de perguntas de hoje. Amanhã eu volto a responder! Se for urgente, use a página **Sugestões** para falar com a equipe.' });
    }

    // plano da clínica (pra responder sobre limites do plano grátis/Pro)
    let plano = 'FREE';
    try {
      const { Clinica } = require('../models');
      const clinica = req.user.clinicaId ? await Clinica.findByPk(req.user.clinicaId, { attributes: ['plano'] }) : null;
      plano = clinica?.plano || 'FREE';
    } catch (e) { /* segue com o padrão */ }

    const contexto = historico
      .filter((m) => m && m.sender && typeof m.text === 'string' && m.text.trim())
      .slice(-MAX_MENSAGENS_HISTORICO)
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text.slice(0, 1500) }));

    const completion = await openai.chat.completions.create({
      // modelo próprio da ajuda (um modelo fraco inventa botões que não existem); troque por OPENAI_MODEL_AJUDA
      model: process.env.OPENAI_MODEL_AJUDA || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: montarPromptAjuda({
            nome: req.user.nome, role: req.user.role, tipoPessoa: req.user.tipoPessoa,
            plano, permissoes: req.user.permissoes,
          }),
        },
        ...contexto,
        { role: 'user', content: message },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    res.json({ success: true, message: completion.choices[0].message.content });
  } catch (error) {
    console.error('❌ [Chat] Erro:', error.message);
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({ success: false, message: 'Assistente indisponível no momento.' });
    }
    res.status(500).json({ success: false, message: 'Não consegui responder agora. Tente de novo em instantes.' });
  }
};

/**
 * Marca que o usuário já não é mais primeiro acesso
 */
exports.markNotFirstAccess = async (req, res) => {
  try {
    const { User } = require('../models');
    const userId = req.user.id;

    await User.update(
      { primeiroAcesso: false },
      { where: { id: userId } }
    );

    console.log('✅ [Chat] Usuário marcado como não-primeiro acesso:', userId);

    res.json({
      success: true,
      message: 'Primeiro acesso marcado como concluído'
    });

  } catch (error) {
    console.error('❌ [Chat] Erro ao marcar primeiro acesso:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar primeiro acesso'
    });
  }
};

/**
 * Consulta fiscal sobre dedutibilidade de despesas
 */
exports.consultarDedutibilidade = async (req, res) => {
  try {
    const { despesa } = req.body;

    console.log('🔍 [Consulta Fiscal] Despesa:', despesa);

    if (!despesa || despesa.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Informe a despesa para análise'
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ [Consulta Fiscal] OPENAI_API_KEY não configurada!');
      return res.status(500).json({
        success: false,
        message: 'Chave da OpenAI não configurada no servidor'
      });
    }

    // ⚠️ FALLBACK: Se OPENAI_ENABLE=false, retorna mensagem de manutenção
    if (process.env.OPENAI_ENABLE === 'false') {
      console.log('⚠️ [Consulta Fiscal] OpenAI desabilitada - retornando fallback');
      return res.json({
        success: true,
        resposta: '🔧 **Consulta Fiscal Temporariamente Indisponível**\n\nEstamos resolvendo um problema técnico com nosso sistema de IA. Em breve este recurso estará disponível novamente!\n\n💡 **Enquanto isso:**\n- Continue registrando suas despesas normalmente\n- Consulte seu contador para dúvidas urgentes\n- Todas as outras funcionalidades estão operacionais\n\n😊 Obrigado pela compreensão!',
        fallback: true
      });
    }

    const prompt = `Você é um especialista em tributação para clínicas odontológicas no Brasil.

Analise se a seguinte despesa é dedutível do Imposto de Renda para um dentista:

"${despesa}"

Forneça uma resposta clara e objetiva seguindo este formato:

📋 **Análise Fiscal:**

[Responda se é DEDUTÍVEL ou NÃO DEDUTÍVEL]

**Justificativa:**
[Explique o motivo de forma simples, citando se está relacionada à atividade profissional]

**Requisitos para dedução:**
✅ [Liste os requisitos caso seja dedutível]

**Exemplos similares:**
- [Liste 2-3 exemplos similares]

⚠️ **Importante:** Consulte seu contador para confirmação específica do seu caso, pois cada situação pode ter particularidades.

Seja direto, didático e use emojis para tornar a resposta mais amigável.`;

    console.log('🤖 [Consulta Fiscal] Consultando OpenAI...');

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um especialista tributário para clínicas odontológicas.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    const resposta = completion.choices[0].message.content;

    console.log('✅ [Consulta Fiscal] Resposta gerada');

    res.json({
      success: true,
      resposta: resposta,
      tokensUsed: completion.usage.total_tokens
    });

  } catch (error) {
    console.error('❌ [Consulta Fiscal] Erro:', error);
    console.error('❌ [Consulta Fiscal] Erro completo:', JSON.stringify(error, null, 2));
    
    // Erro 429 - Rate Limit ou Quota Exceeded
    if (error.status === 429 || error.code === 'rate_limit_exceeded' || error.code === 'insufficient_quota') {
      const errorMessage = error.message || '';
      
      // Verifica se é rate limit (TPM/RPM) ou quota mensal
      if (errorMessage.includes('quota')) {
        console.error('💸 [Consulta Fiscal] Erro de QUOTA MENSAL');
        return res.status(402).json({
          success: false,
          message: '⚠️ Limite de uso da OpenAI atingido. Estamos resolvendo isso. Tente novamente mais tarde.',
          errorCode: 'OPENAI_QUOTA_EXCEEDED',
          details: error.message
        });
      } else {
        console.error('⏱️ [Consulta Fiscal] Erro de RATE LIMIT (RPM/TPM)');
        return res.status(429).json({
          success: false,
          message: '⏱️ Muitas solicitações simultâneas. Aguarde alguns segundos e tente novamente.',
          errorCode: 'OPENAI_RATE_LIMIT',
          retryAfter: 30
        });
      }
    }

    // Erro 401 - Chave inválida
    if (error.status === 401) {
      console.error('🔑 [Consulta Fiscal] Chave API inválida');
      return res.status(401).json({
        success: false,
        message: 'Chave da API OpenAI inválida. Entre em contato com o suporte.',
        errorCode: 'OPENAI_INVALID_KEY'
      });
    }

    // Erro genérico
    console.error('🔥 [Consulta Fiscal] Erro desconhecido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar consulta. Tente novamente.',
      error: error.message,
      errorCode: 'OPENAI_GENERIC_ERROR'
    });
  }
};

