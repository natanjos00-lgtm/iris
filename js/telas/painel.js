"use strict";
/* ÍRIS · Interface: painel inicial e avisos das áreas. */

/* ---------- painel inicial (relógio, clima, listas) ---------- */
function relDayLabel(d){ const t = today(); return d === t ? "Hoje" : d === addDays(t,1) ? "Amanhã" : prettyDay(d); }
function stepsPct(it){ const st = it.steps || []; return st.length ? Math.round(st.filter(x => x.done).length / st.length * 100) : (it.done ? 100 : 0); }

/* ---------- precisa de atenção (avisos das áreas) ---------- */
function renderAlerts(){
  const ul = $("alList"); if (!ul) return; ul.textContent = "";
  const t = today(), A = [];
  const aLabel = k => (AREAS[k] && AREAS[k].label) || "";
  const dm = d => d.slice(8) + "/" + d.slice(5,7);
  try {
    items.filter(it => !it.done && it.kind !== "ritual" && it.date).forEach(it => {
      if (it.date < t) A.push({ lv:0, ic:"i-check", area:aLabel(it.area), t:`Atrasado: ${it.title} (era ${dm(it.date)})`, href:"#" + it.area });
      else if (it.date === t) A.push({ lv:1, ic:"i-cal", area:aLabel(it.area), t:`Hoje: ${it.title}`, href:"#" + it.area });
      else if (it.date === addDays(t,1)) A.push({ lv:2, ic:"i-cal", area:aLabel(it.area), t:`Amanhã: ${it.title}`, href:"#" + it.area });
    });
  } catch {}
  try {
    const now = new Date(); const hm = new Intl.DateTimeFormat("en-GB",{timeZone:TZ,hour:"2-digit",minute:"2-digit",hour12:false}).format(now).split(":").map(Number); const nowM = (hm[0] % 24) * 60 + hm[1];
    calEvents.filter(e => e.day === t && !e.allDay && e.time).forEach(e => { const [h2, m2] = e.time.split(":").map(Number); const diff = h2 * 60 + m2 - nowM;
      if (diff >= 0 && diff <= 120) A.push({ lv:0, ic:"i-cal", area:"Agenda", t:`${e.time}: ${e.title}` + (diff ? ` (em ${diff >= 60 ? Math.floor(diff/60) + "h" + (diff % 60 ? String(diff % 60).padStart(2,"0") : "") : diff + " min"})` : " (agora)"), href:"#inicio", go:"dkComp" }); });
  } catch {}
  try { const un = mailThreads.filter(m => m.unread).length; if (un) A.push({ lv:1, ic:"i-iris", area:"E-mails", t:`${un} e-mail${un === 1 ? "" : "s"} não lido${un === 1 ? "" : "s"} na caixa principal`, href:"#inicio", go:"inbox" }); } catch {}
  try { finAlerts().filter(a => a.k !== "info").forEach(a => A.push({ lv:a.k === "warn" ? 0 : 1, ic:"i-coin", area:"Finanças", t:a.t, href:"#financeiro" })); } catch {}
  A.sort((a, b) => a.lv - b.lv);
  const top = A.slice(0, 7);
  $("alN").textContent = A.length ? (A.length > 7 ? "7 de " + A.length : String(A.length)) : "";
  if (!top.length) { ul.append(h("li",{class:"dk-empty attn-ok"}, "Tudo em dia. Nada precisa de você agora.")); return; }
  top.forEach(a => ul.append(h("li",{class:"attn-i lv" + a.lv},
    h("a",{href:a.href, onclick: a.go ? (() => setTimeout(() => { const e = $(a.go); if (e) e.scrollIntoView({ block:"center", behavior:"smooth" }); }, 150)) : null}, icon(a.ic),
      h("div",{class:"attn-t"}, h("small",null,a.area), h("span",null,a.t))))));
}
function renderDesk(){
  $("coreName").textContent = "ÍRIS"; try { v2Extras(); } catch {}
  renderAlerts();

  const fl = $("dkFocus"); fl.textContent = "";
  const foc = items.filter(it => it.focus && it.kind !== "ritual").slice(0,5);
  foc.forEach(it => fl.append(h("li",{class:it.done?"ok":""}, checkBtn(it.done, (it.done?"Desmarcar: ":"Concluir: ")+it.title, () => toggleDone(it)), h("span",null,it.title))));
  if (!foc.length) fl.append(h("li",{class:"dk-empty"}, "Nada escolhido ainda. ", h("button",{class:"link",type:"button",onclick:suggestFocus},"Deixe a ÍRIS sugerir")));
  $("dkFocusN").textContent = foc.length ? `${foc.filter(x => x.done).length} de ${foc.length}` : "";

  const ag = $("dkAgenda"); ag.textContent = ""; const t = today();
  const all = [ ...calEvents.filter(e => e.day >= t).map(e => ({ day:e.day, time:e.time || "", title:e.title })),
    ...items.filter(it => !it.done && it.date && it.date >= t && ["compromisso","reuniao","prova","atividade","obra"].includes(it.kind)).map(it => ({ day:it.date, time:"", title:it.title })) ]
    .sort((a,b) => (a.day + (a.time || "00")) < (b.day + (b.time || "00")) ? -1 : 1);
  const evs = all.filter(e => e.day === t).slice(0,5);   // "Agenda de hoje" mostra só o que é de hoje
  evs.forEach(e => ag.append(h("li",null, h("time",null, e.time || "Dia todo"), h("i"), h("span",null, e.title))));
  if (!evs.length) ag.append(h("li",{class:"dk-empty"}, calState === "error" && calNeedsLink ? h("button",{class:"link",type:"button",onclick:openAgendaLink},"Ligar o Google Agenda") : "Nada marcado para hoje."));
  const nxt = all.find(e => e.day > t);
  if (nxt) ag.append(h("li",{class:"ag-next"}, h("small",null, "Próximo: " + relDayLabel(nxt.day) + (nxt.time ? " às " + nxt.time : "") + " · " + nxt.title)));

  try { $("agDate").textContent = new Intl.DateTimeFormat("pt-BR",{timeZone:TZ,weekday:"short",day:"2-digit",month:"short"}).format(new Date()).replace(".","").replace(/^./, m => m.toUpperCase()); } catch {}
  try { const c = finCalc(curYM()); const f = $("dkFin"); f.textContent = ""; $("finMon").textContent = new Intl.DateTimeFormat("pt-BR",{timeZone:"UTC",month:"short",year:"numeric"}).format(new Date(curYM() + "-15T12:00:00Z")).replace(".","").replace(" de ","/");
    if (!c.renda && !c.spent) f.append(h("div",{class:"dk-empty"}, "Registre a renda e os gastos em ", h("a",{class:"link",href:"#financeiro"},"Finanças"), " para ver o resumo."));
    else { const sal = c.renda - c.spent;
      f.append(h("div",{class:"fr in"}, icon("i-up"), "Receitas", h("b",null, brl(c.renda))), h("div",{class:"fr out"}, icon("i-down"), "Despesas", h("b",null, brl(c.spent))),
        h("div",{class:"saldo" + (sal < 0 ? " neg" : "")}, "Saldo do mês", h("b",null, brl(sal)))); } } catch {}
  const gl = $("dkGoals"); gl.textContent = "";
  const goals = items.filter(it => ["meta","objetivo","projeto","iniciativa"].includes(it.kind) && !it.done)
    .sort((a,b) => (b.focus - a.focus) || (stepsPct(b) - stepsPct(a))).slice(0,3);
  goals.forEach(it => { const p = stepsPct(it); gl.append(h("li",null, icon(AREAS[it.area] ? AREAS[it.area].icon : "i-target"), h("div",null, h("span",{class:"t"},it.title), h("div",{class:"gl"}, h("div",{class:"bar",role:"img","aria-label":p+"%"}, h("i",{style:`width:${p}%`})), h("span",{class:"pc"}, p+"%"))))); });
  if (!goals.length) gl.append(h("li",{class:"dk-empty"}, "Crie uma meta com etapas para acompanhar o progresso. ", h("a",{class:"link",href:"#metas"},"Criar meta")));
}
$("dkNewEv").onclick = () => openCalDialog({});
function tickClock(){ try { $("clock").textContent = hmFmt.format(new Date()); } catch {} }
setInterval(tickClock, 15000); tickClock();
async function loadWeather(){
  try {
    const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-12.97&longitude=-38.5&current=temperature_2m,weather_code&timezone=America%2FSao_Paulo");
    const j = await r.json(); const c = j.current; if (!c) return;
    $("wxT").textContent = Math.round(c.temperature_2m) + "°C";
    const code = c.weather_code; const ic = code <= 1 ? "i-sun" : code <= 48 ? "i-cloud" : "i-rain";
    $("wx").querySelector("use").setAttribute("href", "#" + ic);
  } catch {}
}
loadWeather(); setInterval(loadWeather, 30*60*1000);
$("askbar").onsubmit = e => { e.preventDefault(); const v = $("askIn").value.trim(); if (!v) { $("askIn").focus(); return; } $("askIn").value = ""; location.hash = "#iris"; setTimeout(() => send(v), 60); };
