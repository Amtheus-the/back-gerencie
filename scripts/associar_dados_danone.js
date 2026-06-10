/**
 * Script para associar faturamentos do Danone à clínica Vest sorriso
 */

require('dotenv').config();
const { Faturamento, Despesa } = require('../src/models');

async function associarDadosDanone() {
  try {
    console.log('🔧 Associando dados do usuário Danone à clínica...');
    
    const clinicaId = '9f8794dc-88d2-4686-a70b-9db760303927'; // Vest sorriso
    const userId = 'e97afa77-7b3f-4a06-b877-de7a1e1f3f4b'; // Danone
    
    // 1. Atualizar faturamentos
    console.log('✅ Atualizando faturamentos...');
    const [numFaturamentos] = await Faturamento.update(
      { clinicaId },
      { where: { userId } }
    );
    console.log(`✅ ${numFaturamentos} faturamento(s) atualizado(s)`);
    
    // 2. Atualizar despesas
    console.log('✅ Atualizando despesas...');
    const [numDespesas] = await Despesa.update(
      { clinicaId },
      { where: { userId } }
    );
    console.log(`✅ ${numDespesas} despesa(s) atualizada(s)`);
    
    // 3. Verificar
    const faturamentos = await Faturamento.findAll({
      where: { userId },
      attributes: ['id', 'descricao', 'valor', 'clinicaId']
    });
    
    console.log('\n💰 FATURAMENTOS DO DANONE:');
    faturamentos.forEach(f => {
      const valor = parseFloat(f.valor);
      console.log(`  - ${f.descricao}: R$ ${valor.toFixed(2)} [${f.clinicaId}]`);
    });
    
    console.log('\n✅ Associação finalizada com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

associarDadosDanone();
