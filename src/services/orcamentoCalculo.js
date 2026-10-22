/**
 * Cálculo e validação do orçamento detalhado.
 *
 * O front manda `detalhes` (itens com dentes, desconto, pagamento...) e o servidor é quem decide
 * os valores: ele recalcula tudo em centavos e devolve `procedimentos` e `valores` já com o
 * desconto distribuído, que é o que o resto do sistema (saldo em aberto, pagamentos, agenda)
 * continua usando. Assim o total nunca fica diferente entre a tela, o PDF e o financeiro.
 */

const DENTES_VALIDOS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
]);
const VALIDADES = [7, 15, 30, 60, 90];
const MAX_ITENS = 80;

const paraCentavos = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n * 100), 999999999); // até R$ 9.999.999,99
};
const emReais = (centavos) => Math.round(centavos) / 100;

function erro(msg) { const e = new Error(msg); e.status = 400; return e; }

function calcularDetalhes(detalhes) {
  if (!detalhes || typeof detalhes !== 'object' || !Array.isArray(detalhes.itens)) throw erro('Orçamento sem itens.');
  if (detalhes.itens.length === 0) throw erro('Adicione pelo menos um procedimento ao orçamento.');
  if (detalhes.itens.length > MAX_ITENS) throw erro(`Um orçamento aceita até ${MAX_ITENS} itens.`);

  const itens = detalhes.itens.map((it, i) => {
    const procedimentoId = String(it?.procedimentoId || '').trim();
    if (!procedimentoId) throw erro(`Item ${i + 1}: procedimento inválido.`);
    const cobranca = it.cobranca === 'dente' ? 'dente' : 'fixo';
    const dentes = [...new Set((Array.isArray(it.dentes) ? it.dentes : []).map(Number))].filter((d) => DENTES_VALIDOS.has(d)).sort((a, b) => a - b);
    const quantidade = cobranca === 'dente' ? dentes.length : Math.min(Math.max(parseInt(it.quantidade, 10) || 1, 1), 999);
    if (cobranca === 'dente' && dentes.length === 0) throw erro(`Escolha os dentes de "${it.nome || 'um procedimento'}" ou mude para valor fixo.`);
    const unitario = paraCentavos(it.valorUnitario);
    return {
      procedimentoId,
      nome: String(it.nome || '').slice(0, 150),
      cobranca,
      dentes,
      quantidade,
      valorUnitario: emReais(unitario),
      subtotalCentavos: unitario * quantidade,
    };
  });

  const subtotalCentavos = itens.reduce((s, it) => s + it.subtotalCentavos, 0);

  // desconto (em R$ ou %), nunca maior que o subtotal
  const d = detalhes.desconto || {};
  const tipoDesconto = d.tipo === 'percentual' ? 'percentual' : 'valor';
  let descontoCentavos = 0;
  if (tipoDesconto === 'percentual') {
    const pct = Math.min(Math.max(parseFloat(d.valor) || 0, 0), 100);
    descontoCentavos = Math.round(subtotalCentavos * pct / 100);
  } else {
    descontoCentavos = paraCentavos(d.valor);
  }
  descontoCentavos = Math.min(descontoCentavos, subtotalCentavos);
  const totalCentavos = subtotalCentavos - descontoCentavos;

  // valor líquido de cada procedimento (o desconto é repartido na proporção; o último absorve a diferença)
  const porProcedimento = new Map();
  itens.forEach((it) => porProcedimento.set(it.procedimentoId, (porProcedimento.get(it.procedimentoId) || 0) + it.subtotalCentavos));
  const ids = [...porProcedimento.keys()];
  const valores = {};
  let acumulado = 0;
  ids.forEach((id, idx) => {
    let liquido;
    if (idx === ids.length - 1) liquido = totalCentavos - acumulado;
    else liquido = subtotalCentavos === 0 ? 0 : Math.round(totalCentavos * porProcedimento.get(id) / subtotalCentavos);
    acumulado += liquido;
    valores[id] = emReais(liquido);
  });

  // pagamento
  const pg = detalhes.pagamento || {};
  const forma = pg.forma === 'parcelado' ? 'parcelado' : 'avista';
  const pagamento = { forma };
  if (forma === 'parcelado') {
    pagamento.entrada = emReais(Math.min(paraCentavos(pg.entrada), totalCentavos));
    pagamento.parcelas = Math.min(Math.max(parseInt(pg.parcelas, 10) || 1, 1), 24);
  }

  const validadeDias = VALIDADES.includes(parseInt(detalhes.validadeDias, 10)) ? parseInt(detalhes.validadeDias, 10) : 15;

  return {
    procedimentos: ids,
    valores,
    total: emReais(totalCentavos),
    detalhes: {
      versao: 1,
      itens: itens.map(({ subtotalCentavos: sc, ...resto }) => ({ ...resto, subtotal: emReais(sc) })),
      subtotal: emReais(subtotalCentavos),
      desconto: { tipo: tipoDesconto, valor: tipoDesconto === 'percentual' ? Math.min(Math.max(parseFloat(d.valor) || 0, 0), 100) : emReais(descontoCentavos), emReais: emReais(descontoCentavos) },
      total: emReais(totalCentavos),
      pagamento,
      validadeDias,
      profissional: String(detalhes.profissional || '').trim().slice(0, 120),
    },
  };
}

const brl = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Texto das condições de pagamento (mesma conta da tela: parcelas sem juros, a última leva a diferença). */
function descreverPagamento(detalhes) {
  const total = Math.round((detalhes.total || 0) * 100);
  const pg = detalhes.pagamento || {};
  if (pg.forma !== 'parcelado') return `À vista: ${brl(total / 100)}`;
  const entrada = Math.round((pg.entrada || 0) * 100);
  const n = Math.max(parseInt(pg.parcelas, 10) || 1, 1);
  const resto = Math.max(total - entrada, 0);
  const base = Math.floor(resto / n);
  const ultima = resto - base * (n - 1);
  const partes = [];
  if (entrada > 0) partes.push(`Entrada de ${brl(entrada / 100)}`);
  if (resto > 0) {
    partes.push(ultima === base || n === 1 ? `${n}x de ${brl(base / 100)}` : `${n - 1}x de ${brl(base / 100)} + 1x de ${brl(ultima / 100)}`);
  }
  return `${partes.join(' + ')} (sem juros)`;
}

const SUPERIOR = [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28];
const INFERIOR = [31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48];

/** "Boca toda", "Arcada superior"/"inferior" ou a lista de dentes (usado no PDF). */
function resumoDentes(dentes) {
  const lista = [...(dentes || [])].map(Number).sort((a, b) => a - b);
  const igual = (alvo) => lista.length === alvo.length && alvo.every((n) => lista.includes(n));
  if (igual([...SUPERIOR, ...INFERIOR].sort((a, b) => a - b))) return 'Boca toda (32 dentes)';
  if (igual(SUPERIOR)) return 'Arcada superior (16 dentes)';
  if (igual(INFERIOR)) return 'Arcada inferior (16 dentes)';
  return `Dente${lista.length > 1 ? 's' : ''}: ${lista.join(', ')}`;
}

module.exports = { calcularDetalhes, descreverPagamento, resumoDentes, DENTES_VALIDOS };
