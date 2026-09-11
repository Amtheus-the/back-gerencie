/**
 * Importa os agendamentos FUTUROS da GT Odontologia vindos do Dontus
 * (Relatório de Agendamento → setembro/2026). Cria um procedimento genérico
 * "Consulta / Avaliação" e liga todos os agendamentos nele — a Dra edita depois.
 *
 * Uso:
 *   node scripts/importar_agenda_gt_dontus.js           → dry-run
 *   node scripts/importar_agenda_gt_dontus.js --commit   → grava
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.DB_HOST = 'srv1722.hstgr.io'; // produção

const { sequelize, Paciente, Procedimento, Agendamento } = require('../src/models');

const CLINICA_ID = 'bff19a2c-dc0a-41bc-a3b0-e4d1601393f0'; // Gt Odontologia Especializada
const USER_ID = 'cfc82973-226e-4dff-b825-cb66d2d8c5a9';    // Bárbara Gonçalves
const COMMIT = process.argv.includes('--commit');

// Horário de parede = valor gravado (o app exibe com timeZone UTC).
const AGENDA = [
  { paciente: 'Juliana Ferreira Gomes Ramalho', dataHora: '2026-09-11T11:00:00.000Z', obs: '' },
  { paciente: 'Edlea Cristiano Giannotti',       dataHora: '2026-09-12T14:00:00.000Z', obs: '' },
  { paciente: 'Igor Oliveira Lima',              dataHora: '2026-09-12T16:00:00.000Z', obs: '' },
  { paciente: 'Rejane Ribeiro De Jesus',         dataHora: '2026-09-12T16:30:00.000Z', obs: '' },
  { paciente: 'Irena Suzano de Almeida',         dataHora: '2026-09-14T15:00:00.000Z', obs: '' },
  { paciente: 'Juliana Ferreira Gomes Ramalho',  dataHora: '2026-09-18T17:30:00.000Z', obs: '' },
  { paciente: 'Erica Dias de Oliveira Correia',  dataHora: '2026-09-23T17:30:00.000Z', obs: 'Marcado às 19:30 (nota do Dontus)' },
];

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

(async () => {
  await sequelize.authenticate();
  console.log('✅ Banco conectado (produção)\n');

  // ── Pacientes ──
  const pacientes = await Paciente.findAll({ where: { clinica_id: CLINICA_ID }, attributes: ['id', 'nome'], raw: true });
  const mapaPac = {};
  pacientes.forEach((p) => { mapaPac[norm(p.nome)] = p; });

  const faltando = AGENDA.filter((a) => !mapaPac[norm(a.paciente)]);
  if (faltando.length) {
    console.error('❌ Pacientes não encontrados:', faltando.map((f) => f.paciente).join('; '));
    await sequelize.close();
    process.exitCode = 1;
    return;
  }

  // ── Procedimento genérico ──
  let proc = await Procedimento.findOne({ where: { clinica_id: CLINICA_ID, nome: 'Consulta / Avaliação' } });
  console.log(proc ? `Procedimento genérico já existe: ${proc.id}` : 'Procedimento genérico será criado: "Consulta / Avaliação"');

  // ── Agendamentos já existentes (evita duplicar em re-run) ──
  const existentes = await Agendamento.findAll({ where: { clinica_id: CLINICA_ID }, attributes: ['paciente_id', 'data_hora'], raw: true });
  const jaTem = new Set(existentes.map((e) => `${e.paciente_id}|${new Date(e.data_hora).toISOString()}`));

  const aInserir = AGENDA.map((a) => {
    const pac = mapaPac[norm(a.paciente)];
    const chave = `${pac.id}|${new Date(a.dataHora).toISOString()}`;
    return { ...a, pacienteId: pac.id, pacienteNome: pac.nome, duplicado: jaTem.has(chave) };
  });

  console.log('\n── AGENDAMENTOS ──');
  aInserir.forEach((a) => {
    const d = new Date(a.dataHora);
    const quando = d.toISOString().slice(0, 16).replace('T', ' ');
    console.log(`  ${quando}  ${a.pacienteNome}${a.duplicado ? '  (JÁ EXISTE — pula)' : ''}`);
  });
  const novos = aInserir.filter((a) => !a.duplicado);
  console.log(`\nA inserir: ${novos.length} de ${aInserir.length}`);

  if (!COMMIT) {
    console.log('\n(dry-run — rode com --commit para gravar)');
    await sequelize.close();
    return;
  }

  const t = await sequelize.transaction();
  try {
    if (!proc) {
      proc = await Procedimento.create({
        nome: 'Consulta / Avaliação',
        categoria: 'Geral',
        ativo: true,
        userId: USER_ID,
        clinicaId: CLINICA_ID,
      }, { transaction: t });
      console.log('✅ Procedimento criado:', proc.id);
    }

    let n = 0;
    for (const a of novos) {
      await Agendamento.create({
        clinica_id: CLINICA_ID,
        user_id: USER_ID,
        paciente_id: a.pacienteId,
        procedimento_id: proc.id,
        procedimentos: [proc.id],
        data_hora: new Date(a.dataHora),
        duracao_minutos: 30,
        status: 'agendado',
        observacoes: ['Importado do Dontus em 10/09/2026', a.obs].filter(Boolean).join(' — '),
        lancamento_feito: false,
      }, { transaction: t });
      n++;
    }
    await t.commit();
    console.log(`\n✅ ${n} agendamentos inseridos na Gt Odontologia Especializada.`);
  } catch (err) {
    await t.rollback();
    console.error('❌ Erro (rollback):', err.message);
    process.exitCode = 1;
  }
  await sequelize.close();
})();
