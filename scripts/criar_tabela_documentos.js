/**
 * Script para criar a tabela de documentos
 * Executa a migração para adicionar suporte a upload de documentos
 */

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Conectar ao banco de dados
const sequelize = new Sequelize(
  process.env.DB_NAME || 'gerencie_db',
  process.env.DB_USER || 'postgres',
  String(process.env.DB_PASSWORD || ''),
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log
  }
);

async function criarTabelaDocumentos() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    await sequelize.authenticate();
    console.log('✅ Conectado com sucesso!\n');

    console.log('📋 Criando tabela documentos...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS documentos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        nome_arquivo VARCHAR(255) NOT NULL,
        caminho_arquivo VARCHAR(500) NOT NULL,
        tamanho INTEGER,
        descricao TEXT,
        data_emissao DATE,
        valor DECIMAL(15, 2),
        observacoes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_documento_user
          FOREIGN KEY(user_id) 
          REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);

    console.log('✅ Tabela documentos criada com sucesso!');

    // Criar índices para melhor performance
    console.log('\n📋 Criando índices...');
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_documentos_user_id 
      ON documentos(user_id);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_documentos_tipo 
      ON documentos(tipo);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_documentos_data_emissao 
      ON documentos(data_emissao);
    `);

    console.log('✅ Índices criados com sucesso!');

    // Verificar estrutura da tabela
    console.log('\n📊 Verificando estrutura da tabela...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'documentos'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Colunas da tabela documentos:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('🎉 Tabela documentos está pronta para uso!');

  } catch (error) {
    console.error('\n❌ Erro ao criar tabela:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Executar migração
criarTabelaDocumentos();
