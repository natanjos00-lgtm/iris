/**
 * ÍRIS · conector do Google (Apps Script, roda na sua própria conta, sem custo).
 *
 * Lê, só para consulta: e-mails recentes da caixa principal (Gmail), compromissos dos próximos
 * 14 dias (Google Agenda) e arquivos alterados nos últimos 3 dias (Google Drive, só nomes e dados
 * do arquivo, nunca o conteúdo). Envia um resumo para a central de entrada da ÍRIS a cada 30 minutos.
 * Não envia, apaga nem altera nada no Google: as permissões pedidas são todas de leitura.
 *
 * Instalação: veja a tela Entrada → Configurar, na ÍRIS.
 * Propriedades do script necessárias: IRIS_URL e IRIS_TOKEN.
 */

var LIMITES = { emails: 30, eventos: 60, arquivos: 30, diasEmail: 2, diasAgenda: 14, diasDrive: 3 };

/** Rode uma vez: cria o gatilho de 30 em 30 minutos e faz a primeira sincronização. */
function configurar() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sincronizar') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sincronizar').timeBased().everyMinutes(30).create();
  sincronizar();
}

/** Para parar o conector: rode esta função (ou apague o projeto). */
function desligar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
}

function sincronizar() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('IRIS_URL'), token = props.getProperty('IRIS_TOKEN');
  if (!url || !token) throw new Error('Preencha IRIS_URL e IRIS_TOKEN em Configurações do projeto → Propriedades do script.');
  var eventos = [], erros = [];
  [lerGmail_, lerAgenda_, lerDrive_].forEach(function (ler) {
    try { eventos = eventos.concat(ler()); } catch (e) { erros.push(ler.name.replace(/_$/, '') + ': ' + String(e.message || e).slice(0, 120)); }
  });
  var corpo = { token: token, events: eventos };
  if (!eventos.length && erros.length) corpo.erro = erros.join(' | ');
  var r = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(corpo), muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('A ÍRIS respondeu ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 200));
  if (erros.length) console.warn('Partes que falharam: ' + erros.join(' | '));
  console.log('Enviado: ' + eventos.length + ' itens.');
}

function lerGmail_() {
  var q = 'in:inbox category:primary newer_than:' + LIMITES.diasEmail + 'd';
  var lista = Gmail.Users.Messages.list('me', { q: q, maxResults: LIMITES.emails }).messages || [];
  return lista.map(function (m) {
    var msg = Gmail.Users.Messages.get('me', m.id, { format: 'metadata', metadataHeaders: ['Subject', 'From', 'Date'] });
    var cab = {};
    (msg.payload && msg.payload.headers || []).forEach(function (h) { cab[h.name.toLowerCase()] = h.value; });
    var de = String(cab.from || '').replace(/<.*>/, '').replace(/"/g, '').trim() || String(cab.from || '');
    return {
      source: 'gmail', external_id: msg.id,
      title: cab.subject || '(sem assunto)', snippet: decodificar_(msg.snippet || ''), sender: de,
      url: 'https://mail.google.com/mail/u/0/#inbox/' + msg.threadId,
      occurred_at: new Date(Number(msg.internalDate)).toISOString(),
      data: { naoLido: (msg.labelIds || []).indexOf('UNREAD') >= 0, conversa: msg.threadId, rotulos: msg.labelIds || [] }
    };
  });
}

function lerAgenda_() {
  var agora = new Date(), fim = new Date(agora.getTime() + LIMITES.diasAgenda * 864e5);
  var r = Calendar.Events.list('primary', { timeMin: agora.toISOString(), timeMax: fim.toISOString(), singleEvents: true, orderBy: 'startTime', maxResults: LIMITES.eventos });
  return (r.items || []).filter(function (e) { return e.status !== 'cancelled'; }).map(function (e) {
    var diaInteiro = !!(e.start && e.start.date);
    var ini = diaInteiro ? e.start.date + 'T03:00:00Z' : e.start.dateTime;
    var fimEv = e.end ? (e.end.date ? e.end.date + 'T03:00:00Z' : e.end.dateTime) : null;
    var eu = (e.attendees || []).filter(function (a) { return a.self; })[0];
    return {
      source: 'agenda', external_id: e.id,
      title: e.summary || '(sem título)', snippet: String(e.description || '').replace(/<[^>]+>/g, ' ').slice(0, 300),
      sender: (e.organizer && (e.organizer.displayName || e.organizer.email)) || '',
      url: e.htmlLink || null, occurred_at: ini,
      data: { inicio: ini, fim: fimEv, diaInteiro: diaInteiro, local: e.location || '', organizador: (e.organizer && e.organizer.email) || '', resposta: eu ? eu.responseStatus : '' }
    };
  });
}

function lerDrive_() {
  var desde = new Date(Date.now() - LIMITES.diasDrive * 864e5).toISOString();
  var r = Drive.Files.list({
    q: "modifiedTime > '" + desde + "' and trashed = false and mimeType != 'application/vnd.google-apps.folder'",
    orderBy: 'modifiedTime desc', pageSize: LIMITES.arquivos,
    fields: 'files(id,name,mimeType,webViewLink,modifiedTime,owners(displayName),lastModifyingUser(displayName))'
  });
  return (r.files || []).map(function (f) {
    return {
      source: 'drive', external_id: f.id + '@' + f.modifiedTime,
      title: f.name, snippet: '', sender: (f.lastModifyingUser && f.lastModifyingUser.displayName) || '',
      url: f.webViewLink || null, occurred_at: f.modifiedTime,
      data: { tipo: f.mimeType, dono: (f.owners && f.owners[0] && f.owners[0].displayName) || '', modificadoPor: (f.lastModifyingUser && f.lastModifyingUser.displayName) || '' }
    };
  });
}

function decodificar_(s) {
  return String(s).replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
