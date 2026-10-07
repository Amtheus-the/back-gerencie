/**
 * Ferramentas (somente leitura) expostas ao Claude pelo conector MCP do Gerencie.
 * Todas recebem o `clinicaId` vindo do token — nunca de parâmetro — então um
 * token jamais enxerga dados de outra clínica.
 */
const { Op } = require('sequelize');
const { Faturamento, Despesa, Paciente, Agendamento, Orcamento, Procedimento } = require('../models');

const LIMITE_PADRAO = 100;
const LIMITE_MAX = 500;

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const num = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;

function validarData(valor, nome) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (!RE_DATA.test(valor) || Number.isNaN(Date.parse(`${valor}T00:00:00Z`))) {
    throw new Error(`"${nome}" deve estar no formato AAAA-MM-DD (ex: 2026-09-30).`);
  }
  return valor;
}

function limite(args) {
  const n = parseInt(args.limite, 10);
  if (!n || n < 1) return LIMITE_PADRAO;
  return Math.min(n, LIMITE_MAX);
}

// Período obrigatório de datas (AAAA-MM-DD); se faltar, usa o mês atual.
function periodo(args) {
  const inicio = validarData(args.data_inicio, 'data_inicio');
  const fim = validarData(args.data_fim, 'data_fim');
  if (inicio || fim) {
    const hoje = new Date().toISOString().slice(0, 10);
    return { inicio: inicio || '2000-01-01', fim: fim || hoje.slice(0, 4) + '-12-31' };
  }
  const agora = new Date();
  const ano = agora.getUTCFullYear();
  const mes = agora.getUTCMonth() + 1;
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const mm = String(mes).padStart(2, '0');
  return { inicio: `${ano}-${mm}-01`, fim: `${ano}-${mm}-${String(ultimo).padStart(2, '0')}` };
}

const propsPeriodo = {
  data_inicio: { type: 'string', description: 'Data inicial no formato AAAA-MM-DD. Se omitida junto com data_fim, usa o mês atual.' },
  data_fim: { type: 'string', description: 'Data final no formato AAAA-MM-DD.' },
  limite: { type: 'integer', description: `Máximo de registros (padrão ${LIMITE_PADRAO}, máximo ${LIMITE_MAX}).` },
};

const TOOLS = [
  {
    name: 'resumo_mes',
    description: 'Resumo financeiro de um mês da clínica: faturamento (declarado e controle interno, separado por PF/PJ), despesas e resultado. Se mes/ano forem omitidos, usa o mês atual.',
    inputSchema: {
      type: 'object',
      properties: {
        mes: { type: 'integer', minimum: 1, maximum: 12, description: 'Mês (1-12).' },
        ano: { type: 'integer', description: 'Ano com 4 dígitos.' },
      },
    },
    async run(clinicaId, args) {
      const agora = new Date();
      const ano = parseInt(args.ano, 10) || agora.getUTCFullYear();
      const mes = parseInt(args.mes, 10) || agora.getUTCMonth() + 1;
      if (mes < 1 || mes > 12) throw new Error('"mes" deve ser de 1 a 12.');
      const mm = String(mes).padStart(2, '0');
      const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
      const inicio = `${ano}-${mm}-01`;
      const fim = `${ano}-${mm}-${String(ultimo).padStart(2, '0')}`;

      const [fats, desp] = await Promise.all([
        Faturamento.findAll({ where: { clinicaId, data: { [Op.between]: [inicio, fim] } }, attributes: ['valor', 'tipoPessoa', 'declarar'], raw: true }),
        Despesa.findAll({ where: { clinicaId, data: { [Op.between]: [inicio, fim] } }, attributes: ['valor', 'categoria'], raw: true }),
      ]);
      const soma = (lista) => num(lista.reduce((s, f) => s + parseFloat(f.valor), 0));
      const declarados = fats.filter((f) => f.declarar);
      const controle = fats.filter((f) => !f.declarar);
      const porCategoria = {};
      desp.forEach((d) => { porCategoria[d.categoria || 'Sem categoria'] = num((porCategoria[d.categoria || 'Sem categoria'] || 0) + parseFloat(d.valor)); });
      const faturamentoTotal = soma(fats);
      const despesasTotal = soma(desp);
      return {
        periodo: `${mm}/${ano}`,
        faturamento: {
          total: faturamentoTotal,
          declarado: soma(declarados),
          controle_interno: soma(controle),
          declarado_pf: soma(declarados.filter((f) => f.tipoPessoa === 'PF')),
          declarado_pj: soma(declarados.filter((f) => f.tipoPessoa === 'PJ')),
          quantidade_lancamentos: fats.length,
        },
        despesas: { total: despesasTotal, por_categoria: porCategoria, quantidade_lancamentos: desp.length },
        resultado: num(faturamentoTotal - despesasTotal),
        observacao: 'Resultado = faturamento total (declarado + controle interno) - despesas. Não é cálculo de imposto.',
      };
    },
  },
  {
    name: 'listar_faturamentos',
    description: 'Lista os lançamentos de faturamento (recebimentos) da clínica em um período.',
    inputSchema: {
      type: 'object',
      properties: {
        ...propsPeriodo,
        tipo_pessoa: { type: 'string', enum: ['PF', 'PJ'], description: 'Filtra por pessoa física ou jurídica.' },
      },
    },
    async run(clinicaId, args) {
      const { inicio, fim } = periodo(args);
      const where = { clinicaId, data: { [Op.between]: [inicio, fim] } };
      if (args.tipo_pessoa) where.tipoPessoa = args.tipo_pessoa;
      const max = limite(args);
      const linhas = await Faturamento.findAll({
        where, order: [['data', 'DESC']], limit: max + 1,
        attributes: ['id', 'data', 'paciente', 'descricao', 'valor', 'formaPagamento', 'tipoPessoa', 'declarar', 'notaEmitida'],
        raw: true,
      });
      const truncado = linhas.length > max;
      const itens = linhas.slice(0, max).map((f) => ({
        id: f.id, data: f.data, paciente: f.paciente, descricao: f.descricao, valor: num(f.valor),
        forma_pagamento: f.formaPagamento, tipo_pessoa: f.tipoPessoa,
        controle_interno: !f.declarar, nota_emitida: !!f.notaEmitida,
      }));
      return { periodo: { inicio, fim }, quantidade: itens.length, total: num(itens.reduce((s, i) => s + i.valor, 0)), truncado, itens };
    },
  },
  {
    name: 'listar_despesas',
    description: 'Lista as despesas da clínica em um período, com categoria e valor.',
    inputSchema: {
      type: 'object',
      properties: { ...propsPeriodo, categoria: { type: 'string', description: 'Filtra por parte do nome da categoria.' } },
    },
    async run(clinicaId, args) {
      const { inicio, fim } = periodo(args);
      const where = { clinicaId, data: { [Op.between]: [inicio, fim] } };
      if (args.categoria) where.categoria = { [Op.like]: `%${String(args.categoria).slice(0, 80)}%` };
      const max = limite(args);
      const linhas = await Despesa.findAll({
        where, order: [['data', 'DESC']], limit: max + 1,
        attributes: ['id', 'data', 'descricao', 'valor', 'categoria', 'tipo'], raw: true,
      });
      const truncado = linhas.length > max;
      const itens = linhas.slice(0, max).map((d) => ({ id: d.id, data: d.data, descricao: d.descricao, valor: num(d.valor), categoria: d.categoria, tipo: d.tipo }));
      return { periodo: { inicio, fim }, quantidade: itens.length, total: num(itens.reduce((s, i) => s + i.valor, 0)), truncado, itens };
    },
  },
  {
    name: 'listar_pacientes',
    description: 'Lista pacientes da clínica (nome, telefone, e-mail, nascimento). Não retorna CPF nem prontuário.',
    inputSchema: {
      type: 'object',
      properties: {
        busca: { type: 'string', description: 'Parte do nome do paciente.' },
        limite: { type: 'integer', description: `Máximo de registros (padrão ${LIMITE_PADRAO}, máximo ${LIMITE_MAX}).` },
        pagina: { type: 'integer', description: 'Página (começa em 1) para listas grandes.' },
      },
    },
    async run(clinicaId, args) {
      const where = { clinica_id: clinicaId };
      if (args.busca) where.nome = { [Op.like]: `%${String(args.busca).slice(0, 80)}%` };
      const max = limite(args);
      const pagina = Math.max(parseInt(args.pagina, 10) || 1, 1);
      const { rows, count } = await Paciente.findAndCountAll({
        where, order: [['nome', 'ASC']], limit: max, offset: (pagina - 1) * max,
        attributes: ['id', 'nome', 'telefone', 'email', 'dataNascimento', 'ativo'], raw: true,
      });
      return {
        total_encontrado: count, pagina, quantidade: rows.length,
        itens: rows.map((p) => ({ id: p.id, nome: (p.nome || '').trim(), telefone: p.telefone, email: p.email, data_nascimento: p.dataNascimento, ativo: !!p.ativo })),
      };
    },
  },
  {
    name: 'listar_agendamentos',
    description: 'Lista os agendamentos da clínica em um período (paciente, data/hora, procedimento, status). Horários são os de parede da clínica.',
    inputSchema: {
      type: 'object',
      properties: { ...propsPeriodo, status: { type: 'string', description: 'Ex: agendado, confirmado, compareceu, cancelado.' } },
    },
    async run(clinicaId, args) {
      const { inicio, fim } = periodo(args);
      const where = { clinica_id: clinicaId, data_hora: { [Op.between]: [new Date(`${inicio}T00:00:00.000Z`), new Date(`${fim}T23:59:59.999Z`)] } };
      if (args.status) where.status = String(args.status).slice(0, 30);
      const max = limite(args);
      const linhas = await Agendamento.findAll({ where, order: [['data_hora', 'ASC']], limit: max + 1, raw: true });
      const truncado = linhas.length > max;
      const lista = linhas.slice(0, max);
      const parse = (v) => (typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return []; } })() : v || []);
      const idsPac = [...new Set(lista.map((a) => a.paciente_id))];
      const idsProc = [...new Set(lista.flatMap((a) => parse(a.procedimentos).concat(a.procedimento_id ? [a.procedimento_id] : [])))];
      const [pacs, procs] = await Promise.all([
        idsPac.length ? Paciente.findAll({ where: { id: idsPac, clinica_id: clinicaId }, attributes: ['id', 'nome'], raw: true }) : [],
        idsProc.length ? Procedimento.findAll({ where: { id: idsProc, clinicaId }, attributes: ['id', 'nome'], raw: true }) : [],
      ]);
      const nomePac = new Map(pacs.map((p) => [p.id, (p.nome || '').trim()]));
      const nomeProc = new Map(procs.map((p) => [p.id, (p.nome || '').trim()]));
      const itens = lista.map((a) => {
        const ids = parse(a.procedimentos);
        return {
          id: a.id, data_hora: new Date(a.data_hora).toISOString().slice(0, 16).replace('T', ' '),
          paciente: nomePac.get(a.paciente_id) || null,
          procedimentos: (ids.length ? ids : [a.procedimento_id]).map((i) => nomeProc.get(i)).filter(Boolean),
          duracao_minutos: a.duracao_minutos, status: a.status, observacoes: a.observacoes,
        };
      });
      return { periodo: { inicio, fim }, quantidade: itens.length, truncado, itens };
    },
  },
  {
    name: 'listar_orcamentos',
    description: 'Lista os orçamentos da clínica (paciente, status, procedimentos e valor total). Status: fechado, nao_fechado, retornar (ficou de retornar), pendente.',
    inputSchema: {
      type: 'object',
      properties: { ...propsPeriodo, status: { type: 'string', enum: ['fechado', 'nao_fechado', 'retornar', 'pendente'] } },
    },
    async run(clinicaId, args) {
      const { inicio, fim } = periodo(args);
      const where = { clinica_id: clinicaId, createdAt: { [Op.between]: [new Date(`${inicio}T00:00:00.000Z`), new Date(`${fim}T23:59:59.999Z`)] } };
      if (args.status) where.status = args.status;
      const max = limite(args);
      const linhas = await Orcamento.findAll({ where, order: [['createdAt', 'DESC']], limit: max + 1, raw: true });
      const truncado = linhas.length > max;
      const lista = linhas.slice(0, max);
      const parse = (v, f) => (typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return f; } })() : v ?? f);
      const idsPac = [...new Set(lista.map((o) => o.paciente_id))];
      const idsProc = [...new Set(lista.flatMap((o) => parse(o.procedimentos, [])))];
      const [pacs, procs] = await Promise.all([
        idsPac.length ? Paciente.findAll({ where: { id: idsPac, clinica_id: clinicaId }, attributes: ['id', 'nome'], raw: true }) : [],
        idsProc.length ? Procedimento.findAll({ where: { id: idsProc, clinicaId }, attributes: ['id', 'nome'], raw: true }) : [],
      ]);
      const nomePac = new Map(pacs.map((p) => [p.id, (p.nome || '').trim()]));
      const nomeProc = new Map(procs.map((p) => [p.id, (p.nome || '').trim()]));
      const itens = lista.map((o) => {
        const valores = parse(o.valores, {});
        return {
          id: o.id, data: new Date(o.createdAt).toISOString().slice(0, 10), paciente: nomePac.get(o.paciente_id) || null,
          status: o.status, procedimentos: parse(o.procedimentos, []).map((i) => nomeProc.get(i)).filter(Boolean),
          valor_total: num(Object.values(valores).reduce((s, v) => s + (parseFloat(v) || 0), 0)),
        };
      });
      return { periodo: { inicio, fim }, quantidade: itens.length, total: num(itens.reduce((s, i) => s + i.valor_total, 0)), truncado, itens };
    },
  },
];

module.exports = { TOOLS };
