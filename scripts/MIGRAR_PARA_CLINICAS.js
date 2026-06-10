/**
 * MIGRAÇÃO: CRIAR TABELA CLINICAS E MIGRAR DADOS
 * 
 * Este script:
 * 1. Cria a tabela clinicas
 * 2. Migra usuários existentes criando uma clínica para cada um
 * 3. Adiciona campo clinica_id na tabela users
 * 4. Vincula cada usuário à sua clínica criada
 */

require('dotenv').config();
const { sequelize } = require('../src/config/database');

async function migrarParaClinicas() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🏥 MIGRAÇÃO: CRIAR ESTRUTURA DE CLÍNICAS\n');
    console.log('═══════════════════════════════════════════════════\n');

    // ============================================
    // ETAPA 1: CRIAR TABELA CLINICAS
    // ============================================
    console.log('📋 ETAPA 1: Criando tabela clinicas...\n');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS clinicas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        tipo_pessoa VARCHAR(10) NOT NULL DEFAULT 'PF' CHECK (tipo_pessoa IN ('PF', 'PJ', 'HIBRIDO')),
        cpf VARCHAR(14) UNIQUE,
        cnpj VARCHAR(18) UNIQUE,
        telefone VARCHAR(20),
        telefone_secundario VARCHAR(20),
        email VARCHAR(255),
        cep VARCHAR(9),
        endereco VARCHAR(500),
        numero VARCHAR(10),
        complemento VARCHAR(100),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        estado VARCHAR(2),
        logo VARCHAR(500),
        site VARCHAR(255),
        instagram VARCHAR(255),
        facebook VARCHAR(255),
        observacoes TEXT,
        plano VARCHAR(20) NOT NULL DEFAULT 'FREE' CHECK (plano IN ('FREE', 'BASICO', 'PRO', 'ENTERPRISE')),
        data_assinatura TIMESTAMP WITH TIME ZONE,
        data_vencimento TIMESTAMP WITH TIME ZONE,
        limite_usuarios INTEGER NOT NULL DEFAULT 1,
        ativo BOOLEAN NOT NULL DEFAULT true,
        motivo_inativo TEXT,
        data_inativacao TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    console.log('✅ Tabela clinicas criada com sucesso!\n');

    // Criar índices
    console.log('📑 Criando índices...\n');
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_clinicas_nome ON clinicas(nome);
    `, { transaction });
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_clinicas_ativo ON clinicas(ativo);
    `, { transaction });
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_clinicas_cpf ON clinicas(cpf) WHERE cpf IS NOT NULL;
    `, { transaction });
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_clinicas_cnpj ON clinicas(cnpj) WHERE cnpj IS NOT NULL;
    `, { transaction });

    console.log('✅ Índices criados!\n');

    // ============================================
    // ETAPA 2: MIGRAR USUÁRIOS PARA CLÍNICAS
    // ============================================
    console.log('📋 ETAPA 2: Migrando usuários existentes para clínicas...\n');

    // Buscar todos os usuários
    const [usuarios] = await sequelize.query(`
      SELECT id, nome, email, tipo_pessoa, cpf, cnpj, telefone, nome_clinica, ativo
      FROM users
      WHERE is_admin = false
      ORDER BY created_at ASC;
    `, { transaction });

    console.log(`📊 Encontrados ${usuarios.length} usuários para migrar\n`);

    let clinicasCriadas = 0;

    for (const usuario of usuarios) {
      const nomeClinica = usuario.nome_clinica || usuario.nome;
      
      console.log(`  → Criando clínica para: ${usuario.nome}`);
      console.log(`     Nome da clínica: ${nomeClinica}`);

      // Criar clínica para cada usuário
      await sequelize.query(`
        INSERT INTO clinicas (
          id,
          nome,
          tipo_pessoa,
          cpf,
          cnpj,
          telefone,
          email,
          ativo,
          plano,
          limite_usuarios,
          data_assinatura,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          :nome,
          :tipoPessoa,
          :cpf,
          :cnpj,
          :telefone,
          :email,
          :ativo,
          'FREE',
          3,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING id;
      `, {
        replacements: {
          nome: nomeClinica,
          tipoPessoa: usuario.tipo_pessoa || 'PF',
          cpf: usuario.cpf,
          cnpj: usuario.cnpj,
          telefone: usuario.telefone,
          email: usuario.email,
          ativo: usuario.ativo
        },
        transaction
      });

      clinicasCriadas++;
      console.log(`     ✅ Clínica criada!\n`);
    }

    console.log(`✅ ${clinicasCriadas} clínicas criadas com sucesso!\n`);

    // ============================================
    // ETAPA 3: ADICIONAR CAMPO clinica_id EM USERS
    // ============================================
    console.log('📋 ETAPA 3: Adicionando campo clinica_id na tabela users...\n');

    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES clinicas(id) ON DELETE SET NULL;
    `, { transaction });

    console.log('✅ Campo clinica_id adicionado!\n');

    // Criar índice
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_clinica_id ON users(clinica_id);
    `, { transaction });

    console.log('✅ Índice criado!\n');

    // ============================================
    // ETAPA 4: VINCULAR USUÁRIOS ÀS CLÍNICAS
    // ============================================
    console.log('📋 ETAPA 4: Vinculando usuários às clínicas criadas...\n');

    // Para cada usuário, vincular à clínica com mesmo CPF/CNPJ ou nome
    for (const usuario of usuarios) {
      const nomeClinica = usuario.nome_clinica || usuario.nome;

      // Buscar a clínica correspondente
      const [clinicas] = await sequelize.query(`
        SELECT id FROM clinicas
        WHERE nome = :nome
        AND (
          (cpf IS NOT NULL AND cpf = :cpf) OR
          (cnpj IS NOT NULL AND cnpj = :cnpj) OR
          (cpf IS NULL AND cnpj IS NULL)
        )
        LIMIT 1;
      `, {
        replacements: {
          nome: nomeClinica,
          cpf: usuario.cpf,
          cnpj: usuario.cnpj
        },
        transaction
      });

      if (clinicas.length > 0) {
        const clinicaId = clinicas[0].id;
        
        await sequelize.query(`
          UPDATE users 
          SET clinica_id = :clinicaId
          WHERE id = :userId;
        `, {
          replacements: {
            clinicaId,
            userId: usuario.id
          },
          transaction
        });

        console.log(`  ✅ ${usuario.nome} → vinculado à clínica ${nomeClinica}`);
      }
    }

    console.log('\n✅ Todos os usuários vinculados!\n');

    // ============================================
    // ETAPA 5: ADICIONAR clinica_id EM OUTRAS TABELAS
    // ============================================
    console.log('📋 ETAPA 5: Adicionando clinica_id em faturamentos, despesas e documentos...\n');

    // Faturamentos
    await sequelize.query(`
      ALTER TABLE faturamentos 
      ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES clinicas(id) ON DELETE CASCADE;
    `, { transaction });

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_faturamentos_clinica_id ON faturamentos(clinica_id);
    `, { transaction });

    console.log('  ✅ Campo adicionado em faturamentos');

    // Despesas
    await sequelize.query(`
      ALTER TABLE despesas 
      ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES clinicas(id) ON DELETE CASCADE;
    `, { transaction });

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_despesas_clinica_id ON despesas(clinica_id);
    `, { transaction });

    console.log('  ✅ Campo adicionado em despesas');

    // Documentos
    await sequelize.query(`
      ALTER TABLE documentos 
      ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES clinicas(id) ON DELETE CASCADE;
    `, { transaction });

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_documentos_clinica_id ON documentos(clinica_id);
    `, { transaction });

    console.log('  ✅ Campo adicionado em documentos\n');

    // ============================================
    // ETAPA 6: PREENCHER clinica_id NOS REGISTROS
    // ============================================
    console.log('📋 ETAPA 6: Preenchendo clinica_id nos registros existentes...\n');

    // Faturamentos
    await sequelize.query(`
      UPDATE faturamentos f
      SET clinica_id = u.clinica_id
      FROM users u
      WHERE f.user_id = u.id
      AND f.clinica_id IS NULL;
    `, { transaction });

    const [faturamentosAtualizados] = await sequelize.query(`
      SELECT COUNT(*) as total FROM faturamentos WHERE clinica_id IS NOT NULL;
    `, { transaction });

    console.log(`  ✅ ${faturamentosAtualizados[0].total} faturamentos atualizados`);

    // Despesas
    await sequelize.query(`
      UPDATE despesas d
      SET clinica_id = u.clinica_id
      FROM users u
      WHERE d.user_id = u.id
      AND d.clinica_id IS NULL;
    `, { transaction });

    const [despesasAtualizadas] = await sequelize.query(`
      SELECT COUNT(*) as total FROM despesas WHERE clinica_id IS NOT NULL;
    `, { transaction });

    console.log(`  ✅ ${despesasAtualizadas[0].total} despesas atualizadas`);

    // Documentos
    await sequelize.query(`
      UPDATE documentos d
      SET clinica_id = u.clinica_id
      FROM users u
      WHERE d.user_id = u.id
      AND d.clinica_id IS NULL;
    `, { transaction });

    const [documentosAtualizados] = await sequelize.query(`
      SELECT COUNT(*) as total FROM documentos WHERE clinica_id IS NOT NULL;
    `, { transaction });

    console.log(`  ✅ ${documentosAtualizados[0].total} documentos atualizados\n`);

    // ============================================
    // COMMIT DA TRANSAÇÃO
    // ============================================
    await transaction.commit();

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('📊 RESUMO:');
    console.log(`   - Clínicas criadas: ${clinicasCriadas}`);
    console.log(`   - Usuários vinculados: ${usuarios.length}`);
    console.log(`   - Faturamentos atualizados: ${faturamentosAtualizados[0].total}`);
    console.log(`   - Despesas atualizadas: ${despesasAtualizadas[0].total}`);
    console.log(`   - Documentos atualizados: ${documentosAtualizados[0].total}\n`);

    console.log('🎯 Próximos passos:');
    console.log('   1. Atualizar models/index.js com relacionamentos');
    console.log('   2. Atualizar controllers para usar clinica_id');
    console.log('   3. Atualizar frontend para trabalhar com clínicas');
    console.log('   4. Testar o sistema completo\n');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ ERRO NA MIGRAÇÃO:', error.message);
    console.error('Stack:', error.stack);
    console.error('\n⚠️  ROLLBACK executado - nenhuma alteração foi feita no banco\n');
    await sequelize.close();
    process.exit(1);
  }
}

migrarParaClinicas();
