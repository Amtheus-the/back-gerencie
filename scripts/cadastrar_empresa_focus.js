/**
 * Cadastra uma clínica como empresa emissora na Focus NFe (passo obrigatório
 * antes dela conseguir emitir NFS-e pela nova integração).
 *
 * Uso:
 *   node scripts/cadastrar_empresa_focus.js <clinicaId> <caminhoCertificado.pfx> <senhaCertificado> [regimeTributario] [ultimoRpsUsado]
 *
 * regimeTributario: 1=Simples Nacional, 2=Simples c/ excesso, 3=Normal, 4=MEI (default: 1)
 *
 * ultimoRpsUsado: se a clínica JÁ emitiu NFS-e antes (por outro sistema ou
 * direto no portal da prefeitura), informe o último número de RPS usado.
 * Sem isso, o cadastro novo começa do RPS 1 — e em São Paulo, reaproveitar
 * um número de RPS já usado há mais de 6 meses é rejeitado pela prefeitura
 * com "Operação não autorizada por meio eletrônico em razão de ultrapassado
 * o prazo permitido". Confirme o último número no portal da prefeitura antes
 * de rodar (o sistema municipal só mostra o último mês).
 *
 * Preenche automaticamente o código IBGE do município (via API pública do
 * IBGE) se a clínica ainda não tiver um salvo.
 */
require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const { sequelize } = require('../src/models');
const Clinica = require('../src/models/Clinica');
const { cadastrarEmpresa, definirProximoNumeroRps } = require('../src/services/focusNfeService');

async function buscarCodigoIbge(cidade, uf) {
  const { data } = await axios.get(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
  const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const alvo = normalizar(cidade);
  const encontrado = data.find((m) => normalizar(m.nome) === alvo);
  return encontrado ? String(encontrado.id) : null;
}

async function run() {
  const [, , clinicaId, caminhoCertificado, senhaCertificado, regimeTributarioArg, ultimoRpsUsadoArg] = process.argv;

  if (!clinicaId || !caminhoCertificado || !senhaCertificado) {
    console.error('Uso: node scripts/cadastrar_empresa_focus.js <clinicaId> <caminhoCertificado.pfx> <senhaCertificado> [regimeTributario]');
    process.exit(1);
  }

  const clinica = await Clinica.findByPk(clinicaId);
  if (!clinica) {
    console.error(`❌ Clínica ${clinicaId} não encontrada`);
    process.exit(1);
  }

  const faltando = [];
  if (!clinica.cnpj && !clinica.cpf) faltando.push('cnpj/cpf');
  if (!clinica.endereco) faltando.push('endereco (logradouro)');
  if (!clinica.numero) faltando.push('numero');
  if (!clinica.bairro) faltando.push('bairro');
  if (!clinica.cidade) faltando.push('cidade');
  if (!clinica.estado) faltando.push('estado (UF)');
  if (!clinica.cep) faltando.push('cep');
  if (faltando.length) {
    console.error(`❌ Cadastro da clínica incompleto. Faltando: ${faltando.join(', ')}`);
    process.exit(1);
  }

  if (!fs.existsSync(caminhoCertificado)) {
    console.error(`❌ Certificado não encontrado em: ${caminhoCertificado}`);
    process.exit(1);
  }

  let codigoMunicipio = clinica.codigoMunicipioIbge;
  if (!codigoMunicipio) {
    console.log(`🔎 Buscando código IBGE de ${clinica.cidade}/${clinica.estado}...`);
    codigoMunicipio = await buscarCodigoIbge(clinica.cidade, clinica.estado);
    if (!codigoMunicipio) {
      console.error(`❌ Não achei o código IBGE pra "${clinica.cidade}/${clinica.estado}". Confere o nome da cidade no cadastro da clínica e roda de novo, ou preenche codigo_municipio_ibge manualmente.`);
      process.exit(1);
    }
    console.log(`✅ Código IBGE: ${codigoMunicipio}`);
  }

  const certificadoBase64 = fs.readFileSync(caminhoCertificado).toString('base64');
  const regimeTributario = regimeTributarioArg || clinica.regimeTributario || '1';

  console.log(`📤 Cadastrando "${clinica.nome}" (${clinica.cnpj || clinica.cpf}) na Focus NFe...`);

  try {
    const empresa = await cadastrarEmpresa({
      nome: clinica.nome,
      cnpj: clinica.cnpj ? clinica.cnpj.replace(/\D/g, '') : undefined,
      cpf: !clinica.cnpj && clinica.cpf ? clinica.cpf.replace(/\D/g, '') : undefined,
      logradouro: clinica.endereco,
      numero: clinica.numero,
      bairro: clinica.bairro,
      municipio: clinica.cidade,
      uf: clinica.estado,
      cep: (clinica.cep || '').replace(/\D/g, ''),
      codigoMunicipio,
      regimeTributario,
      inscricaoMunicipal: clinica.inscricaoMunicipal,
      email: clinica.email,
      certificadoBase64,
      senhaCertificado,
    });

    await clinica.update({
      codigoMunicipioIbge: codigoMunicipio,
      regimeTributario,
      focusNfeToken: empresa.token_producao,
    });

    console.log('✅ Empresa cadastrada com sucesso na Focus NFe!');
    console.log('   token_producao salvo em clinica.focusNfeToken');
    console.log('   token_homologacao (se precisar testar em sandbox):', empresa.token_homologacao);

    if (ultimoRpsUsadoArg) {
      const proximoNumero = parseInt(ultimoRpsUsadoArg, 10) + 1;
      console.log(`🔧 Ajustando próximo RPS pra ${proximoNumero} (continuando de onde a clínica já emitia)...`);
      await definirProximoNumeroRps(empresa.id, proximoNumero);
      console.log('✅ Próximo RPS ajustado.');
    } else {
      console.log('⚠️  Nenhum "último RPS usado" informado — cadastro ficou com RPS começando do 1.');
      console.log('   Se essa clínica JÁ emitiu nota antes por outro sistema, confirme o último número no');
      console.log('   portal da prefeitura e rode: node scripts/cadastrar_empresa_focus.js (de novo, mesmo cadastro)');
      console.log('   ou ajuste direto chamando definirProximoNumeroRps — senão a primeira emissão pode cair no');
      console.log('   erro "Operação não autorizada por meio eletrônico em razão de ultrapassado o prazo permitido".');
    }
  } catch (err) {
    console.error('❌ Erro ao cadastrar empresa:', JSON.stringify(err.response?.data || err.message, null, 2));
    process.exit(1);
  }

  process.exit(0);
}

run().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
