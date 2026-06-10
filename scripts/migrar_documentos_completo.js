/**
 * Migração para atualizar tabela documentos
 * Adiciona as colunas que faltam conforme o modelo Documento.js
 */

require('dotenv').config();
const { sequelize } = require('../src/config/database');

async function migrarDocumentos() {
  try {
    console.log('🔄 Iniciando migração da tabela documentos...\n');

    // Adicionar coluna titulo
    console.log('1️⃣ Adicionando coluna titulo...');
    await sequelize.query(`
      ALTER TABLE documentos 
      ADD COLUMN IF NOT EXISTS titulo VARCHAR(255);
    `);
    console.log('✅ Coluna titulo adicionada');

    // Renomear tamanho para tamanho_arquivo
    console.log('\n2️⃣ Ajustando nome da coluna tamanho...');
    await sequelize.query(`
      ALTER TABLE documentos 
      RENAME COLUMN tamanho TO tamanho_arquivo;
    `);
    console.log('✅ Coluna tamanho renomeada para tamanho_arquivo');

    // Adicionar coluna tipo_mime
    console.log('\n3️⃣ Adicionando coluna tipo_mime...');
    await sequelize.query(`
      ALTER TABLE documentos 
      ADD COLUMN IF NOT EXISTS tipo_mime VARCHAR(100);
    `);
    console.log('✅ Coluna tipo_mime adicionada');

    // Adicionar coluna upload_por_admin
    console.log('\n4️⃣ Adicionando coluna upload_por_admin...');
    await sequelize.query(`
      ALTER TABLE documentos 
      ADD COLUMN IF NOT EXISTS upload_por_admin BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Coluna upload_por_admin adicionada');

    // Adicionar coluna admin_id
    console.log('\n5️⃣ Adicionando coluna admin_id...');
    await sequelize.query(`
      ALTER TABLE documentos 
      ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES users(id) ON DELETE SET NULL;
    `);
    console.log('✅ Coluna admin_id adicionada');

    // Renomear data_emissao para data_referencia
    console.log('\n6️⃣ Ajustando nome da coluna data_emissao...');
    await sequelize.query(`
      ALTER TABLE documentos 
      RENAME COLUMN data_emissao TO data_referencia;
    `);
    console.log('✅ Coluna data_emissao renomeada para data_referencia');

    // Renomear observacoes para apenas descricao (já existe)
    console.log('\n7️⃣ Removendo coluna observacoes (já temos descricao)...');
    await sequelize.query(`
      ALTER TABLE documentos 
      DROP COLUMN IF EXISTS observacoes;
    `);
    console.log('✅ Coluna observacoes removida');

    // Adicionar coluna faturamento_id
    console.log('\n8️⃣ Adicionando coluna faturamento_id...');
    await sequelize.query(`
      ALTER TABLE documentos 
      ADD COLUMN IF NOT EXISTS faturamento_id UUID REFERENCES faturamentos(id) ON DELETE SET NULL;
    `);
    console.log('✅ Coluna faturamento_id adicionada');

    // Adicionar coluna despesa_id
    console.log('\n9️⃣ Adicionando coluna despesa_id...');
    await sequelize.query(`
      ALTER TABLE documentos 
      ADD COLUMN IF NOT EXISTS despesa_id UUID REFERENCES despesas(id) ON DELETE SET NULL;
    `);
    console.log('✅ Coluna despesa_id adicionada');

    // Adicionar coluna visualizado
    console.log('\n🔟 Adicionando coluna visualizado...');
    await sequelize.query(`
      ALTER TABLE documentos 
      ADD COLUMN IF NOT EXISTS visualizado BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Coluna visualizado adicionada');

    // Adicionar coluna data_visualizacao
    console.log('\n1️⃣1️⃣ Adicionando coluna data_visualizacao...');
    await sequelize.query(`
      ALTER TABLE documentos 
      ADD COLUMN IF NOT EXISTS data_visualizacao TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✅ Coluna data_visualizacao adicionada');

    // Criar um ENUM para o tipo de documento se não existir
    console.log('\n1️⃣2️⃣ Configurando ENUM para tipo de documento...');
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_documentos_tipo AS ENUM ('nota_fiscal', 'recibo', 'comprovante', 'contrato', 'outros');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await sequelize.query(`
      ALTER TABLE documentos 
      ALTER COLUMN tipo TYPE enum_documentos_tipo USING tipo::enum_documentos_tipo;
    `);
    console.log('✅ ENUM configurado');

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('\n📋 Verificando estrutura final...\n');

    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'documentos'
      ORDER BY ordinal_position;
    `);

    results.forEach(col => {
      console.log(`   ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(30)} | ${col.is_nullable}`);
    });

    await sequelize.close();
    console.log('\n✅ Processo finalizado!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro na migração:', error.message);
    console.error('Stack:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

migrarDocumentos();
