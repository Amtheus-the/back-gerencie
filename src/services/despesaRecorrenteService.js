/**
 * Geração das despesas mensais a partir das despesas fixas recorrentes.
 *
 * Não usa cron — é gerado sob demanda (lazy) sempre que a lista de despesas
 * é aberta: percorre as recorrências ativas da clínica e cria qualquer mês
 * que ainda não tenha sido gerado, até o mês atual. Isso também
 * "recupera" meses perdidos caso o usuário fique um tempo sem abrir o
 * sistema — não depende do servidor estar de pé numa data exata.
 */
const { Despesa, DespesaRecorrente } = require('../models');

function ultimoDiaDoMes(ano, mesIndex) {
  return new Date(ano, mesIndex + 1, 0).getDate();
}

function formatarData(ano, mesIndex, dia) {
  return `${ano}-${String(mesIndex + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * Gera as ocorrências pendentes de UMA recorrência específica, até o mês
 * atual (ou até o fim da duração, o que vier primeiro). Devolve as
 * despesas recém-criadas.
 */
async function gerarOcorrenciasPendentes(recorrencia) {
  const hoje = new Date();
  const inicio = new Date(recorrencia.dataInicio + 'T00:00:00');
  let cursorAno = inicio.getFullYear();
  let cursorMes = inicio.getMonth();
  const limiteAno = hoje.getFullYear();
  const limiteMes = hoje.getMonth();

  const criadas = [];
  let mesesGerados = 0;

  while (cursorAno < limiteAno || (cursorAno === limiteAno && cursorMes <= limiteMes)) {
    if (recorrencia.duracaoMeses != null && mesesGerados >= recorrencia.duracaoMeses) break;

    const dia = Math.min(recorrencia.diaVencimento, ultimoDiaDoMes(cursorAno, cursorMes));
    const dataOcorrencia = formatarData(cursorAno, cursorMes, dia);

    const jaExiste = await Despesa.findOne({
      where: { recorrenciaId: recorrencia.id, data: dataOcorrencia },
    });

    if (!jaExiste) {
      const nova = await Despesa.create({
        userId: recorrencia.userId,
        clinicaId: recorrencia.clinicaId,
        descricao: recorrencia.descricao,
        valor: recorrencia.valor,
        categoria: recorrencia.categoria,
        data: dataOcorrencia,
        tipo: 'fixa',
        observacoes: recorrencia.observacoes,
        planoContaId: recorrencia.planoContaId,
        recorrenciaId: recorrencia.id,
      });
      criadas.push(nova);
    }

    mesesGerados++;
    cursorMes++;
    if (cursorMes > 11) { cursorMes = 0; cursorAno++; }
  }

  // Duração esgotada — encerra a recorrência automaticamente (não gera mais)
  if (recorrencia.duracaoMeses != null && mesesGerados >= recorrencia.duracaoMeses && recorrencia.ativa) {
    await recorrencia.update({ ativa: false, canceladaEm: new Date() });
  }

  return criadas;
}

/**
 * Gera as ocorrências pendentes de todas as recorrências ativas de uma
 * clínica. Chamado sempre que a lista de despesas é carregada.
 */
async function gerarPendentesDaClinica(clinicaId) {
  const recorrencias = await DespesaRecorrente.findAll({ where: { clinicaId, ativa: true } });
  for (const rec of recorrencias) {
    await gerarOcorrenciasPendentes(rec);
  }
}

module.exports = { gerarOcorrenciasPendentes, gerarPendentesDaClinica };
