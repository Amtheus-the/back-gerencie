require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Termo } = require('../src/models');

const CLINICA_ID = 'a4cfef9e-4bba-4871-97a0-437fb9e0d37b'; // UP FACE CLINIC LTDA (Dra. Amanda)
const DIR = process.env.TERMOS_HTML_DIR;

const TERMOS = [
  { arquivo: '1.html', titulo: 'Hialuronidase', tipo: 'responsabilidade' },
  { arquivo: '2.html', titulo: 'Preenchimento Facial', tipo: 'responsabilidade' },
  { arquivo: '3.html', titulo: 'Botox (Toxina Botulínica)', tipo: 'responsabilidade' },
  { arquivo: '4.html', titulo: 'Contrato de Prestação de Serviços', tipo: 'outro' },
  { arquivo: '5.html', titulo: 'Fios de Sustentação', tipo: 'responsabilidade' },
  { arquivo: '6.html', titulo: 'Lipo de Papada', tipo: 'responsabilidade' },
  { arquivo: '7.html', titulo: 'Lavieen', tipo: 'responsabilidade' },
  { arquivo: '8.html', titulo: 'Otomodelação', tipo: 'responsabilidade' },
  { arquivo: '9.html', titulo: 'Bichectomia', tipo: 'responsabilidade' },
  { arquivo: '10.html', titulo: 'Lentes em Resina', tipo: 'responsabilidade' },
  { arquivo: '11.html', titulo: 'Tratamento Odontológico', tipo: 'responsabilidade' },
  { arquivo: '12.html', titulo: 'Implantes Dentários', tipo: 'responsabilidade' },
  { arquivo: '14.html', titulo: 'Tratamento de Canal (Endodontia)', tipo: 'responsabilidade' },
  { arquivo: '15.html', titulo: 'Extração Dental', tipo: 'responsabilidade' },
  { arquivo: '16.html', titulo: 'Jato de Plasma', tipo: 'responsabilidade' },
  { arquivo: '17.html', titulo: 'Rinomodelação Estruturada', tipo: 'responsabilidade' },
];

async function run() {
  for (const t of TERMOS) {
    const conteudo = fs.readFileSync(path.join(DIR, t.arquivo), 'utf8');
    const termo = await Termo.create({
      clinicaId: CLINICA_ID,
      titulo: t.titulo,
      tipo: t.tipo,
      conteudo,
      padrao: false,
      ativo: true,
    });
    console.log('✅', t.titulo, '->', termo.id);
  }
  process.exit(0);
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1); });
