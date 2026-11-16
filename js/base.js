"use strict";
/* ÍRIS · Base: utilidades, áreas, regras de leitura, componentes e estado compartilhado. */

const $ = id => document.getElementById(id);
const TZ = "America/Sao_Paulo";

/* ---------- utilidades ---------- */
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  if (attrs) for (const [k,v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style") el.style.cssText = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
function icon(id, cls){ const s = document.createElementNS("http://www.w3.org/2000/svg","svg"); s.setAttribute("class","i"+(cls?" "+cls:"")); s.setAttribute("aria-hidden","true"); const u = document.createElementNS("http://www.w3.org/2000/svg","use"); u.setAttribute("href","#"+id); s.append(u); return s; }
const store = {
  get(k,d){ try{ const v = localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch{ return d; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }
};
const dayFmt = new Intl.DateTimeFormat("en-CA",{timeZone:TZ});
const today = () => dayFmt.format(new Date());
const addDays = (iso, n) => { const d = new Date(iso+"T12:00:00Z"); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const weekdayIdx = iso => (new Date(iso+"T12:00:00Z").getUTCDay()+6)%7; // seg=0
const weekStart = () => addDays(today(), -weekdayIdx(today()));
const longDate = new Intl.DateTimeFormat("pt-BR",{timeZone:TZ,weekday:"long",day:"numeric",month:"long"});
const hmFmt = new Intl.DateTimeFormat("pt-BR",{timeZone:TZ,hour:"2-digit",minute:"2-digit"});
function prettyDay(iso){
  if (!iso) return "";
  const t = today();
  if (iso === t) return "hoje";
  if (iso === addDays(t,1)) return "amanhã";
  if (iso === addDays(t,-1)) return "ontem";
  const d = new Date(iso+"T12:00:00Z");
  const diff = Math.round((d - new Date(t+"T12:00:00Z"))/864e5);
  if (diff > 1 && diff < 7) return new Intl.DateTimeFormat("pt-BR",{weekday:"long",timeZone:"UTC"}).format(d);
  return new Intl.DateTimeFormat("pt-BR",{day:"numeric",month:"short",timeZone:"UTC"}).format(d).replace(".","");
}
function hourNow(){ return +new Intl.DateTimeFormat("en-GB",{timeZone:TZ,hour:"2-digit",hour12:false}).format(new Date()) % 24; }
function greet(){ const hr = hourNow(); return hr < 5 ? "Boa noite" : hr < 12 ? "Bom dia" : hr < 18 ? "Boa tarde" : "Boa noite"; }
function toast(msg, undo){
  const slot = $("toastSlot"); slot.textContent = "";
  const t = h("div",{class:"toast",role:"status"}, msg, undo ? h("button",{type:"button",onclick:()=>{ undo(); slot.textContent=""; }},"Desfazer") : null);
  slot.append(t); clearTimeout(toast._t); toast._t = setTimeout(()=>{ slot.textContent=""; }, 5000);
}


/* ---------- áreas ---------- */
const AREAS = {
  pessoal: { label:"Pessoal", icon:"i-leaf", color:"#6A7150", intro:"Rotina, autocuidado, compromissos e objetivos. A parte da vida que sustenta todas as outras.",
    secs:[ {kind:"ritual", label:"Rotina e autocuidado", intro:"Pequenos gestos que se repetem. Marque o que fez hoje.", ph:"Novo ritual (ex.: caminhar 20 min)"},
           {kind:"compromisso", label:"Compromissos", intro:"Consultas, encontros, coisas da casa.", dated:true, ph:"Novo compromisso"},
           {kind:"objetivo", label:"Objetivos", intro:"O que você quer construir. Divida em passos pequenos.", steps:true, ph:"Novo objetivo"} ] },
  trabalho: { label:"Trabalho", icon:"i-work", color:"#6F5E4F", intro:"Tarefas, projetos, reuniões e o acompanhamento da sua vida profissional.",
    secs:[ {kind:"tarefa", label:"Tarefas", intro:"O que precisa sair do papel.", dated:true, ph:"Nova tarefa"},
           {kind:"projeto", label:"Projetos", intro:"Coisas maiores, feitas de etapas.", steps:true, ph:"Novo projeto"},
           {kind:"reuniao", label:"Reuniões e retornos", intro:"Encontros, entrevistas e quem você está esperando responder.", dated:true, ph:"Nova reunião ou retorno"} ] },
  faculdade: { label:"Faculdade", icon:"i-book", color:"#9A8A79", intro:"Estudos, atividades, provas e trabalhos da graduação em Psicologia.",
    secs:[ {kind:"estudo", label:"Estudos", intro:"Leituras e revisões, sem maratona.", ph:"Novo estudo (ex.: ler cap. 3 de Psicopatologia)"},
           {kind:"atividade", label:"Atividades e trabalhos", intro:"Entregas e trabalhos acadêmicos.", dated:true, steps:true, ph:"Nova atividade ou trabalho"},
           {kind:"prova", label:"Provas", intro:"Datas e o que revisar para cada uma.", dated:true, steps:true, ph:"Nova prova"} ] },
  casa: { label:"Casa & Obra", icon:"i-home", color:"#C58B4E", sub:"Projeto, enxoval e organização", intro:"A casa que você está montando: obra, compras, enxoval e a organização do dia a dia.",
    secs:[ {kind:"obra", label:"Obra e projeto", intro:"Etapas da obra, orçamentos e decisões.", dated:true, steps:true, ph:"Nova etapa ou decisão da obra"},
           {kind:"compra", label:"Compras da casa", intro:"O que falta comprar, sem pressa.", dated:true, ph:"Novo item para comprar"},
           {kind:"organizacao", label:"Organização", intro:"Pequenas rotinas para a casa funcionar.", ph:"Nova tarefa de organização"} ] },
  metas: { label:"Metas", icon:"i-target", color:"#E0A458", sub:"Sonhos, objetivos e evolução", intro:"O que você quer construir daqui a meses ou anos. Cada meta é feita de passos pequenos.",
    secs:[ {kind:"meta", label:"Metas em andamento", intro:"Divida em etapas para ver o progresso crescer.", dated:true, steps:true, ph:"Nova meta (ex.: reserva de emergência)"} ] }
};
AREAS.projetos = { label:"Projetos", icon:"i-layers", color:"#B38752", sub:"Iniciativas e ideias em etapas", intro:"Iniciativas maiores, divididas em etapas pequenas, e ideias que ainda estão amadurecendo.",
  secs:[ {kind:"iniciativa", label:"Em andamento", intro:"Cada projeto é feito de etapas. Marque conforme avança.", dated:true, steps:true, ph:"Novo projeto (ex.: organizar o escritório)"},
         {kind:"ideiaproj", label:"Ideias para depois", intro:"Guarde aqui o que ainda não precisa virar projeto.", ph:"Nova ideia de projeto"} ] };
AREAS.biblioteca = { label:"Biblioteca", icon:"i-book", color:"#8F7B66", sub:"Leituras, materiais e referências", intro:"Livros, artigos, aulas e materiais para ler, ver ou consultar com calma.",
  secs:[ {kind:"leitura", label:"Para ler", intro:"Livros e artigos na fila.", ph:"Novo livro ou artigo"},
         {kind:"referencia", label:"Referências e materiais", intro:"Fontes para consultar depois.", ph:"Novo material (ex.: artigo para o TCC)"},
         {kind:"assistir", label:"Para assistir e ouvir", intro:"Aulas, vídeos e podcasts.", ph:"Novo vídeo, aula ou podcast"} ] };
AREAS.pessoal.sub = "Equilíbrio, saúde e bem-estar"; AREAS.trabalho.sub = "Projetos, demandas e entregas"; AREAS.faculdade.sub = "Estudos, atividades e prazos";
const KIND_AREA = {}; for (const [a,cfg] of Object.entries(AREAS)) for (const s of cfg.secs) KIND_AREA[s.kind] = a;
const KIND_LABEL = {iniciativa:"projeto",ideiaproj:"ideia",leitura:"leitura",referencia:"referência",assistir:"para ver",obra:"obra",compra:"compra",organizacao:"organização",meta:"meta",ritual:"ritual",compromisso:"compromisso",objetivo:"objetivo",tarefa:"tarefa",projeto:"projeto",reuniao:"reunião",estudo:"estudo",atividade:"atividade",prova:"prova"};
const DATED_KINDS = ["compromisso","reuniao","prova","atividade","tarefa","obra","compra","meta"];


/* ---------- regras de leitura ---------- */
const isRitualDoneToday = it => (it.doneDates||[]).includes(today());
const pending = (area) => items.filter(it => it.kind !== "ritual" && !it.done && (!area || it.area === area));
function nextFor(area){
  const p = pending(area).filter(it => !it.date || it.date >= today());
  p.sort((a,b) => (b.focus-a.focus) || ((a.date||"9999") < (b.date||"9999") ? -1 : (a.date||"9999") > (b.date||"9999") ? 1 : 0) || (a.createdAt < b.createdAt ? -1 : 1));
  return p[0] || null;
}
function doneThisWeek(area){
  const ws = weekStart();
  const tasks = items.filter(it => it.kind !== "ritual" && it.done && it.doneAt && dayFmt.format(new Date(it.doneAt)) >= ws && (!area || it.area === area));
  const rit = items.filter(it => it.kind === "ritual" && (!area || it.area === area)).flatMap(it => (it.doneDates||[]).filter(d => d >= ws).map(d => ({ title: it.title, d, ritual:true, area: it.area })));
  return { tasks, rit, count: tasks.length + rit.length };
}

/* ---------- componentes ---------- */
function checkBtn(on, label, onclick){ return h("button",{class:"check",type:"button","aria-pressed":String(!!on),"aria-label":label,onclick}, icon("i-check")); }
function itemRow(it, opts = {}){
  const area = AREAS[it.area];
  const meta = h("div",{class:"meta"});
  if (opts.showArea && area) meta.append(h("span",{class:"tag"}, h("span",{class:"dot",style:`background:${area.color}`}), area.label));
  if (opts.showKind) meta.append(h("span",{class:"tag"}, KIND_LABEL[it.kind] || it.kind));
  if (it.date) meta.append(h("span",{class:"tag"}, prettyDay(it.date)));
  if (it.onCal) meta.append(h("span",{class:"tag"}, "na agenda"));
  if (it.focus && !opts.hideFocus) meta.append(h("span",{class:"tag",style:"color:var(--olive)"}, "foco de hoje"));
  const steps = it.steps || [];
  const body = h("div",{style:"min-width:0"}, h("span",{class:"ttl"}, it.title), meta.childNodes.length ? meta : null);
  if (steps.length){
    const ok = steps.filter(s => s.done).length;
    body.append(h("div",{class:"prog","aria-label":`${ok} de ${steps.length} etapas`}, h("i",{style:`width:${(ok/steps.length*100).toFixed(0)}%`})));
    if (opts.expandSteps){
      const ul = h("ul",{class:"steps"});
      steps.forEach((s, i) => ul.append(h("li",{class:s.done?"ok":""},
        checkBtn(s.done, (s.done?"Desmarcar ":"Concluir ")+"etapa: "+s.t, () => { const ns = steps.map((x,j) => j===i ? {...x, done:!x.done} : x); updateItem(it.id, { steps: ns }); }),
        h("span",null,s.t))));
      body.append(ul);
    } else body.append(h("div",{class:"meta"}, `${ok} de ${steps.length} etapas`));
  }
  const acts = h("div",{class:"acts"});
  if (it.kind !== "ritual" && !it.done) acts.append(h("button",{class:"ib"+(it.focus?" on":""),type:"button",title:it.focus?"Tirar do foco de hoje":"Pôr no foco de hoje","aria-label":it.focus?"Tirar do foco de hoje":"Pôr no foco de hoje",onclick:()=>toggleFocus(it)}, icon("i-sun")));
  if (["compromisso","reuniao","prova","atividade"].includes(it.kind) && !it.done && !it.onCal && (mcp || window.irisSb)) acts.append(h("button",{class:"ib",type:"button",title:"Levar para o Google Agenda","aria-label":"Levar para o Google Agenda",onclick:()=>openCalDialog({ title:it.title, date:it.date, itemId:it.id })}, icon("i-cal")));
  if (opts.canSplit && !it.done) acts.append(h("button",{class:"ib",type:"button",title:"Dividir em etapas com a ÍRIS","aria-label":"Dividir em etapas com a ÍRIS",onclick:(e)=>splitSteps(it, e.currentTarget)}, icon("i-split")));
  acts.append(h("button",{class:"ib",type:"button",title:"Remover","aria-label":"Remover",onclick:()=>removeItem(it.id)}, icon("i-trash")));
  const li = h("li",{class:"item"+(it.done?" done":"")},
    checkBtn(it.done, (it.done?"Desmarcar: ":"Concluir: ")+it.title, () => toggleDone(it)),
    body, acts);
  return li;
}
function toggleDone(it){
  if (it.done) updateItem(it.id, { done:false, doneAt:null });
  else { updateItem(it.id, { done:true, doneAt:new Date().toISOString(), focus:false }); toast(pickKind(["Feito. Um passo de cada vez.","Pronto. Isso já conta.","Concluído. Respira e segue no seu ritmo."])); }
}
function toggleFocus(it){
  if (!it.focus && items.filter(x => x.focus && !x.done).length >= 3){ toast("O foco já tem três itens. Tire um antes de pôr outro."); return; }
  updateItem(it.id, { focus: !it.focus });
}
function toggleRitual(it){
  const t = today(); let d = (it.doneDates||[]).slice();
  d = d.includes(t) ? d.filter(x => x !== t) : [...d, t].slice(-60);
  updateItem(it.id, { doneDates: d });
}
const pickKind = arr => arr[Math.floor(Math.random()*arr.length)];


/* ---------- agenda (Google Agenda) ---------- */
let mcp = null, sample = null, userName = "";

const CAL = "Google Calendar", MAIL = "Gmail";
