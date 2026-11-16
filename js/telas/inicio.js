"use strict";
/* ÍRIS · Interface: Início. */

/* ---------- INÍCIO ---------- */
let calEvents = [], calState = "loading", calMsg = "";
function renderHome(){
  const t = today();
  renderDesk();
  $("today").textContent = longDate.format(new Date());
  const gTxt = `${greet()}${userName ? ", " + userName : ""}`;
  document.querySelectorAll(".js-greet,.js-greet2").forEach(e => { e.textContent = gTxt; });
  const av = $("tUser"); if (av) av.textContent = (userName || "N").trim().charAt(0).toUpperCase();

  // núcleo
  const per = {}; let total = 0;
  for (const a of Object.keys(AREAS)) { const w = doneThisWeek(a); per[a] = w.count; total += w.count; }
  $("doneHint").textContent = total ? `${total} nesta semana` : "nesta semana";
  finHomeCard();
  casaCard();

  // forma do dia
  const todayEvents = calEvents.filter(e => e.day === t && !e.allDay);
  const focus = items.filter(it => it.focus && !it.done);
  const datedToday = items.filter(it => !it.done && it.kind !== "ritual" && it.date === t);
  const parts = [];
  parts.push(todayEvents.length ? `${todayEvents.length} ${todayEvents.length === 1 ? "compromisso na agenda" : "compromissos na agenda"}` : "agenda livre");
  if (focus.length) parts.push(`${focus.length} ${focus.length === 1 ? "prioridade escolhida" : "prioridades escolhidas"}`);
  if (datedToday.length) parts.push(`${datedToday.length} ${datedToday.length === 1 ? "item marcado para hoje" : "itens marcados para hoje"}`);
  $("dayShape").textContent = `Hoje: ${parts.join(", ")}.` + (calState === "ok" && !todayEvents.length && !focus.length ? " Um bom dia para avançar no que você quer, sem correria." : "");
  $("irisLine").textContent = irisLine(total, focus.length, todayEvents.length);

  // foco
  const fl = $("focusList"); fl.textContent = "";
  const doneTodayFocus = items.filter(it => it.done && it.doneAt && dayFmt.format(new Date(it.doneAt)) === t && it.kind !== "ritual").slice(0,3);
  focus.forEach(it => fl.append(itemRow(it, { showArea:true, hideFocus:true })));
  const fp = $("focusPick"); fp.textContent = "";
  if (!focus.length) fp.append(h("div",{class:"empty"}, doneTodayFocus.length ? "Você já concluiu o que tinha escolhido para hoje. O resto pode esperar." : "Nada escolhido ainda. Toque no sol ao lado de qualquer item para trazê-lo para cá, ou ",
    !doneTodayFocus.length ? h("button",{class:"link",type:"button",onclick:suggestFocus},"deixe a ÍRIS sugerir") : null, !doneTodayFocus.length ? "." : null));
  else if (focus.length < 3) fp.append(h("div",{class:"empty",style:"padding-top:10px"}, `Espaço para mais ${3-focus.length}, se fizer sentido. `, h("button",{class:"link",type:"button",onclick:suggestFocus},"Ver sugestões")));

  // compromissos
  renderUpcoming();

  // áreas
  const a3 = $("areas3"); a3.textContent = "";
  for (const [key, cfg] of Object.entries(AREAS)) {
    const nx = nextFor(key); const n = pending(key).length; const w = per[key];
    a3.append(h("a",{class:"acard",href:"#"+key},
      h("div",{class:"top"}, icon(cfg.icon), h("b",null,cfg.label)),
      h("div",{class:"next"}, h("small",null,"Próximo passo"), nx ? nx.title : "Nada pendente. Aproveite o espaço."),
      h("div",{class:"cnt"}, `${n} em aberto · ${w} feito${w===1?"":"s"} na semana`)));
  }

  // rituais
  const rh = $("ritualsHome"); rh.textContent = "";
  const rituals = items.filter(it => it.kind === "ritual");
  if (!rituals.length) rh.append(h("div",{class:"empty"}, "Nenhum ritual ainda. ", h("button",{class:"link",type:"button",onclick:seedRituals},"Começar com três sugestões"), " ou crie os seus em Pessoal."));
  rituals.forEach(it => { const on = isRitualDoneToday(it); rh.append(h("button",{class:"chip"+(on?" on":""),type:"button","aria-pressed":String(on),onclick:()=>toggleRitual(it)}, h("span",{class:"c"}, icon("i-check")), it.title)); });

  // feito
  const dw = $("doneWeek"); dw.textContent = "";
  const w = doneThisWeek();
  const list = [...w.tasks.map(it => ({ title:it.title, d: dayFmt.format(new Date(it.doneAt)), area: it.area })),
    ...Object.values(w.rit.reduce((acc, r) => { (acc[r.title] = acc[r.title] || { title:r.title, n:0, area:r.area, d:r.d }).n++; if (r.d > acc[r.title].d) acc[r.title].d = r.d; return acc; }, {})).map(r => ({ title: `${r.title} · ${r.n}×`, d: r.d, area: r.area }))
  ].sort((a,b) => a.d < b.d ? 1 : -1);
  if (!list.length) dw.append(h("div",{class:"empty"}, "A semana está começando. O que você concluir aparece aqui, para lembrar que está caminhando."));
  else { const ul = h("ul",{class:"donelist"}); list.slice(0,8).forEach(x => ul.append(h("li",null, h("span",null,"✓"), h("span",null,x.title), h("small",null,prettyDay(x.d))))); dw.append(ul);
    if (list.length > 8) dw.append(h("div",{class:"muted small",style:"margin-top:8px"}, `e mais ${list.length-8}.`)); }
}
function irisLine(total, nFocus, nEvents){
  const hr = hourNow();
  if (!loaded) return "Organizando seu espaço…";
  if (!items.length) return "Bem-vinda. Para começar, toque em “Esvaziar a mente” e fale o que está na cabeça. Eu separo por área e você decide o que fica.";
  const behind = items.filter(it => !it.done && it.kind !== "ritual" && it.date && it.date < today()).length;
  if (behind) return `Tem ${behind} ${behind===1?"item que ficou":"itens que ficaram"} para trás. Sem culpa: dá para reagendar em um toque, dentro de cada área.`;
  if (hr >= 18) return total ? `Você concluiu ${total} ${total===1?"coisa":"coisas"} nesta semana. Bom momento para desacelerar.` : "O dia está terminando. Descansar também faz parte do plano.";
  if (!nFocus) return nEvents ? `Você tem ${nEvents} ${nEvents===1?"compromisso":"compromissos"} hoje. Que tal escolher só uma prioridade para o resto do tempo?` : "Agenda livre hoje. Escolha uma coisa que importa e comece por ela.";
  return "Foco definido. Se surgir algo novo, use “Esvaziar a mente” e siga no que escolheu.";
}
function renderUpcoming(){
  const box = $("upcoming"); box.textContent = "";
  const t = today(), lim = addDays(t, 7);
  const rows = [];
  calEvents.filter(e => e.day >= t).forEach(e => rows.push({ day:e.day, time:e.allDay?"":e.time, title:e.title, sub:[e.location, "agenda"].filter(Boolean).join(" · "), href:e.href, sort:e.day+(e.allDay?"00":e.time) }));
  items.filter(it => !it.done && DATED_KINDS.includes(it.kind) && it.kind !== "tarefa" && it.date && it.date >= t && it.date <= lim)
    .forEach(it => rows.push({ day:it.date, time:"", title:it.title, sub:`${AREAS[it.area].label} · ${KIND_LABEL[it.kind]}`, sort:it.date+"99" }));
  rows.sort((a,b) => a.sort < b.sort ? -1 : 1);
  if (!rows.length){
    box.append(h("div",{class:"empty"}, calState === "loading" ? "Abrindo sua agenda…" : calState === "error" ? calMsg : "Nada marcado para os próximos dias. Respiro na agenda."));
    if (calState === "error" && mcp) box.append(h("button",{class:"btn ghost",type:"button",style:"margin-top:8px",onclick:()=>loadCal(true)},"Permitir e carregar a agenda"));
    if (calState === "error" && !mcp && calNeedsLink) box.append(h("button",{class:"btn ghost",type:"button",style:"margin-top:8px",onclick:openAgendaLink},"Ligar o Google Agenda"));
    return;
  }
  rows.slice(0,6).forEach(r => box.append(h("div",{class:"when"},
    h("div",{class:"d"}, h("b",null, prettyDay(r.day)), r.time || "dia todo"),
    h("div",{style:"min-width:0"}, h("span",{class:"ttl"}, r.href ? h("a",{href:r.href,target:"_blank",rel:"noopener"}, r.title) : r.title), h("div",{class:"meta"}, r.sub)))));
  if (calState === "error") box.append(h("div",{class:"muted small",style:"margin-top:8px"}, calMsg));
}
async function seedRituals(){
  for (const t of ["Beber água ao acordar","10 minutos sem tela antes de dormir","Uma caminhada curta"]) await addItem({ kind:"ritual", area:"pessoal", title:t });
}
