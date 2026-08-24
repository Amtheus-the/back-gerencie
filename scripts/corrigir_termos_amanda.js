require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Termo } = require('../src/models');

const DIR = process.env.TERMOS_HTML_DIR;

const ATUALIZACOES = [
  { id: '9dea804d-a1a5-4f30-8844-fb4697369790', arquivo: '1.filled.html' },
  { id: '75205d60-e698-48a0-8a77-35c0a59a419e', arquivo: '2.filled.html' },
  { id: '6411fdf4-791e-439e-b1a2-013ae7a1ec89', arquivo: '3.filled.html' },
  { id: '55b134b6-5cd2-458a-80d3-d2cf0583a293', arquivo: '4.filled.html' },
  { id: '64508f3c-76d4-4ae1-bfc6-15e89fa09fe9', arquivo: '5.filled.html' },
  { id: '62177bfe-637a-44e2-b25e-df8399bfbcef', arquivo: '6.filled.html' },
  { id: 'b8762dad-3b30-4e6f-87b9-ce4544f27c55', arquivo: '7.filled.html' },
  { id: 'f1f9100c-0184-41df-a2e7-6bde7febcfb0', arquivo: '8.filled.html' },
  { id: '2842b357-217a-4ad0-8e6d-92328a51536e', arquivo: '9.filled.html' },
  { id: '62516734-165b-412f-b818-15ba53d7734a', arquivo: '10.filled.html' },
  { id: 'bbc6e219-2a7b-4766-ae49-6797772f6f07', arquivo: '11.filled.html' },
  { id: 'b418dc9b-255f-422b-af15-39f2a07abf58', arquivo: '12.filled.html' },
  { id: 'efd8e830-d036-44c3-871b-ee83b3ec289c', arquivo: '13.filled.html' }, // troca 14 -> 13 (conteúdo certo)
  { id: '0879b692-1726-4028-ade6-079d03cd74d6', arquivo: '15.filled.html' },
  { id: 'a2abee00-a023-45a4-8db2-191d0d48dfea', arquivo: '16.filled.html' },
  { id: '9432e59e-9ef6-4f29-beb7-2c7304c9c612', arquivo: '17.filled.html' },
];

async function run() {
  for (const { id, arquivo } of ATUALIZACOES) {
    const conteudo = fs.readFileSync(path.join(DIR, arquivo), 'utf8');
    const termo = await Termo.findByPk(id);
    if (!termo) { console.log('❌ não encontrado:', id); continue; }
    await termo.update({ conteudo });
    console.log('✅', termo.titulo, '(' + arquivo + ')');
  }
  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
