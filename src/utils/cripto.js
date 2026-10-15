/**
 * Criptografia de campos sensíveis em repouso (AES-256-GCM).
 * A chave vem de ECAC_ENCRYPTION_KEY (qualquer texto longo e aleatório; vira 32 bytes via SHA-256).
 * Formato gravado: enc:v1:<iv>:<tag>:<dados>, tudo em base64.
 */
const crypto = require('crypto');

const PREFIXO = 'enc:v1:';

const chave = () => {
  const segredo = process.env.ECAC_ENCRYPTION_KEY;
  if (!segredo || segredo.length < 16) return null;
  return crypto.createHash('sha256').update(segredo).digest();
};

function cifrar(texto) {
  if (texto === null || texto === undefined || texto === '') return texto;
  if (String(texto).startsWith(PREFIXO)) return texto; // já cifrado
  const k = chave();
  if (!k) throw new Error('ECAC_ENCRYPTION_KEY não configurada: recusando gravar o segredo em texto puro.');
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const dados = Buffer.concat([c.update(String(texto), 'utf8'), c.final()]);
  return `${PREFIXO}${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${dados.toString('base64')}`;
}

function decifrar(valor) {
  if (!valor || !String(valor).startsWith(PREFIXO)) return valor; // vazio ou legado em texto puro
  const k = chave();
  if (!k) throw new Error('ECAC_ENCRYPTION_KEY não configurada: não é possível ler o segredo.');
  const [iv, tag, dados] = String(valor).slice(PREFIXO.length).split(':').map((p) => Buffer.from(p, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', k, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString('utf8');
}

module.exports = { cifrar, decifrar };
