/**
 * Script para executar migração do Plano de Contas
 * Cria tabela plano_contas e insere dados padrão
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Carrega variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gerencie_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function executarMigracao() {
  const client = await pool.connect();
  
  try {
    console.log('🔵 Iniciando migração do Plano de Contas...\n');

    // Iniciar transação
    await client.query('BEGIN');

    // 1️⃣ CRIAR TABELA PLANO_CONTAS
    console.log('📝 Criando tabela plano_contas...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS plano_contas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          codigo VARCHAR(20) NOT NULL,
          nome VARCHAR(255) NOT NULL,
          tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
          dedutivel BOOLEAN DEFAULT false,
          categoria VARCHAR(100),
          descricao TEXT,
          ativo BOOLEAN DEFAULT true,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela plano_contas criada!\n');

    // Criar índices
    console.log('📝 Criando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_plano_contas_user_tipo ON plano_contas(user_id, tipo, ativo);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_plano_contas_codigo ON plano_contas(codigo);
    `);
    console.log('✅ Índices criados!\n');

    // Criar trigger
    console.log('📝 Criando trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_plano_contas_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_plano_contas_updated_at ON plano_contas;
    `);
    
    await client.query(`
      CREATE TRIGGER trigger_plano_contas_updated_at
          BEFORE UPDATE ON plano_contas
          FOR EACH ROW
          EXECUTE FUNCTION update_plano_contas_updated_at();
    `);
    console.log('✅ Trigger criado!\n');

    // 2️⃣ ATUALIZAR TABELA DESPESAS
    console.log('📝 Atualizando tabela despesas...');
    await client.query(`
      ALTER TABLE despesas 
          ADD COLUMN IF NOT EXISTS dedutivel BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS plano_conta_id UUID REFERENCES plano_contas(id);
    `);
    console.log('✅ Tabela despesas atualizada!\n');

    // 3️⃣ INSERIR CONTAS PADRÃO
    console.log('📝 Inserindo contas padrão para usuários ativos...');
    
    const contasPadrao = [
      // DEDUTÍVEIS (18 contas)
      { codigo: '3.1.01', nome: 'Salários e Encargos', dedutivel: true, categoria: 'Pessoal' },
      { codigo: '3.1.02', nome: 'Pró-labore', dedutivel: true, categoria: 'Pessoal' },
      { codigo: '3.2.01', nome: 'Aluguel do Consultório', dedutivel: true, categoria: 'Ocupação' },
      { codigo: '3.2.02', nome: 'Condomínio', dedutivel: true, categoria: 'Ocupação' },
      { codigo: '3.2.03', nome: 'IPTU', dedutivel: true, categoria: 'Ocupação' },
      { codigo: '3.3.01', nome: 'Energia Elétrica', dedutivel: true, categoria: 'Utilidades' },
      { codigo: '3.3.02', nome: 'Água e Esgoto', dedutivel: true, categoria: 'Utilidades' },
      { codigo: '3.3.03', nome: 'Internet e Telefone', dedutivel: true, categoria: 'Utilidades' },
      { codigo: '3.4.01', nome: 'Materiais Odontológicos', dedutivel: true, categoria: 'Operacional' },
      { codigo: '3.4.02', nome: 'Medicamentos', dedutivel: true, categoria: 'Operacional' },
      { codigo: '3.4.03', nome: 'Material de Limpeza', dedutivel: true, categoria: 'Operacional' },
      { codigo: '3.5.01', nome: 'Manutenção de Equipamentos', dedutivel: true, categoria: 'Manutenção' },
      { codigo: '3.5.02', nome: 'Depreciação', dedutivel: true, categoria: 'Manutenção' },
      { codigo: '3.6.01', nome: 'Contador', dedutivel: true, categoria: 'Serviços' },
      { codigo: '3.6.02', nome: 'Advogado', dedutivel: true, categoria: 'Serviços' },
      { codigo: '3.6.03', nome: 'Software e Tecnologia', dedutivel: true, categoria: 'Serviços' },
      { codigo: '3.7.01', nome: 'Marketing e Publicidade', dedutivel: true, categoria: 'Marketing' },
      { codigo: '3.8.01', nome: 'Cursos e Capacitação', dedutivel: true, categoria: 'Educação' },
      
      // NÃO DEDUTÍVEIS (4 contas)
      { codigo: '3.9.01', nome: 'Multas e Juros', dedutivel: false, categoria: 'Não Dedutível' },
      { codigo: '3.9.02', nome: 'Distribuição de Lucros', dedutivel: false, categoria: 'Não Dedutível' },
      { codigo: '3.9.03', nome: 'Despesas Pessoais', dedutivel: false, categoria: 'Não Dedutível' },
      { codigo: '3.9.04', nome: 'Brindes e Presentes', dedutivel: false, categoria: 'Não Dedutível' }
    ];

    // Buscar usuários ativos
    const resultUsuarios = await client.query(`
      SELECT id, nome, email FROM users WHERE ativo = true
    `);

    console.log(`👥 Encontrados ${resultUsuarios.rows.length} usuários ativos\n`);

    let totalInserido = 0;

    for (const usuario of resultUsuarios.rows) {
      console.log(`📤 Inserindo contas para: ${usuario.nome} (${usuario.email})`);
      
      for (const conta of contasPadrao) {
        // Verifica se já existe
        const existe = await client.query(
          'SELECT id FROM plano_contas WHERE user_id = $1 AND codigo = $2',
          [usuario.id, conta.codigo]
        );

        if (existe.rows.length === 0) {
          await client.query(`
            INSERT INTO plano_contas (codigo, nome, tipo, dedutivel, categoria, user_id, ativo)
            VALUES ($1, $2, 'despesa', $3, $4, $5, true)
          `, [conta.codigo, conta.nome, conta.dedutivel, conta.categoria, usuario.id]);
          
          totalInserido++;
        }
      }
      
      console.log(`   ✅ 22 contas inseridas para ${usuario.nome}`);
    }

    console.log(`\n🎉 Total de ${totalInserido} contas inseridas!\n`);

    // 4️⃣ VERIFICAÇÃO
    console.log('📊 Verificando resultados...');
    const totais = await client.query(`
      SELECT 
        dedutivel,
        COUNT(*) as total
      FROM plano_contas
      GROUP BY dedutivel
      ORDER BY dedutivel DESC
    `);

    console.log('📈 Totais por tipo:');
    totais.rows.forEach(row => {
      const tipo = row.dedutivel ? '✅ Dedutíveis' : '❌ Não Dedutíveis';
      console.log(`   ${tipo}: ${row.total} contas`);
    });

    // Commit da transação
    await client.query('COMMIT');
    console.log('\n✅ Migração concluída com sucesso!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migração:', error.message);
    console.error(error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
executarMigracao()
  .then(() => {
    console.log('\n🎊 Pronto! O Plano de Contas está configurado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha na migração:', error.message);
    process.exit(1);
  });
