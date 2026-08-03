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

const TIMEZONE_CLINICA = 'America/Sao_Paulo';

// O Gerencie trata data_hora como "horário de parede" — os dígitos UTC do
// valor armazenado JÁ são o horário de Brasília pretendido (o front usa
// timeZone="UTC" no calendário pra exibir sem nenhuma conversão). Por isso,
// pro Google entender a hora certa, mandamos esses mesmos dígitos com
// timeZone explícito, em vez de toISOString() (que rotularia como UTC de verdade).
const paraHorarioDeParede = (data) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${data.getUTCFullYear()}-${pad(data.getUTCMonth() + 1)}-${pad(data.getUTCDate())}T${pad(data.getUTCHours())}:${pad(data.getUTCMinutes())}:${pad(data.getUTCSeconds())}`;
};

const montarEvento = ({ dataHora, duracaoMinutos, pacienteNome, procedimentoNome, observacoes }) => {
  const inicio = new Date(dataHora);
  const fim = new Date(inicio.getTime() + (duracaoMinutos || 30) * 60000);
  return {
    summary: procedimentoNome ? `${pacienteNome} — ${procedimentoNome}` : pacienteNome,
    description: observacoes || undefined,
    start: { dateTime: paraHorarioDeParede(inicio), timeZone: TIMEZONE_CLINICA },
    end: { dateTime: paraHorarioDeParede(fim), timeZone: TIMEZONE_CLINICA },
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

// Caminho inverso do paraHorarioDeParede: pega um dateTime real do Google
// (com fuso correto) e devolve os mesmos dígitos "rotulados" como UTC, pra
// bater com a convenção do calendário do Gerencie (timeZone="UTC" no front).
const paraConvencaoGerencie = (dataISOComFuso) => {
  const data = new Date(dataISOComFuso);
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_CLINICA,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(data).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}.000Z`;
};

/**
 * Lista eventos do Google Calendar do dentista num intervalo de datas.
 * Usado pra mostrar compromissos pessoais criados direto no Google (fora do Gerencie).
 */
const listarEventos = async (usuario, timeMin, timeMax) => {
  const auth = getClienteAutenticado(usuario);
  const calendar = google.calendar({ version: 'v3', auth });
  const resposta = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  });
  return (resposta.data.items || [])
    .filter((evento) => evento.status !== 'cancelled' && (evento.start?.dateTime || evento.start?.date))
    .map((evento) => ({
      id: evento.id,
      titulo: evento.summary || 'Compromisso pessoal',
      inicio: evento.start.dateTime ? paraConvencaoGerencie(evento.start.dateTime) : evento.start.date,
      fim: evento.end?.dateTime ? paraConvencaoGerencie(evento.end.dateTime) : evento.end?.date,
      diaTodo: !evento.start.dateTime,
    }));
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
  listarEventos,
  excluirEvento,
};
