require('dotenv').config();
const { sequelize } = require('../src/models');

async function run() {
  await sequelize.query('ALTER TABLE clinicas MODIFY COLUMN logo LONGTEXT NULL');
  console.log('✅ Coluna logo agora é LONGTEXT');
  await sequelize.query('ALTER TABLE clinicas MODIFY COLUMN assinatura LONGTEXT NULL');
  console.log('✅ Coluna assinatura agora é LONGTEXT');

  // Logos truncados em exatamente 500 caracteres (limite antigo) viraram
  // imagens inválidas e irrecuperáveis — melhor limpar do que continuar
  // servindo um ícone de imagem quebrada pro paciente ver no atestado.
  const [afetados] = await sequelize.query(
    "SELECT id, nome FROM clinicas WHERE CHAR_LENGTH(logo) = 500"
  );
  if (afetados.length) {
    console.log('⚠️  Clínicas com logo truncado (será limpo, precisa reenviar):');
    afetados.forEach(c => console.log('  -', c.nome));
    await sequelize.query("UPDATE clinicas SET logo = NULL WHERE CHAR_LENGTH(logo) = 500");
    console.log('✅ Logos truncados limpos');
  } else {
    console.log('Nenhum logo truncado encontrado');
  }
  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
