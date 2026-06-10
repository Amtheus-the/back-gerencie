/**
 * Script para criar o banco de dados PostgreSQL
 * Execute este arquivo antes de iniciar o servidor pela primeira vez
 */

require('dotenv').config();
const { Client } = require('pg');
const readline = require('readline');

// Interface para ler entrada do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pergunta(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createDatabase() {
  console.log('🔧 Setup do Banco de Dados PostgreSQL\n');
  
  // Pergunta qual usuário usar
  console.log('Escolha uma opção:');
  console.log('1 - Usar usuário vision_user (senha: 123456)');
  console.log('2 - Usar usuário postgres (superusuário)\n');
  
  const opcao = await pergunta('Digite 1 ou 2: ');
  
  let dbUser, dbPassword;
  
  if (opcao === '2') {
    dbUser = 'postgres';
    dbPassword = await pergunta('Digite a senha do usuário postgres: ');
  } else {
    dbUser = 'vision_user';
    dbPassword = '123456';
  }
  
  // Cliente para conectar ao PostgreSQL
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: dbUser,
    password: dbPassword,
    database: 'postgres' // Conecta ao banco padrão
  });

  try {
    await client.connect();
    console.log('📡 Conectado ao PostgreSQL');

    const dbName = process.env.DB_NAME || 'gerencie_db';

    // Verifica se o banco já existe
    const checkDb = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkDb.rows.length === 0) {
      // Cria o banco de dados
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Banco de dados "${dbName}" criado com sucesso!`);
      
      // Se estiver usando postgres, concede permissões ao vision_user
      if (dbUser === 'postgres') {
        await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO vision_user`);
        console.log(`✅ Permissões concedidas ao usuário vision_user`);
      }
    } else {
      console.log(`ℹ️  Banco de dados "${dbName}" já existe`);
    }

    await client.end();
    rl.close();
    console.log('✅ Setup do banco de dados concluído!');
    console.log('\n🚀 Agora você pode iniciar o servidor com: npm run dev\n');
  } catch (error) {
    console.error('❌ Erro ao criar banco de dados:', error.message);
    rl.close();
    process.exit(1);
  }
}

createDatabase();
