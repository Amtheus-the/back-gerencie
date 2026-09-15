/**
 * Zera os dados de teste da clínica do Anderson (conta pessoal de testes),
 * mantendo a clínica e os logins existentes intactos.
 *
 * Apaga: pacientes, agendamentos, faturamentos, despesas, orçamentos,
 * documentos clínicos (receita/atestado), termos enviados a paciente,
 * anotações de evolução, arquivos de paciente, bloqueios de agenda.
 *
 * NÃO apaga: usuários/logins, procedimentos (catálogo), despesas
 * recorrentes (configuração), máquinas de cartão (configuração).
 *
 * Uso:
 *   node scripts/zerar_clinica_teste_anderson.js            → dry-run (só mostra contagens)
 *   node scripts/zerar_clinica_teste_anderson.js --commit    → apaga de verdade
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.DB_HOST = 'srv1722.hstgr.io'; // produção

const { sequelize } = require('../src/models');

const CLINICA_ID = '2cf7c182-1298-4ad5-b1b2-a32829b19b3b'; // clínica de teste do Anderson
const COMMIT = process.argv.includes('--commit');

// Ordem: filhos antes dos pais (documentos/anotações/arquivos → faturamentos →
// orçamentos → agendamentos → pacientes; despesas e bloqueios são independentes).
const TABELAS = [
  { nome: 'documentos_paciente',   where: 'paciente_id IN (SELECT id FROM pacientes WHERE clinica_id = ?)' },
  { nome: 'documentos_clinicos',   where: 'clinica_id = ?' },
  { nome: 'anotacoes_paciente',    where: 'clinica_id = ?' },
  { nome: 'arquivos_paciente',     where: 'clinica_id = ?' },
  { nome: 'faturamentos',          where: 'clinica_id = ?' },
  { nome: 'orcamentos',            where: 'clinica_id = ?' },
  { nome: 'agendamentos',          where: 'clinica_id = ?' },
  { nome: 'despesas',              where: 'clinica_id = ?' },
  { nome: 'bloqueios_agenda',      where: 'clinica_id = ?' },
  { nome: 'pacientes',             where: 'clinica_id = ?' },
];

(async () => {
  await sequelize.authenticate();
  console.log('✅ Banco conectado (produção)\n');

  console.log('── ANTES ──');
  for (const t of TABELAS) {
    const [r] = await sequelize.query(`SELECT COUNT(*) as n FROM ${t.nome} WHERE ${t.where}`, { replacements: [CLINICA_ID] });
    console.log(t.nome.padEnd(22), r[0].n);
  }

  if (!COMMIT) {
    console.log('\n(dry-run — rode com --commit para apagar de verdade)');
    await sequelize.close();
    return;
  }

  const t = await sequelize.transaction();
  try {
    for (const tb of TABELAS) {
      const [result] = await sequelize.query(`DELETE FROM ${tb.nome} WHERE ${tb.where}`, {
        replacements: [CLINICA_ID],
        transaction: t,
      });
      console.log(`🗑️  ${tb.nome}: ${result.affectedRows ?? '?'} linhas apagadas`);
    }
    await t.commit();
    console.log('\n✅ Clínica de teste zerada.');
  } catch (err) {
    await t.rollback();
    console.error('❌ Erro (rollback):', err.message);
    process.exitCode = 1;
  }
  await sequelize.close();
})();
