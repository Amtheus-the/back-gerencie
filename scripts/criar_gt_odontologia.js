require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.DB_HOST = 'srv1722.hstgr.io'; // força conexão remota (produção)

const { sequelize, Clinica, User, PlanoContas } = require('../src/models');

async function run() {
  const t = await sequelize.transaction();
  try {
    await sequelize.authenticate();
    console.log('✅ Banco conectado (produção)\n');

    // ── Checagens de duplicidade ──
    const emailExiste = await User.findOne({ where: { email: 'especializadagtodontologia@gmail.com' } });
    if (emailExiste) throw new Error('E-mail já cadastrado: ' + emailExiste.id);

    const cnpjExiste = await Clinica.findOne({ where: { cnpj: '60.501.951/0001-76' } });
    if (cnpjExiste) throw new Error('CNPJ já cadastrado numa clínica: ' + cnpjExiste.id);

    // ── Clínica ──
    const clinica = await Clinica.create({
      nome: 'Gt Odontologia Especializada',
      tipoPessoa: 'PJ',
      cnpj: '60.501.951/0001-76',
      email: 'especializadagtodontologia@gmail.com',
      cep: '02265-002',
      endereco: 'Avenida Guapira',
      numero: '1224',
      complemento: 'Anexo b',
      bairro: 'Tucuruvi',
      cidade: 'São Paulo',
      estado: 'SP',
      plano: 'FREE',
      limiteUsuarios: 3,
      ativo: true,
      atendeOdontologia: true,
      atendeEstetica: true,           // CNAE secundário 9602-5/02 (estética)
      regimeTributario: '1',          // Simples Nacional
      codigoMunicipioIbge: '3550308', // São Paulo/SP
    }, { transaction: t });
    console.log('✅ Clínica criada');
    console.log('   ID:', clinica.id);

    // ── Usuário (senha é hasheada pelo hook beforeCreate) ──
    const user = await User.create({
      nome: 'Bárbara Gonçalves',
      email: 'especializadagtodontologia@gmail.com',
      senha: 'Gtodonto1@',
      nomeClinica: 'Gt Odontologia Especializada',
      cnpj: '60.501.951/0001-76',
      profissao: 'Dentista',
      role: 'dentista',
      primeiroAcesso: true,
      ativo: true,                    // já ativo (sem validação de e-mail)
      clinicaId: clinica.id,
    }, { transaction: t });
    console.log('✅ Usuário criado');
    console.log('   ID:', user.id);

    // ── Planos de conta padrão ──
    const planosPadrao = [
      'Aluguel do Consultório',
      'Despesas com Material Odontológico',
      'Salários e Encargos de Funcionários Registrados no CPF',
      'Despesas com Manutenção de Equipamentos',
      'Despesas com Telefonia e Internet',
      'Despesas com Energia Elétrica',
      'Despesas com Contabilidade',
      'Despesas com Propaganda e Publicidade',
      'Despesas com Produtos de Limpeza e Esterilização',
    ];
    for (let i = 0; i < planosPadrao.length; i++) {
      await PlanoContas.create({
        codigo: Date.now().toString() + i,
        nome: planosPadrao[i],
        tipo: 'despesa',
        dedutivel: true,
        ativo: true,
        userId: user.id,
      }, { transaction: t });
    }
    console.log('✅ 9 planos de conta padrão criados');

    await t.commit();

    console.log('\n──────────── RESUMO ────────────');
    console.log('Clínica:   Gt Odontologia Especializada (PJ, FREE)');
    console.log('CNPJ:      60.501.951/0001-76');
    console.log('Login:     especializadagtodontologia@gmail.com');
    console.log('Senha:     Gtodonto1@');
    console.log('Titular:   Bárbara Gonçalves (Dentista)');
    console.log('Estética:  ativada (Mapa Estético)');
    console.log('Clínica ID:', clinica.id);
    console.log('User ID:   ', user.id);
    console.log('────────────────────────────────');
  } catch (err) {
    await t.rollback();
    console.error('❌ Erro (rollback feito):', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
