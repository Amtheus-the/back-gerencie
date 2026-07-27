/**
 * Serviço de integração com Google Calendar
 * Sincroniza agendamentos do Gerencie com a agenda pessoal do dentista no Google (via OAuth2)
 */

const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const getOAuthClient = () => new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Monta a URL de consentimento do Google. `state` carrega o id do usuário
 * (assinado, ver googleCalendarRoutes.js) para identificá-lo no callback.
 */
const gerarUrlAutorizacao = (state) => getOAuthClient().generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // garante que o refresh_token volte também em reconexões
  scope: SCOPES,
  state,
});

const trocarCodigoPorTokens = async (code) => {
  const oauthClient = getOAuthClient();
  const { tokens } = await oauthClient.getToken(code);
  return tokens;
};

/**
 * Cliente autenticado para um usuário específico. Se o Google renovar o
 * access_token sozinho durante uma chamada, persiste o novo token no banco.
 */
const getClienteAutenticado = (usuario) => {
  const oauthClient = getOAuthClient();
  oauthClient.setCredentials({
    access_token: usuario.googleAccessToken,
    refresh_token: usuario.googleRefreshToken,
    expiry_date: usuario.googleTokenExpiry ? new Date(usuario.googleTokenExpiry).getTime() : undefined,
  });
  oauthClient.on('tokens', (tokens) => {
    const dados = {};
    if (tokens.access_token) dados.googleAccessToken = tokens.access_token;
    if (tokens.refresh_token) dados.googleRefreshToken = tokens.refresh_token;
    if (tokens.expiry_date) dados.googleTokenExpiry = new Date(tokens.expiry_date);
    if (Object.keys(dados).length > 0) {
      usuario.update(dados).catch((err) => console.error('[Google Calendar] Falha ao salvar tokens renovados:', err.message));
    }
  });
  return oauthClient;
};

const montarEvento = ({ dataHora, duracaoMinutos, pacienteNome, procedimentoNome, observacoes }) => {
  const inicio = new Date(dataHora);
  const fim = new Date(inicio.getTime() + (duracaoMinutos || 30) * 60000);
  return {
    summary: procedimentoNome ? `${pacienteNome} — ${procedimentoNome}` : pacienteNome,
    description: observacoes || undefined,
    start: { dateTime: inicio.toISOString() },
    end: { dateTime: fim.toISOString() },
  };
};

/**
 * Cria ou atualiza o evento no Google Calendar do dentista.
 * Retorna o google_event_id (novo ou existente) para salvar no Agendamento.
 */
const sincronizarEvento = async (usuario, dadosAgendamento, googleEventIdExistente) => {
  const auth = getClienteAutenticado(usuario);
  const calendar = google.calendar({ version: 'v3', auth });
  const evento = montarEvento(dadosAgendamento);

  if (googleEventIdExistente) {
    try {
      const resposta = await calendar.events.update({
        calendarId: 'primary',
        eventId: googleEventIdExistente,
        requestBody: evento,
      });
      return resposta.data.id;
    } catch (error) {
      // Evento pode ter sido apagado manualmente no Google — recria
      if (error.code !== 404 && error.code !== 410) throw error;
    }
  }

  const resposta = await calendar.events.insert({ calendarId: 'primary', requestBody: evento });
  return resposta.data.id;
};

const excluirEvento = async (usuario, googleEventId) => {
  if (!googleEventId) return;
  const auth = getClienteAutenticado(usuario);
  const calendar = google.calendar({ version: 'v3', auth });
  try {
    await calendar.events.delete({ calendarId: 'primary', eventId: googleEventId });
  } catch (error) {
    if (error.code !== 404 && error.code !== 410) throw error;
  }
};

module.exports = {
  gerarUrlAutorizacao,
  trocarCodigoPorTokens,
  sincronizarEvento,
  excluirEvento,
};
