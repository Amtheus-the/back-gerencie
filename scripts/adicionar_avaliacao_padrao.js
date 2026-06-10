
// Carrega variáveis do .env
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
// Script para adicionar o procedimento 'Avaliação' em todas as clínicas que ainda não possuem
const { Clinica, Procedimento } = require('../src/models');

async function adicionarAvaliacaoPadrao() {
  const clinicas = await Clinica.findAll();
  let totalCriados = 0;
  for (const clinica of clinicas) {
    const existe = await Procedimento.findOne({
      where: {
        clinicaId: clinica.id,
        nome: 'Avaliação'
      }
    });
    if (!existe) {
      // Busca o primeiro usuário da clínica
      const usuarios = await clinica.getUsuarios ? await clinica.getUsuarios() : [];
      const userId = usuarios.length > 0 ? usuarios[0].id : null;
      if (!userId) {
        console.log(`Clínica '${clinica.nome}' não possui usuário vinculado. Procedimento não criado.`);
        continue;
      }
      await Procedimento.create({
        nome: 'Avaliação',
        descricao: 'Procedimento padrão de avaliação inicial',
        clinicaId: clinica.id,
        userId,
        ativo: true,
        valorPadrao: 0
      });
      totalCriados++;
      console.log(`Procedimento 'Avaliação' criado para clínica: ${clinica.nome}`);
    }
  }
  console.log(`Total de procedimentos criados: ${totalCriados}`);
  process.exit();
}

adicionarAvaliacaoPadrao().catch(err => {
  console.error('Erro ao adicionar procedimento:', err);
  process.exit(1);
});
