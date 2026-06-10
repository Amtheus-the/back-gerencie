/**
 * Controller de análise tributária
 * Utiliza IA da OpenAI para análise e recomendações
 */

const { analisarEstruturaTributaria } = require('../config/openai');

/**
 * Analisa dados financeiros e recomenda estrutura jurídica
 */
exports.analisarEstrutura = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      faturamentoMedio,
      despesasMedias,
      estruturaAtual,
      periodo,
      clinicaId,
      margemLucro // opcional, pode ser calculada
    } = req.body;

    // Calcula margem de lucro se não vier do frontend
    let margem = margemLucro;
    if (!margem && faturamentoMedio && despesasMedias) {
      margem = ((faturamentoMedio - despesasMedias) / faturamentoMedio * 100).toFixed(2);
    }

    const dadosFinanceiros = {
      faturamentoMedio: Number(faturamentoMedio),
      despesasMedias: Number(despesasMedias),
      margemLucro: Number(margem),
      periodo
    };

    // Chama a IA para análise
    const iaAnalise = await analisarEstruturaTributaria(dadosFinanceiros);

    // Salva análise no banco
    const Analise = require('../models/Analise');
    const novaAnalise = await Analise.create({
      clinicaId: clinicaId || null,
      userId,
      faturamentoMedio: Number(faturamentoMedio),
      despesasMedias: Number(despesasMedias),
      margemLucro: Number(margem),
      periodo,
      estruturaAtual: estruturaAtual || null,
      estruturaRecomendada: iaAnalise.dadosAnalisados.estruturaRecomendada || '',
      recomendacao: iaAnalise.recomendacao,
      economiaEstimada: iaAnalise.dadosAnalisados.economiaEstimada || ''
    });

    res.json({
      success: true,
      message: 'Análise realizada e salva com sucesso',
      data: novaAnalise
    });
  } catch (error) {
    console.error('Erro ao analisar estrutura:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao realizar análise tributária',
      error: error.message 
    });
  }
};

/**
 * Retorna histórico de análises realizadas
 */
exports.historicoAnalises = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // TODO: Buscar histórico do banco de dados
    
    const historico = [
      {
        id: '1',
        dataAnalise: '2025-11-06',
        estruturaRecomendada: 'Simples Nacional',
        economiaEstimada: 'R$ 2.500/mês'
      }
    ];

    res.json({
      success: true,
      count: historico.length,
      data: historico
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar histórico de análises' 
    });
  }
};

/**
 * Gera relatório financeiro completo
 */
exports.gerarRelatorio = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dataInicio, dataFim } = req.query;

    // TODO: Buscar e compilar dados do período
    
    const relatorio = {
      periodo: { dataInicio, dataFim },
      totalFaturamento: 45000.00,
      totalDespesas: 18000.00,
      lucroLiquido: 27000.00,
      margemLucro: 60,
      principaisDespesas: [
        { categoria: 'Aluguel', valor: 9000.00 },
        { categoria: 'Materiais', valor: 5000.00 },
        { categoria: 'Equipamentos', valor: 4000.00 }
      ],
      recomendacoes: 'Considere mudança para Simples Nacional'
    };

    res.json({
      success: true,
      data: relatorio
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao gerar relatório' 
    });
  }
};
