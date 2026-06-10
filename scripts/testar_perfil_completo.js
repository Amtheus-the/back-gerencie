/**
 * Script para testar endpoint de perfil completo
 */

// Carregar variáveis de ambiente
require('dotenv').config();

const { User, Faturamento, Despesa, Documento } = require('../src/models');

async function testarPerfilCompleto() {
  try {
    console.log('🔍 Iniciando teste do endpoint perfil completo...\n');

    const userId = 'b78502a8-1afa-455e-a0e8-ce819d2c4184';

    // 1. Testar busca do usuário
    console.log('1️⃣ Buscando usuário...');
    const usuario = await User.findByPk(userId, {
      attributes: { exclude: ['senha'] }
    });

    if (!usuario) {
      console.log('❌ Usuário não encontrado');
      process.exit(1);
    }

    console.log('✅ Usuário encontrado:', usuario.nome);

    // 2. Testar busca de faturamentos
    console.log('\n2️⃣ Buscando faturamentos...');
    const faturamentos = await Faturamento.findAll({
      where: { userId },
      order: [['data', 'DESC']],
      limit: 50
    });
    console.log(`✅ Encontrados ${faturamentos.length} faturamentos`);

    // 3. Testar busca de despesas
    console.log('\n3️⃣ Buscando despesas...');
    const despesas = await Despesa.findAll({
      where: { userId },
      order: [['data', 'DESC']],
      limit: 50
    });
    console.log(`✅ Encontradas ${despesas.length} despesas`);

    // 4. Testar busca de documentos
    console.log('\n4️⃣ Buscando documentos...');
    try {
      const documentos = await Documento.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']]
      });
      console.log(`✅ Encontrados ${documentos.length} documentos`);
    } catch (error) {
      console.log('❌ Erro ao buscar documentos:', error.message);
      console.log('Stack:', error.stack);
      throw error;
    }

    // 5. Calcular estatísticas
    console.log('\n5️⃣ Calculando estatísticas...');
    const totalFaturamento = faturamentos.reduce((sum, f) => sum + parseFloat(f.valor), 0);
    const totalDespesas = despesas.reduce((sum, d) => sum + parseFloat(d.valor), 0);
    const saldo = totalFaturamento - totalDespesas;
    const impostosEstimados = totalFaturamento * 0.065;

    console.log('✅ Estatísticas calculadas:');
    console.log('   - Total Faturamento:', totalFaturamento);
    console.log('   - Total Despesas:', totalDespesas);
    console.log('   - Saldo:', saldo);
    console.log('   - Impostos Estimados:', impostosEstimados);

    console.log('\n✅ Teste completo finalizado com sucesso!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testarPerfilCompleto();
