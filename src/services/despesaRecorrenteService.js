/**
 * Geração das despesas mensais a partir das despesas fixas recorrentes.
 *
 * Ao cadastrar uma recorrência, o cronograma inteiro já é gerado de uma vez
 * (inclusive meses futuros) — assim o usuário já vê e planeja as despesas
 * previstas, não só as que já venceram. duracaoMeses sempre tem um valor
 * (padrão 12 quando não informado pelo usuário), então dá pra gerar tudo
 * de uma vez sem depender de um cron.
 */
const { Op } = require('sequelize');
const { Despesa, DespesaRecorrente } = require('../models');

function ultimoDiaDoMes(ano, mesIndex) {
  return new Date(ano, mesIndex + 1, 0).getDate();
}

function formatarData(ano, mesIndex, dia) {
  return `${ano}-${String(mesIndex + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * Gera todas as ocorrências de uma recorrência, do início até completar
 * duracaoMeses — não pula meses futuros. Idempotente: não duplica se uma
 * ocorrência já existe. Devolve as despesas recém-criadas.
 */
async function gerarOcorrenciasPendentes(recorrencia) {
  const inicio = new Date(recorrencia.dataInicio + 'T00:00:00');
  let cursorAno = inicio.getFullYear();
  let cursorMes = inicio.getMonth();

  const criadas = [];
  const totalMeses = recorrencia.duracaoMeses || 12;

  for (let i = 0; i < totalMeses; i++) {
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

    cursorMes++;
    if (cursorMes > 11) { cursorMes = 0; cursorAno++; }
  }

  return criadas;
}

/**
 * Gera as ocorrências pendentes de todas as recorrências ativas de uma
 * clínica — serve como rede de segurança (ex: uma ocorrência foi apagada
 * sem querer), já que a geração principal acontece toda no cadastro.
 */
async function gerarPendentesDaClinica(clinicaId) {
  const recorrencias = await DespesaRecorrente.findAll({ where: { clinicaId, ativa: true } });
  for (const rec of recorrencias) {
    await gerarOcorrenciasPendentes(rec);
  }
}

/**
 * Cancela uma recorrência: remove as ocorrências que ainda não venceram
 * (futuras), preservando as que já passaram — cancelar não deve apagar o
 * que já efetivamente aconteceu.
 */
async function cancelarRecorrencia(recorrencia) {
  const hoje = new Date().toISOString().slice(0, 10);
  await Despesa.destroy({
    where: { recorrenciaId: recorrencia.id, data: { [Op.gt]: hoje } },
  });
  await recorrencia.update({ ativa: false, canceladaEm: new Date() });
}

module.exports = { gerarOcorrenciasPendentes, gerarPendentesDaClinica, cancelarRecorrencia };
