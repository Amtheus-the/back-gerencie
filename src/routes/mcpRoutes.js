/**
 * Conector MCP (Model Context Protocol) do Gerencie — deixa o Claude consultar
 * (somente leitura) os dados da clínica de quem gerou o token.
 *
 * Transporte "Streamable HTTP" sem sessão: cada POST é uma mensagem JSON-RPC e a
 * resposta vem como JSON. Autenticação por token pessoal (tela Perfil), enviado
 * no header `Authorization: Bearer <token>` ou no próprio endereço (/api/mcp/<token>),
 * pros clientes que não deixam configurar header.
 *
 * Importante: este router é montado ANTES do logger de requisições do server.js,
 * pra o token que vai no endereço nunca aparecer nos logs.
 */
const express = require('express');
const crypto = require('crypto');
const { ApiToken, User, Clinica } = require('../models');
const { TOOLS } = require('../services/mcpTools');

const router = express.Router();

const VERSOES_SUPORTADAS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const LIMITE_POR_MINUTO = 120;
const janelas = new Map(); // tokenId -> { inicio, contagem }

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

function dentroDoLimite(tokenId) {
  const agora = Date.now();
  const j = janelas.get(tokenId);
  if (!j || agora - j.inicio > 60000) { janelas.set(tokenId, { inicio: agora, contagem: 1 }); return true; }
  j.contagem += 1;
  return j.contagem <= LIMITE_POR_MINUTO;
}

async function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const doHeader = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  const token = req.params.token || doHeader;
  const negar = (status, msg) => res.status(status).set('WWW-Authenticate', 'Bearer').json({ error: msg });
  if (!token || !token.startsWith('gnc_')) return negar(401, 'Token ausente ou inválido.');

  try {
    const registro = await ApiToken.findOne({ where: { tokenHash: hashToken(token), revogadoEm: null } });
    if (!registro) return negar(401, 'Token inválido ou revogado.');
    const [user, clinica] = await Promise.all([
      User.findByPk(registro.userId, { attributes: ['id', 'ativo', 'clinicaId'] }),
      Clinica.findByPk(registro.clinicaId, { attributes: ['id', 'ativo', 'inadimplente'] }),
    ]);
    if (!user || !user.ativo || user.clinicaId !== registro.clinicaId) return negar(401, 'Usuário do token inativo.');
    if (!clinica || !clinica.ativo) return negar(403, 'Clínica inativa.');
    if (clinica.inadimplente) return negar(403, 'Assinatura com cobrança vencida. Regularize o pagamento no Gerencie.');
    if (!dentroDoLimite(registro.id)) return res.status(429).json({ error: 'Muitas requisições. Aguarde um minuto.' });

    if (!registro.ultimoUsoEm || Date.now() - new Date(registro.ultimoUsoEm).getTime() > 60000) {
      registro.update({ ultimoUsoEm: new Date() }).catch(() => {});
    }
    req.mcp = { clinicaId: registro.clinicaId, tokenId: registro.id };
    next();
  } catch (err) {
    console.error('[MCP] Erro na autenticação:', err.message);
    return res.status(500).json({ error: 'Erro interno.' });
  }
}

const erroRpc = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

async function tratar(msg, ctx) {
  const { id, method, params = {} } = msg || {};
  if (!method) return erroRpc(id, -32600, 'Requisição inválida.');
  const ehNotificacao = id === undefined;

  switch (method) {
    case 'initialize': {
      const pedida = params.protocolVersion;
      return {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: VERSOES_SUPORTADAS.includes(pedida) ? pedida : VERSOES_SUPORTADAS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'gerencie-odonto', version: '1.0.0' },
          instructions: 'Consulta somente leitura aos dados financeiros e de pacientes da clínica no Gerencie Odonto.',
        },
      };
    }
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) } };
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === params.name);
      if (!tool) return erroRpc(id, -32602, `Ferramenta desconhecida: ${params.name}`);
      try {
        const resultado = await tool.run(ctx.clinicaId, params.arguments || {});
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(resultado) }] } };
      } catch (err) {
        const erroDeUso = /formato|deve ser/.test(err.message);
        if (!erroDeUso) console.error(`[MCP] Erro na ferramenta ${tool.name}:`, err.message);
        return { jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: erroDeUso ? err.message : 'Erro ao consultar os dados.' }] } };
      }
    }
    default:
      if (ehNotificacao) return null; // ex: notifications/initialized
      return erroRpc(id, -32601, `Método não suportado: ${method}`);
  }
}

async function handler(req, res) {
  const corpo = req.body;
  if (!corpo || typeof corpo !== 'object') return res.status(400).json(erroRpc(null, -32700, 'JSON inválido.'));
  const mensagens = Array.isArray(corpo) ? corpo : [corpo];
  const respostas = (await Promise.all(mensagens.map((m) => tratar(m, req.mcp)))).filter(Boolean);
  if (respostas.length === 0) return res.status(202).end(); // só notificações
  return res.json(Array.isArray(corpo) ? respostas : respostas[0]);
}

// Servidor sem sessão e sem stream: GET/DELETE não se aplicam
const naoSuportado = (req, res) => res.status(405).set('Allow', 'POST').json({ error: 'Use POST.' });

router.post('/', autenticar, handler);
router.post('/:token', autenticar, handler);
router.get('/', naoSuportado);
router.get('/:token', naoSuportado);
router.delete('/', naoSuportado);
router.delete('/:token', naoSuportado);

module.exports = router;
