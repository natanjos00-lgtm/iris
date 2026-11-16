"use strict";
/* ÍRIS · Integrações: Google Agenda e Gmail. */

/* ---------- CAIXA DE ENTRADA (Gmail) ---------- */
const MAIL_Q = { query:"in:inbox category:primary newer_than:3d", pageSize:8, view:"THREAD_VIEW_SUMMARY" };
let mailThreads = [], mailState = "loading", mailMsg = "";
function mailInfo(t){
  const m = (t.messages || []).slice(-1)[0] || {}; const nm = (m.addressDisplayNames || []).find(x => x.emailAddress === m.sender);
  return { de:(nm && nm.displayName) || m.sender || "", assunto:m.subject || "(sem assunto)", data:m.date || "", unread:(m.labelIds || []).includes("UNREAD"), href:safeHref(t.viewUrl || m.viewUrl) };
}
function mailErr(code){
  return { needs_reauth:"Reconecte o Gmail em Configurações → Conectores do claude.ai.", server_not_connected:"Conecte o Gmail em Configurações → Conectores para ver seus e-mails aqui.",
    selection_required:"Escolha qual Gmail usar quando o claude.ai perguntar.", not_in_manifest:"O Gmail não foi liberado para esta página.",
    approval_required:"A ÍRIS precisa da sua permissão para ler o Gmail.", blocked_by_policy:"Sua organização bloqueou o Gmail aqui.",
    server_unavailable:"O Gmail não respondeu agora. Ele tenta de novo sozinho." }[code] || "Não consegui abrir o Gmail agora.";
}
function renderInbox(){
  try { renderAlerts(); } catch {}
  const box = $("inbox"); if (!box) return; box.textContent = "";
  if (!mailThreads.length){
    box.append(h("div",{class:"empty"}, mailState === "loading" ? "Abrindo seu Gmail…" : mailState === "error" ? mailMsg : "Nada novo na caixa principal. Silêncio bom."));
    if (mailState === "error" && mcp) box.append(h("button",{class:"btn ghost",type:"button",style:"margin-top:8px",onclick:()=>loadMail(true)},"Permitir e carregar o Gmail"));
    if (mailState === "error" && !mcp && mailNeedsLink) box.append(h("button",{class:"btn ghost",type:"button",style:"margin-top:8px",onclick:()=>loadGmail(true)},"Ligar o Gmail"));
    return;
  }
  const unread = mailThreads.filter(m => m.unread).length;
  mailThreads.slice(0,4).forEach(m => {
    const d = new Date(m.data); const when = isNaN(d) ? "" : (dayFmt.format(d) === today() ? hmFmt.format(d) : prettyDay(dayFmt.format(d)));
    box.append(h("div",{class:"mail"+(m.unread?" unread":"")}, h("span",{class:"u"}),
      h("div",{style:"min-width:0"}, h("span",{class:"s"}, m.href ? h("a",{href:m.href,target:"_blank",rel:"noopener"}, m.assunto) : m.assunto), h("span",{class:"f"}, m.de)),
      h("small",null, when)));
  });
  box.append(h("div",{class:"muted small",style:"margin-top:10px"}, unread ? `${unread} não ${unread===1?"lido":"lidos"}. ` : "", h("a",{class:"link",href:"#iris",onclick:()=>setTimeout(()=>send("Olhe minha caixa principal dos últimos dias e me diga se algum e-mail pede atenção de verdade. Ignore propaganda e notificações automáticas."),0)},"Pedir à ÍRIS o que importa")));
}
async function loadMail(fresh){
  if (!mcp) return;
  try { const r = await mcp.callTool(MAIL, "search_threads", MAIL_Q, fresh ? { cache:{ refresh:true } } : undefined); mailThreads = ((r.payload && r.payload.threads) || []).map(mailInfo); mailState = "ok"; }
  catch (e) { mailState = "error"; mailMsg = mailErr(e.code); }
  renderInbox();
}
function watchMail(){
  mcp.watchTool(MAIL, "search_threads", MAIL_Q, ev => {
    if (ev.type === "data") { mailThreads = ((ev.result.payload && ev.result.payload.threads) || []).map(mailInfo); mailState = "ok"; }
    else { const c = ev.error.code; if (["needs_reauth","server_not_connected","not_in_manifest","blocked_by_policy","approval_required","selection_required"].includes(c)) mailThreads = []; if (!mailThreads.length) { mailState = "error"; mailMsg = mailErr(c); } }
    renderInbox();
  }, { refetchInterval: 600000, cache:{ staleTime: 120000, gcTime: 900000 } });
}

/* ---------- LEVAR PARA A AGENDA (criar evento) ---------- */
async function createEvent({ title, date, start, end, allDay, location }){
  const input = { summary:String(title).slice(0,200), timeZone:TZ };
  if (allDay) { input.allDay = true; input.startTime = date + "T00:00:00"; input.endTime = addDays(date,1) + "T00:00:00"; }
  else { input.startTime = `${date}T${start}:00`; input.endTime = `${date}T${end}:00`; }
  if (location) input.location = String(location).slice(0,200);
  if (!mcp) { // versão fora do Claude: API do Google Agenda, com a permissão de criar eventos
    let tok;
    try { tok = await calToken(false); } catch { tok = await calToken(true); }
    const body = { summary:input.summary, location:input.location };
    if (allDay) { body.start = { date }; body.end = { date:addDays(date,1) }; } else { body.start = { dateTime:`${date}T${start}:00`, timeZone:TZ }; body.end = { dateTime:`${date}T${end}:00`, timeZone:TZ }; }
    const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", { method:"POST", headers:{ Authorization:"Bearer " + tok, "Content-Type":"application/json" }, body:JSON.stringify(body) });
    if (!r.ok) {
      let j = {}; try { j = await r.json(); } catch {}
      const reason = (j.error && j.error.errors && j.error.errors[0] && j.error.errors[0].reason) || "";
      const msg = String((j.error && j.error.message) || "");
      if (r.status === 401 || /insufficient|scope/i.test(reason + msg)) { gForget(); throw { code:"cal_scope" }; }
      if (/accessNotConfigured|has not been used|disabled/i.test(reason + msg)) throw { code:"cal_api" };
      throw { code:"http_" + r.status, detail: msg.slice(0,120) };
    }
    calEvents.push({ title:input.summary, day:date, time: allDay ? "" : start, allDay:!!allDay, end:"", location:location || "", href:null }); // aparece já; o feed iCal do Google demora para atualizar
    if (current === "inicio") renderHome();
    return;
  }
  await mcp.callTool(CAL, "create_event", input);
  mcp.invalidate(CAL).catch(()=>{}); setTimeout(() => loadCal(true), 800);
}
function openCalDialog(pre){
  const slot = $("dlgSlot"); slot.textContent = "";
  const close = () => { slot.textContent = ""; };
  const err = h("p",{class:"err",hidden:true});
  const f = h("form",{class:"dlg",role:"dialog","aria-modal":"true","aria-labelledby":"dlgT",autocomplete:"off"},
    h("h2",{class:"t",id:"dlgT"},"Levar para a agenda"),
    h("label",null,"Título", h("input",{type:"text",id:"evT",value:pre.title||""})),
    h("label",null,"Dia", h("input",{type:"date",id:"evD",value:pre.date||today()})),
    h("label",{class:"chk"}, h("input",{type:"checkbox",id:"evA"}), "Dia inteiro"),
    h("div",{class:"two",id:"evTimes"}, h("label",null,"Começa", h("input",{type:"time",id:"evS",value:"09:00"})), h("label",null,"Termina", h("input",{type:"time",id:"evE",value:"10:00"}))),
    h("label",null,"Local (opcional)", h("input",{type:"text",id:"evL"})),
    err,
    h("div",{class:"row-end",style:"margin-top:4px"}, h("button",{class:"btn ghost",type:"button",onclick:close},"Cancelar"), h("button",{class:"btn olive",type:"submit",id:"evGo"},"Criar evento")));
  const ov = h("div",{class:"overlay",onclick:e=>{ if (e.target === ov) close(); }}, f);
  slot.append(ov);
  $("evA").onchange = () => { $("evTimes").hidden = $("evA").checked; };
  $("evS").onchange = () => { const [hh,mm] = $("evS").value.split(":").map(Number); if (!isNaN(hh)) $("evE").value = `${String(Math.min(23,hh+1)).padStart(2,"0")}:${String(mm).padStart(2,"0")}`; };
  ov.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  f.onsubmit = async e => { e.preventDefault();
    const title = $("evT").value.trim(), date = $("evD").value, allDay = $("evA").checked, start = $("evS").value, end = $("evE").value;
    if (!title || !date) { err.hidden = false; err.textContent = "Preencha o título e o dia."; return; }
    if (!allDay && (!start || !end || end <= start)) { err.hidden = false; err.textContent = "O horário de término precisa ser depois do início."; return; }
    $("evGo").disabled = true; $("evGo").textContent = "Criando…";
    try { await createEvent({ title, date, start, end, allDay, location:$("evL").value.trim() });
      if (pre.itemId) await updateItem(pre.itemId, { onCal:true, date });
      close(); toast("Evento criado no Google Agenda."); }
    catch (x) { err.hidden = false; err.textContent = x.code === "no_client" || x.code === "no_gis" ? "O Google não carregou. Recarregue a página e tente de novo." : x.code === "popup_closed" || x.code === "access_denied" ? "A permissão do Google Agenda não foi dada." : x.code === "cal_api" ? "A API do Google Agenda não está ligada no Google Cloud (Ativar em APIs e serviços)." : x.code === "cal_scope" ? "Faltou a permissão de criar eventos. Toque em Criar evento de novo e aceite no Google." : x.code === "http_403" ? "O Google Agenda recusou" + (x.detail ? ": " + x.detail : ". Confira a API do Google Agenda no Google Cloud.") : x.code === "http_401" ? "A permissão expirou. Tente de novo." : x.code === "approval_required" ? "O claude.ai precisa da sua permissão para criar eventos. Tente de novo e permita." : x.code === "server_unavailable" || x.code === "upstream_error" ? "A agenda não confirmou. Confira no Google Agenda antes de tentar de novo, para não duplicar." : calErr(x.code);
      $("evGo").disabled = false; $("evGo").textContent = "Criar evento"; }
  };
  setTimeout(() => $("evT").focus(), 0);
}
function askConfirm(text){
  return new Promise(resolve => {
    const slot = $("confirmSlot"); slot.textContent = "";
    const done = v => { slot.textContent = ""; resolve(v); };
    slot.append(h("div",{class:"confirm"}, h("p",null,text),
      h("div",{class:"row-end",style:"margin-top:0"}, h("button",{class:"btn ghost",type:"button",onclick:()=>done(false)},"Agora não"), h("button",{class:"btn olive",type:"button",onclick:()=>done(true)},"Confirmar"))));
    log.scrollTop = log.scrollHeight;
  });
}


/* ---------- agenda por endereço secreto (Google Agenda, somente leitura) ---------- */
let calNeedsLink = false;
async function loadIcs(){
  try {
    const { data, error } = await window.irisSb.functions.invoke("agenda", { body:{} }); if (error) throw error;
    if (data && data.error === "no_ics") { calState = "error"; calNeedsLink = true; calMsg = "Ligue o seu Google Agenda para ver os compromissos aqui."; }
    else if (data && data.error) { calState = "error"; calNeedsLink = true; calMsg = "Não consegui ler a agenda. Confira o endereço secreto e cole de novo."; }
    else { calEvents = (data.events || []).map(e => ({ ...e, href:null })); calState = "ok"; calNeedsLink = false; }
  } catch { if (calState !== "ok") { calState = "error"; calMsg = "A agenda não respondeu agora. Ela tenta de novo sozinha."; } }
  if (current === "inicio") renderHome();
}
function openAgendaLink(){
  const slot = $("dlgSlot"); slot.textContent = ""; const close = () => { slot.textContent = ""; };
  const inp = h("input",{type:"url",id:"icsIn",placeholder:"https://calendar.google.com/calendar/ical/…/basic.ics",required:true});
  const f = h("form",{class:"dlg",role:"dialog","aria-modal":"true",autocomplete:"off"},
    h("h2",{class:"t"},"Ligar o Google Agenda"),
    h("p",{class:"muted small",style:"margin:0"},"No Google Agenda (no computador): Configurações > clique na sua agenda > \"Integrar agenda\" > copie o \"Endereço secreto no formato iCal\". Cole aqui. A ÍRIS só lê, não altera nada. Não compartilhe esse endereço."),
    h("label",null,"Endereço secreto", inp),
    h("div",{class:"row-end"}, h("button",{class:"btn ghost",type:"button",onclick:close},"Cancelar"), h("button",{class:"btn olive",type:"submit"},"Salvar")));
  f.onsubmit = async e => { e.preventDefault(); const v = inp.value.trim(); if (!finMeta) { toast("Entre na sua conta para salvar."); return; }
    try { await finMeta.doc("agenda").set({ ics:v }); } catch { toast("Não consegui salvar o endereço."); return; }
    close(); calState = "loading"; toast("Agenda ligada. Buscando seus compromissos…"); loadIcs(); };
  const ov = h("div",{class:"overlay",onclick:e => { if (e.target === ov) close(); }}, f); slot.append(ov); setTimeout(() => inp.focus(), 0);
}

/* ---------- Gmail (somente leitura, pelo login do Google) ---------- */
const gToks = {};
const G_SCOPE = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.events";
function gLoad(){ try { const t = JSON.parse(localStorage.getItem("iris.gtok") || "null"); if (t && t.tok && Date.now() < t.exp - 60000) return t; } catch {} return null; }
async function gHint(){ try { const { data } = await window.irisSb.auth.getSession(); return (data && data.session && data.session.user && data.session.user.email) || undefined; } catch { return undefined; } }
function googleToken(kind, scope, interactive){
  return new Promise(async (res, rej) => {
    const t = gToks.all && Date.now() < gToks.all.exp - 60000 ? gToks.all : gLoad();
    if (t) { gToks.all = t; return res(t.tok); }
    const cid = window.IRIS_CONFIG && window.IRIS_CONFIG.GOOGLE_CLIENT_ID;
    if (!cid) return rej({ code:"no_client" });
    if (!(window.google && google.accounts && google.accounts.oauth2)) return rej({ code:"no_gis" });
    const hint = await gHint();
    const c = google.accounts.oauth2.initTokenClient({ client_id:cid, scope:G_SCOPE, hint, include_granted_scopes:true,
      callback: r => { if (r.error) return rej({ code:r.error }); const o = { tok:r.access_token, exp:Date.now() + (r.expires_in || 3600) * 1000 }; gToks.all = o; try { localStorage.setItem("iris.gtok", JSON.stringify(o)); } catch {} store.set("iris.g_gmail", true); res(r.access_token); },
      error_callback: e => rej({ code:(e && e.type) || "popup" }) });
    c.requestAccessToken({ prompt: interactive ? "" : "none" });
  });
}
function gForget(){ gToks.all = null; try { localStorage.removeItem("iris.gtok"); } catch {} }
const gmailToken = interactive => googleToken("gmail", "", interactive);
const calToken = interactive => googleToken("cal", "", interactive);
async function gapi(path, tok){ const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/" + path, { headers:{ Authorization:"Bearer " + tok } }); if (!r.ok) throw { code:"http_" + r.status }; return r.json(); }
async function loadGmail(interactive){
  try {
    const tok = await gmailToken(interactive);
    const list = await gapi("messages?maxResults=8&q=" + encodeURIComponent("in:inbox category:primary newer_than:3d"), tok);
    const ids = (list.messages || []).slice(0, 8);
    const msgs = await Promise.all(ids.map(m => gapi("messages/" + m.id + "?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date", tok)));
    mailThreads = msgs.map(m => { const hd = n => ((m.payload && m.payload.headers) || []).find(x => x.name.toLowerCase() === n); const from = (hd("from") || {}).value || "";
      const nm = from.replace(/<.*>/, "").replace(/"/g, "").trim() || from;
      return { de:nm, assunto:(hd("subject") || {}).value || "(sem assunto)", data:(hd("date") || {}).value || "", unread:(m.labelIds || []).includes("UNREAD"), href:safeHref("https://mail.google.com/mail/u/0/#inbox/" + m.threadId) }; });
    mailState = "ok"; mailNeedsLink = false;
  } catch (e) {
    mailState = "error"; mailNeedsLink = true;
    mailMsg = e && e.code === "no_client" ? "O Gmail ainda não foi configurado no Google Cloud." : (e && (e.code === "popup_closed" || e.code === "access_denied")) ? "A permissão do Gmail não foi dada." : "Ligue o Gmail para ver aqui os e-mails importantes.";
  }
  renderInbox();
}
let mailNeedsLink = false;
async function gmailSearch(q){
  let tok; try { tok = await gmailToken(false); } catch { throw new Error("O Gmail ainda não está ligado. Peça para ela tocar em Ligar o Gmail no cartão da caixa de entrada."); }
  const list = await gapi("messages?maxResults=10&q=" + encodeURIComponent(q), tok);
  const msgs = await Promise.all((list.messages || []).slice(0,10).map(m => gapi("messages/" + m.id + "?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date", tok)));
  return msgs.map(m => { const hd = n => ((m.payload && m.payload.headers) || []).find(x => x.name.toLowerCase() === n); return { de:((hd("from")||{}).value || "").replace(/<.*>/,"").replace(/"/g,"").trim(), assunto:(hd("subject")||{}).value || "", trecho:String(m.snippet||"").slice(0,200), data:(hd("date")||{}).value || "", naoLido:(m.labelIds||[]).includes("UNREAD") }; });
}
