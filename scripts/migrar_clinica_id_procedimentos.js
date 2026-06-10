/**
 * Script de migração: Preencher clinica_id dos procedimentos existentes
 * Busca a clinica_id de cada user_id e atualiza os procedimentos
 */

const { sequelize } = require('../src/config/database');
const { User, Procedimento } = require('../src/models');

async function migrar() {
  try {
    console.log('🔄 Iniciando migração de clinica_id para procedimentos...\n');

    // Buscar todos os procedimentos com clinica_id NULL
    const procedimentosSemClinica = await Procedimento.findAll({
      where: { clinica_id: null },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'clinicaId', 'nome']
      }]
    });

    console.log(`📋 Encontrados ${procedimentosSemClinica.length} procedimentos sem clinica_id\n`);

    let atualizados = 0;
    let erros = 0;

    for (const proc of procedimentosSemClinica) {
      try {
        if (proc.user && proc.user.clinicaId) {
          await proc.update({ clinicaId: proc.user.clinicaId });
          console.log(`✅ Procedimento "${proc.nome}" (${proc.id}) atualizado com clinica_id: ${proc.user.clinicaId}`);
          atualizados++;
        } else {
          console.log(`⚠️  Procedimento "${proc.nome}" não tem user associado com clinicaId`);
          erros++;
        }
      } catch (err) {
        console.error(`❌ Erro ao atualizar procedimento ${proc.id}:`, err.message);
        erros++;
      }
    }

    console.log(`\n📊 Resultado da migração:`);
    console.log(`   ✅ Atualizados: ${atualizados}`);
    console.log(`   ⚠️  Erros/Não atualizados: ${erros}`);
    console.log(`\n✨ Migração concluída!`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro fatal na migração:', error);
    process.exit(1);
  }
}

migrar();
