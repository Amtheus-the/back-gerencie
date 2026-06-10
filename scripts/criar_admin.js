/**
 * Script para criar um usuário administrador
 * Execute este script para criar um admin inicial
 */

const readline = require('readline');
const { User } = require('../src/models');
const { connectDB } = require('../src/config/database');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pergunta(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function criarAdmin() {
  try {
    console.log('🔧 Criando usuário administrador...\n');

    // Conectar ao banco
    await connectDB();

    // Solicitar dados do admin
    const nome = await pergunta('Nome completo: ');
    const email = await pergunta('Email: ');
    const senha = await pergunta('Senha: ');
    const tipoPessoa = await pergunta('Tipo de pessoa (PF/PJ/HIBRIDO): ');

    // Validar dados
    if (!nome || !email || !senha) {
      console.log('❌ Todos os campos são obrigatórios!');
      rl.close();
      process.exit(1);
    }

    if (!['PF', 'PJ', 'HIBRIDO'].includes(tipoPessoa.toUpperCase())) {
      console.log('❌ Tipo de pessoa inválido! Use PF, PJ ou HIBRIDO');
      rl.close();
      process.exit(1);
    }

    // Verificar se email já existe
    const usuarioExiste = await User.findOne({ where: { email } });
    
    if (usuarioExiste) {
      console.log('\n⚠️  Usuário já existe. Deseja torná-lo administrador? (s/n)');
      const resposta = await pergunta('Resposta: ');
      
      if (resposta.toLowerCase() === 's') {
        usuarioExiste.isAdmin = true;
        await usuarioExiste.save();
        console.log('\n✅ Usuário atualizado para administrador com sucesso!');
      } else {
        console.log('\n❌ Operação cancelada.');
      }
    } else {
      // Criar novo usuário admin
      const novoAdmin = await User.create({
        nome,
        email,
        senha,
        tipoPessoa: tipoPessoa.toUpperCase(),
        nomeClinica: nome,
        profissao: 'Administrador',
        isAdmin: true,
        ativo: true,
        primeiroAcesso: false
      });

      console.log('\n✅ Usuário administrador criado com sucesso!');
      console.log('\n📋 Dados do administrador:');
      console.log(`   Nome: ${novoAdmin.nome}`);
      console.log(`   Email: ${novoAdmin.email}`);
      console.log(`   Tipo: ${novoAdmin.tipoPessoa}`);
      console.log(`   Admin: ${novoAdmin.isAdmin}`);
    }

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao criar administrador:', error.message);
    rl.close();
    process.exit(1);
  }
}

criarAdmin();
