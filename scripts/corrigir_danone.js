/**
 * Script para corrigir o usuário Danone sem clínica
 */

require('dotenv').config();
const { Clinica, User } = require('../src/models');

async function corrigirDanone() {
  try {
    console.log('🔧 Iniciando correção do usuário Danone...');
    
    // 1. Criar clínica Vest sorriso
    console.log('✅ Criando clínica Vest sorriso...');
    const clinica = await Clinica.create({
      nome: 'Vest sorriso',
      tipoPessoa: 'PF',
      plano: 'FREE',
      limiteUsuarios: 3,
      ativo: true
    });
    
    console.log('✅ Clínica criada:', {
      id: clinica.id,
      nome: clinica.nome
    });
    
    // 2. Atualizar usuário Danone
    console.log('✅ Atualizando usuário Danone...');
    const [numUpdated] = await User.update(
      { clinicaId: clinica.id },
      { where: { email: 'danone@gmail.com' } }
    );
    
    console.log('✅ Usuários atualizados:', numUpdated);
    
    // 3. Verificar correção
    const user = await User.findOne({
      where: { email: 'danone@gmail.com' },
      attributes: ['id', 'nome', 'email', 'clinicaId']
    });
    
    console.log('✅ Usuário após correção:', user.toJSON());
    
    // 4. Listar todas as clínicas
    const clinicas = await Clinica.findAll({
      attributes: ['id', 'nome', 'tipoPessoa'],
      order: [['createdAt', 'DESC']]
    });
    
    console.log('\n🏥 CLÍNICAS NO BANCO:');
    clinicas.forEach(c => {
      console.log(`  - ${c.nome} (${c.tipoPessoa}) [${c.id}]`);
    });
    
    console.log('\n✅ Correção finalizada com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro ao corrigir:', error);
    process.exit(1);
  }
}

corrigirDanone();
