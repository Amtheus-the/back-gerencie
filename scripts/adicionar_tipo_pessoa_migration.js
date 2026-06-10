/**
 * Script para adicionar coluna tipo_pessoa na tabela faturamentos
 * Executa a migration necessária para corrigir erro de coluna não encontrada
 */

// Carregar variáveis de ambiente
require('dotenv').config();

const { Sequelize } = require('sequelize');

// Criar conexão direta (não usar config do projeto que pode ter problema)
const sequelize = new Sequelize(
  process.env.DB_NAME || 'gerencie_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres', // senha padrão se não tiver no .env
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function adicionarColunaTipoPessoa() {
  try {
    console.log('🔄 Iniciando migration para adicionar coluna tipo_pessoa...\n');

    // Verifica conexão
    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados estabelecida\n');

    // 1. Criar o tipo ENUM se não existir
    console.log('📝 Criando tipo ENUM tipo_pessoa_enum...');
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE tipo_pessoa_enum AS ENUM ('PF', 'PJ');
      EXCEPTION
        WHEN duplicate_object THEN 
          RAISE NOTICE 'Tipo tipo_pessoa_enum já existe';
      END $$;
    `);
    console.log('✅ Tipo ENUM verificado/criado\n');

    // 2. Adicionar a coluna tipo_pessoa
    console.log('📝 Adicionando coluna tipo_pessoa à tabela faturamentos...');
    await sequelize.query(`
      ALTER TABLE faturamentos
      ADD COLUMN IF NOT EXISTS tipo_pessoa tipo_pessoa_enum NOT NULL DEFAULT 'PF';
    `);
    console.log('✅ Coluna tipo_pessoa adicionada\n');

    // 3. Criar índice para melhorar performance
    console.log('📝 Criando índice para tipo_pessoa...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_faturamentos_tipo_pessoa 
      ON faturamentos(tipo_pessoa);
    `);
    console.log('✅ Índice criado\n');

    // 4. Verificar estrutura da tabela
    console.log('📊 Estrutura atual da tabela faturamentos:');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'faturamentos'
      ORDER BY ordinal_position;
    `);
    
    console.table(columns);

    // 5. Contar registros
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as total FROM faturamentos;
    `);
    console.log(`\n📈 Total de registros na tabela: ${countResult[0].total}`);

    // 6. Verificar distribuição de tipos
    const [distribuicao] = await sequelize.query(`
      SELECT tipo_pessoa, COUNT(*) as quantidade
      FROM faturamentos
      GROUP BY tipo_pessoa;
    `);
    console.log('\n📊 Distribuição por tipo de pessoa:');
    console.table(distribuicao);

    console.log('\n✅ Migration concluída com sucesso!');
    console.log('🎉 A coluna tipo_pessoa está pronta para uso\n');

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    console.error('\nDetalhes do erro:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexão com banco de dados fechada');
    process.exit(0);
  }
}

// Executar migration
adicionarColunaTipoPessoa();
