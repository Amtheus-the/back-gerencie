/**
 * Controller do Dashboard
 * Gerencia métricas, cálculos fiscais e dados consolidados
 */

const { User, Faturamento, Despesa } = require('../models');
const { Paciente } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

/**
 * Retorna métricas consolidadas do dashboard para um período
 */
exports.getMetricas = async (req, res) => {
  try {
    console.log('[DASHBOARD] getMetricas iniciado');
    const userId = req.user.id;
    const clinicaId = req.user.clinicaId;
    console.log('[DASHBOARD] clinicaId:', clinicaId);
    const { mes, ano } = req.query;

    // Se não informar mês/ano, usa o mês atual
    const dataAtual = new Date();
    const mesConsulta = mes || (dataAtual.getMonth() + 1);
    const anoConsulta = ano || dataAtual.getFullYear();

    console.log('[DASHBOARD] buscando aniversariantes...');
    // === ANIVERSARIANTES DO MÊS ===
    const aniversariantesMes = await Paciente.findAll({
      where: {
        clinica_id: clinicaId,
        dataNascimento: { [Op.ne]: null },
        [Op.and]: sequelize.where(sequelize.fn('MONTH', sequelize.col('data_nascimento')), mesConsulta)
      },
      attributes: ['id', 'nome', 'dataNascimento', 'telefone'],
      order: [
        [sequelize.fn('DAY', sequelize.col('data_nascimento')), 'ASC']
      ]
    });

    // Define início e fim do período
    const dataInicio = new Date(anoConsulta, mesConsulta - 1, 1);
    const dataFim = new Date(anoConsulta, mesConsulta, 0);

    console.log('[DASHBOARD] aniversariantes ok, buscando faturamentos...');
    // Busca faturamentos PF do período
    const faturamentosPF = await Faturamento.findAll({
      where: {
        clinicaId,
        tipoPessoa: 'PF',
        data: { [Op.between]: [dataInicio, dataFim] }
      }
    });

    // Busca faturamentos PJ do período
    const faturamentosPJ = await Faturamento.findAll({
      where: {
        clinicaId,
        tipoPessoa: 'PJ',
        data: { [Op.between]: [dataInicio, dataFim] }
      }
    });

    // Busca despesas do período
    const despesas = await Despesa.findAll({
      where: {
        clinicaId,
        data: { [Op.between]: [dataInicio, dataFim] }
      }
    });

    // Agrupa despesas pelo campo 'categoria'
    const despesasAgrupadasObj = despesas.reduce((acc, d) => {
      const categoria = d.categoria || 'Sem Categoria';
      const valor = parseFloat(d.valor);
      if (!acc[categoria]) {
        acc[categoria] = 0;
      }
      acc[categoria] += valor;
      return acc;
    }, {});

    // Transforma o objeto agrupado em um array no formato { name: 'Categoria', value: Total }
    const despesasIndividuais = Object.keys(despesasAgrupadasObj).map(name => ({
      name: name,
      value: despesasAgrupadasObj[name]
    }));

    // Mantém o agrupamento antigo para compatibilidade, mas pode ser removido
    const despesasPorCategoria = [];
    // Calcula totais
    const rendimentosPF = faturamentosPF.reduce((sum, f) => sum + parseFloat(f.valor), 0);
    const faturamentoPJ = faturamentosPJ.reduce((sum, f) => sum + parseFloat(f.valor), 0);
    const totalDespesas = despesas.reduce((sum, d) => sum + parseFloat(d.valor), 0);

    // ===== RBT12 (Receita Bruta dos últimos 12 meses) - EXCLUI O MÊS ATUAL =====
    // Calcula retrocedendo 365 dias a partir do 1º do mês anterior
    // (igual ao sistema legado: timedelta(days=365) a partir do 1º do mês anterior)
    const primeiroDiaMesAtual = new Date(anoConsulta, mesConsulta - 1, 1);
    const ultimoDiaMesAnterior = new Date(primeiroDiaMesAtual.getTime() - 1); // Último dia do mês anterior

    const primeiroDiaMesAnterior = new Date(anoConsulta, mesConsulta - 2, 1);
    const dataInicioRbt12Raw = new Date(primeiroDiaMesAnterior.getTime() - 365 * 24 * 60 * 60 * 1000);
    const dataInicioRbt12 = new Date(dataInicioRbt12Raw.getFullYear(), dataInicioRbt12Raw.getMonth(), 1);

    const faturamentosPJ12Meses = await Faturamento.findAll({
      where: {
        clinicaId,
        tipoPessoa: 'PJ',
        data: { [Op.between]: [dataInicioRbt12, ultimoDiaMesAnterior] }
      }
    });

    const rbt12 = faturamentosPJ12Meses.reduce((sum, f) => sum + parseFloat(f.valor), 0);

    // ===== CÁLCULOS FISCAIS =====

    // 1. PESSOA FÍSICA - Carnê-Leão / DARF
    // DNZ: Valor necessário de despesa dedutível para zerar o DARF
    // Calcula qual valor de despesa dedutível (pagamentos) zeraria o imposto
    let dnz = 0;
    if (rendimentosPF > 0) {
      // Testa valores centavo a centavo para máxima precisão
      let testeDespesa = 0;
      let passo = 0.01;
      let maxDespesa = rendimentosPF;
      let dnzNecessario = 0;
      while (testeDespesa <= maxDespesa) {
        const baseCalculo = Math.max(0, rendimentosPF - testeDespesa);
        const imposto = calcular_irrf(baseCalculo);
        if (imposto <= 0) {
          dnzNecessario = testeDespesa;
          break;
        }
        testeDespesa += passo;
      }
      // O DNZ agora é o valor adicional necessário, considerando as despesas já lançadas
      dnz = Math.max(0, Math.round((dnzNecessario - totalDespesas) * 100) / 100);
    }

    // Base de cálculo IRPF: Rendimentos PF - Pagamentos Dedutíveis
    const baseCalculoIRPF = Math.max(0, rendimentosPF - totalDespesas);

    // Cálculo do IRPF (DARF) usando função do contador
    function calcular_irrf(base_calculo) {
      // Tabela IRPF 2025
      const faixas = [
        { limite: 2259.20, aliquota: 0, deducao: 0 },
        { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
        { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
        { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
        { limite: Infinity, aliquota: 0.275, deducao: 896.00 }
      ];
      let irrf_total = 0;
      if (base_calculo <= faixas[0].limite) {
        return 0;
      } else if (base_calculo <= faixas[1].limite) {
        irrf_total = base_calculo * faixas[1].aliquota - faixas[1].deducao;
      } else if (base_calculo <= faixas[2].limite) {
        irrf_total = base_calculo * faixas[2].aliquota - faixas[2].deducao;
      } else if (base_calculo <= faixas[3].limite) {
        irrf_total = base_calculo * faixas[3].aliquota - faixas[3].deducao;
      } else {
        irrf_total = base_calculo * faixas[4].aliquota - faixas[4].deducao;
      }
      return Math.max(0, irrf_total);
    }
    let darf = Math.max(0, calcular_irrf(baseCalculoIRPF));

    // 2. PESSOA JURÍDICA - Simples Nacional (Anexo III - Serviços)
    function calcular_aliquota_efetiva(rbt12, faturamento_mes) {
      if (rbt12 === 0) {
        if (faturamento_mes === 0) return 0;
        if (0 <= faturamento_mes && faturamento_mes <= 180000) {
          return 0.06;
        } else if (faturamento_mes <= 360000) {
          return (faturamento_mes * 0.112 - 9360) / faturamento_mes;
        } else if (faturamento_mes <= 720000) {
          return (faturamento_mes * 0.135 - 17640) / faturamento_mes;
        } else if (faturamento_mes <= 1800000) {
          return (faturamento_mes * 0.16 - 35640) / faturamento_mes;
        } else if (faturamento_mes <= 3600000) {
          return (faturamento_mes * 0.21 - 125640) / faturamento_mes;
        } else if (faturamento_mes <= 4800000) {
          return (faturamento_mes * 0.33 - 648000) / faturamento_mes;
        } else {
          return 0;
        }
      }
      if (0 <= rbt12 && rbt12 <= 180000) {
        return 0.06;
      } else if (rbt12 <= 360000) {
        return (rbt12 * 0.112 - 9360) / rbt12;
      } else if (rbt12 <= 720000) {
        return (rbt12 * 0.135 - 17640) / rbt12;
      } else if (rbt12 <= 1800000) {
        return (rbt12 * 0.16 - 35640) / rbt12;
      } else if (rbt12 <= 3600000) {
        return (rbt12 * 0.21 - 125640) / rbt12;
      } else if (rbt12 <= 4800000) {
        return (rbt12 * 0.33 - 648000) / rbt12;
      } else {
        return 0;
      }
    }
    const aliquotaEfetiva = calcular_aliquota_efetiva(rbt12, faturamentoPJ);
    const das = faturamentoPJ * aliquotaEfetiva;

    res.json({
      success: true,
      periodo: {
        mes: mesConsulta,
        ano: anoConsulta
      },
      pessoaFisica: {
        rendimentos: rendimentosPF.toFixed(2),
        pagamentos: totalDespesas.toFixed(2),
        dnz: dnz.toFixed(2),
        darf: darf.toFixed(2)
      },
      pessoaJuridica: {
        faturamento: faturamentoPJ.toFixed(2),
        rbt12: rbt12.toFixed(2),
        aliquotaEfetiva: (aliquotaEfetiva * 100).toFixed(2),
        das: das.toFixed(2)
      },
      despesasPorCategoria,
      despesasIndividuais,
      aniversariantesMes: aniversariantesMes.map(p => ({
        id: p.id,
        nome: p.nome,
        dataNascimento: p.dataNascimento,
        telefone: p.telefone
      }))
    });

  } catch (error) {
    console.error('[DASHBOARD] ERRO:', error.message, error.original?.message, error.sql);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados do dashboard'
    });
  }
};

/**
 * Retorna dados para o gráfico de fluxo mensal (últimos 12 meses)
 */
exports.getFluxoMensal = async (req, res) => {
  try {
    const userId = req.user.id;
    const dataAtual = new Date();
    const data12MesesAtras = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 11, 1);

    // Busca faturamentos dos últimos 12 meses
    const faturamentos = await Faturamento.findAll({
      where: {
        userId,
        data: {
          [Op.gte]: data12MesesAtras
        }
      },

      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('data'), '%Y-%m-01'), 'mes'],
        [sequelize.fn('SUM', sequelize.col('valor')), 'total']
      ],
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('data'), '%Y-%m-01')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('data'), '%Y-%m-01'), 'ASC']],
      raw: true
    });

    // Busca despesas dos últimos 12 meses
    const despesas = await Despesa.findAll({
      where: {
        userId,
        data: {
          [Op.gte]: data12MesesAtras
        }
      },
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('data'), '%Y-%m-01'), 'mes'],
        [sequelize.fn('SUM', sequelize.col('valor')), 'total']
      ],
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('data'), '%Y-%m-01')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('data'), '%Y-%m-01'), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      faturamentos,
      despesas
    });

  } catch (error) {
    console.error('Erro ao buscar fluxo mensal:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar fluxo mensal'
    });
  }
};

/**
 * Retorna despesas por categoria para gráfico
 */
exports.getDespesasPorCategoria = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mes, ano } = req.query;

    const dataAtual = new Date();
    const mesConsulta = mes || (dataAtual.getMonth() + 1);
    const anoConsulta = ano || dataAtual.getFullYear();

    const dataInicio = new Date(anoConsulta, mesConsulta - 1, 1);
    const dataFim = new Date(anoConsulta, mesConsulta, 0);

    const despesasPorCategoria = await Despesa.findAll({
      where: {
        userId,
        data: {
          [Op.between]: [dataInicio, dataFim]
        }
      },
      attributes: [
        'categoria',
        [sequelize.fn('SUM', sequelize.col('valor')), 'total']
      ],
      group: ['categoria'],
      raw: true
    });

    res.json({
      success: true,
      despesas: despesasPorCategoria
    });

  } catch (error) {
    console.error('Erro ao buscar despesas por categoria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar despesas por categoria'
    });
  }
};

/**
 * Calcula impostos no regime de Lucro Presumido
 */
exports.calcularLucroPresumido = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mes, ano, receitaMensal } = req.query;

    let faturamentoPJ = 0;

    if (receitaMensal) {
      // Se informar receita manual
      faturamentoPJ = parseFloat(receitaMensal);
    } else {
      // Se não informar, busca do banco
      const dataAtual = new Date();
      const mesConsulta = mes || (dataAtual.getMonth() + 1);
      const anoConsulta = ano || dataAtual.getFullYear();

      const dataInicio = new Date(anoConsulta, mesConsulta - 1, 1);
      const dataFim = new Date(anoConsulta, mesConsulta, 0);

      const faturamentosPJ = await Faturamento.findAll({
        where: {
          userId,
          tipoPessoa: 'PJ',
          data: {
            [Op.between]: [dataInicio, dataFim]
          }
        }
      });

      faturamentoPJ = faturamentosPJ.reduce((sum, f) => sum + parseFloat(f.valor), 0);
    }

    // Lucro Presumido para Serviços
    const baseIR = 0.32;  // 32% para serviços
    const baseCSLL = 0.32; // 32% para serviços

    const pis = faturamentoPJ * 0.0065;
    const cofins = faturamentoPJ * 0.03;
    const iss = faturamentoPJ * 0.05; // 5% (varia por município)

    const irpjBaseCalculo = faturamentoPJ * baseIR;
    const csllBaseCalculo = faturamentoPJ * baseCSLL;

    let irpj = irpjBaseCalculo * 0.15;
    let irAdicional = 0;
    const limiteAdicionalIR = 20000;

    if (irpjBaseCalculo > limiteAdicionalIR) {
      irAdicional = (irpjBaseCalculo - limiteAdicionalIR) * 0.10;
    }

    let csll = csllBaseCalculo * 0.09;

    const impostoTotal = pis + cofins + iss + irpj + irAdicional + csll;
    const aliquotaEfetiva = faturamentoPJ > 0 ? (impostoTotal / faturamentoPJ) * 100 : 0;

    res.json({
      success: true,
      faturamentoMensal: faturamentoPJ.toFixed(2),
      impostos: {
        pis: pis.toFixed(2),
        cofins: cofins.toFixed(2),
        iss: iss.toFixed(2),
        csll: csll.toFixed(2),
        irpj: irpj.toFixed(2),
        irAdicional: irAdicional.toFixed(2),
        total: impostoTotal.toFixed(2)
      },
      aliquotaEfetiva: aliquotaEfetiva.toFixed(2)
    });

  } catch (error) {
    console.error('Erro ao calcular Lucro Presumido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular Lucro Presumido'
    });
  }
};

module.exports = exports;
