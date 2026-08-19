/**
 * Controller do Dashboard
 * Gerencia métricas, cálculos fiscais e dados consolidados
 */

const { User, Faturamento, Despesa, Clinica } = require('../models');
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
    // Busca faturamentos PF do período (só os declarados para imposto)
    const faturamentosPF = await Faturamento.findAll({
      where: {
        clinicaId,
        tipoPessoa: 'PF',
        declarar: true,
        data: { [Op.between]: [dataInicio, dataFim] }
      }
    });

    // Busca faturamentos PJ do período (só os declarados para imposto)
    const faturamentosPJ = await Faturamento.findAll({
      where: {
        clinicaId,
        tipoPessoa: 'PJ',
        declarar: true,
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
        declarar: true,
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

    // 2. PESSOA JURÍDICA — regime da clínica decide o motor de cálculo.
    // regimeTributario: 1/2 = Simples Nacional, 3 = Lucro Presumido, 4 = MEI
    // (MEI cai no ramo Simples por enquanto — DAS de MEI é valor fixo, não
    // percentual, é um caso à parte que ainda não tratamos aqui).
    const clinica = clinicaId ? await Clinica.findByPk(clinicaId, { attributes: ['regimeTributario', 'aliquotaIssqn'] }) : null;
    const isLucroPresumido = clinica?.regimeTributario === '3';

    function calcular_aliquota_efetiva_simples(rbt12, faturamento_mes) {
      const base = rbt12 === 0 ? faturamento_mes : rbt12;
      if (base === 0) return 0;
      if (base <= 180000) {
        return 0.06;
      } else if (base <= 360000) {
        return (base * 0.112 - 9360) / base;
      } else if (base <= 720000) {
        return (base * 0.135 - 17640) / base;
      } else if (base <= 1800000) {
        return (base * 0.16 - 35640) / base;
      } else if (base <= 3600000) {
        return (base * 0.21 - 125640) / base;
      } else if (base <= 4800000) {
        return (base * 0.33 - 648000) / base;
      } else {
        return 0;
      }
    }

    // Lucro Presumido (serviços): PIS/COFINS/ISS são mensais, sobre a receita
    // do mês. IRPJ/CSLL, por lei, são apurados por TRIMESTRE CIVIL (jan-mar,
    // abr-jun, jul-set, out-dez) — não por mês — com o limite do adicional de
    // IRPJ valendo R$ 20.000 × 3 = R$ 60.000 no trimestre. Alíquota do ISS usa
    // a real cadastrada na clínica (fallback 5% se ainda não configurada).
    async function calcular_irpj_csll_trimestral(clinicaId, mesConsulta, anoConsulta) {
      const trimestreIndex = Math.floor((mesConsulta - 1) / 3); // 0..3
      const mesesTrimestre = [1, 2, 3].map((_, i) => trimestreIndex * 3 + i + 1);
      const dataInicioTrim = new Date(anoConsulta, trimestreIndex * 3, 1);
      const dataFimTrim = new Date(anoConsulta, trimestreIndex * 3 + 3, 0);

      const faturamentosTrim = await Faturamento.findAll({
        where: {
          clinicaId,
          tipoPessoa: 'PJ',
          declarar: true,
          data: { [Op.between]: [dataInicioTrim, dataFimTrim] }
        }
      });
      const faturamentoTrimestral = faturamentosTrim.reduce((sum, f) => sum + parseFloat(f.valor), 0);

      const baseIrpjCsll = faturamentoTrimestral * 0.32;
      const irpjBase = baseIrpjCsll * 0.15;
      const limiteAdicionalTrimestral = 20000 * 3;
      const irAdicional = Math.max(0, baseIrpjCsll - limiteAdicionalTrimestral) * 0.10;
      const irpj = irpjBase + irAdicional;
      const csll = baseIrpjCsll * 0.09;

      const labelsTrimestre = ['1º Trimestre (Jan-Mar)', '2º Trimestre (Abr-Jun)', '3º Trimestre (Jul-Set)', '4º Trimestre (Out-Dez)'];
      return {
        irpj, irAdicional, csll,
        faturamentoTrimestral,
        trimestreLabel: labelsTrimestre[trimestreIndex],
        meses: mesesTrimestre
      };
    }

    function calcular_pis_cofins_iss_mensal(faturamento_mes, aliquotaIssqnClinica) {
      const aliquotaIss = aliquotaIssqnClinica != null ? parseFloat(aliquotaIssqnClinica) / 100 : 0.05;
      return {
        pis: faturamento_mes * 0.0065,
        cofins: faturamento_mes * 0.03,
        iss: faturamento_mes * aliquotaIss
      };
    }

    let pessoaJuridica;
    if (isLucroPresumido) {
      const { pis, cofins, iss } = calcular_pis_cofins_iss_mensal(faturamentoPJ, clinica?.aliquotaIssqn);
      const { irpj, irAdicional, csll, trimestreLabel, faturamentoTrimestral } = await calcular_irpj_csll_trimestral(clinicaId, parseInt(mesConsulta), parseInt(anoConsulta));
      const dasEquivalente = pis + cofins + iss; // impostos recorrentes sobre faturamento (mensal)
      const impostoRenda = irpj + irAdicional + csll; // IRPJ/CSLL — apuração do TRIMESTRE, não do mês
      const impostoTotal = dasEquivalente + impostoRenda;
      pessoaJuridica = {
        regime: 'Lucro Presumido',
        faturamento: faturamentoPJ.toFixed(2),
        rbt12: null,
        aliquotaEfetiva: (faturamentoPJ > 0 ? (impostoTotal / faturamentoPJ) * 100 : 0).toFixed(2),
        das: dasEquivalente.toFixed(2),
        impostoRenda: impostoRenda.toFixed(2),
        impostoTotal: impostoTotal.toFixed(2),
        trimestreLabel,
        faturamentoTrimestral: faturamentoTrimestral.toFixed(2),
        detalhamento: {
          pis: pis.toFixed(2),
          cofins: cofins.toFixed(2),
          iss: iss.toFixed(2),
          irpj: irpj.toFixed(2),
          irAdicional: irAdicional.toFixed(2),
          csll: csll.toFixed(2)
        }
      };
    } else {
      const aliquotaEfetiva = calcular_aliquota_efetiva_simples(rbt12, faturamentoPJ);
      const das = faturamentoPJ * aliquotaEfetiva;
      pessoaJuridica = {
        regime: 'Simples Nacional',
        faturamento: faturamentoPJ.toFixed(2),
        rbt12: rbt12.toFixed(2),
        aliquotaEfetiva: (aliquotaEfetiva * 100).toFixed(2),
        das: das.toFixed(2),
        impostoRenda: '0.00',
        impostoTotal: das.toFixed(2),
        detalhamento: null
      };
    }

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
      pessoaJuridica,
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
    const clinicaId = req.user.clinicaId;
    const { mes, ano, receitaMensal } = req.query;

    const clinica = clinicaId ? await Clinica.findByPk(clinicaId, { attributes: ['aliquotaIssqn'] }) : null;

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

    const aliquotaIss = clinica?.aliquotaIssqn != null ? parseFloat(clinica.aliquotaIssqn) / 100 : 0.05;
    const pis = faturamentoPJ * 0.0065;
    const cofins = faturamentoPJ * 0.03;
    const iss = faturamentoPJ * aliquotaIss; // alíquota real da clínica (fallback 5% se não configurada)

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
