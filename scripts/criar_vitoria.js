require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../src/models');
const { v4: uuidv4 } = require('uuid');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Banco conectado');

    const clinicaId = uuidv4();
    const userId = uuidv4();
    const senhaHash = await bcrypt.hash('Vic1234@', 10);

    // Criar clínica (PF, dentista autônoma)
    await sequelize.query(`
      INSERT INTO clinicas (
        id, nome, nome_fantasia, tipo_pessoa, cpf, cro,
        cep, endereco, numero, complemento, bairro, cidade, estado,
        plano, limite_usuarios, ativo, created_at, updated_at
      ) VALUES (
        '${clinicaId}',
        'VITORIA DE OLIVEIRA CERVIGNI',
        'VITORIA DE OLIVEIRA CERVIGNI',
        'PF',
        '48970332847',
        '147202',
        '08674-011',
        'RUA BENJAMIN CONSTANT',
        '1079',
        'SL 12',
        'CENTRO',
        'SUZANO',
        'SP',
        'FREE',
        1,
        1,
        NOW(), NOW()
      )
    `);
    console.log('✅ Clínica criada:', clinicaId);

    // Criar usuário
    await sequelize.query(`
      INSERT INTO users (
        id, nome, email, senha, cro, cpf, tipo_pessoa,
        profissao, role, clinica_id, ativo, primeiro_acesso,
        created_at, updated_at
      ) VALUES (
        '${userId}',
        'VITORIA DE OLIVEIRA CERVIGNI',
        'vitoria.o.cervigni@gmail.com',
        '${senhaHash}',
        '147202',
        '489.703.328-47',
        'PF',
        'Dentista',
        'user',
        '${clinicaId}',
        1,
        1,
        NOW(), NOW()
      )
    `);
    console.log('✅ Usuário criado:', userId);
    console.log('📧 Email: vitoria.o.cervigni@gmail.com');
    console.log('🔑 Senha: Vic1234@');

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  process.exit(0);
}

run();
