"use strict";
/* ÍRIS · Interface: central de entrada (o que chegou do Gmail, da Agenda e do Drive) e configuração dos conectores. */

let entradaFiltro = "todos", entradaArquivados = false, entradaBusy = false;
const entFmt = new Intl.DateTimeFormat("pt-BR",{ timeZone:TZ, day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
const entDay = new Intl.DateTimeFormat("en-CA",{ timeZone:TZ });
const entQuando = iso => { try { return entFmt.format(new Date(iso)); } catch { return ""; } };

async function renderEntrada(){
  const v = $("v-entrada"); if (!v || !window.irisSb) return;
  if (!v.childElementCount) v.append(h("div",{class:"empty"},"Carregando…"));
  let lista = [], cons = [];
  try {
    const q = window.irisSb.from("inbox_events").select("*").order("occurred_at", { ascending:false }).limit(80);
    const [r, c] = await Promise.all([entradaArquivados ? q.eq("status","arquivado") : q.in("status",["novo","visto"]), conectoresEstado()]);
    if (r.error) throw r.error; lista = r.data || []; cons = c;
  } catch { v.textContent = ""; v.append(h("div",{class:"empty"},"Não consegui abrir a entrada agora. Confira a conexão e tente de novo.")); return; }
  if (current !== "entrada") return;
  const novos = lista.filter(e => e.status === "novo").length;
  v.textContent = "";
  v.append(h("div",{class:"area-h"},
    h("div",null, h("div",{class:"eyebrow"},"Central de entrada"), h("h1",{class:"t"},"Entrada"),
      h("p",{class:"lede"},"O que chegou do Gmail, da Agenda e do Drive, num lugar só. A ÍRIS só lê; você decide o que vira tarefa.")),
    h("div",{class:"area-stat"}, h("div",null, h("b",null,String(entradaArquivados ? lista.length : novos)), h("span",null, entradaArquivados ? "arquivados" : "novos")))));

  const filtros = h("div",{class:"ent-filtros",role:"group","aria-label":"Mostrar"});
  for (const [k, lab] of [["todos","Tudo"],["gmail","E-mails"],["agenda","Agenda"],["drive","Drive"]])
    filtros.append(h("button",{class:"chip"+(entradaFiltro === k ? " on" : ""),type:"button","aria-pressed":String(entradaFiltro === k),onclick:()=>{ entradaFiltro = k; renderEntrada(); }}, lab));
  filtros.append(h("button",{class:"link ent-arq",type:"button",onclick:()=>{ entradaArquivados = !entradaArquivados; renderEntrada(); }}, entradaArquivados ? "Voltar aos novos" : "Ver arquivados"));

  const grid = h("div",{class:"area-grid"});
  const card = h("div",{class:"card ent-card"}, h("div",{class:"card-h"}, h("h2",{class:"t"}, entradaArquivados ? "Arquivados" : "Chegou")), filtros);
  const vis = lista.filter(e => entradaFiltro === "todos" || e.source === entradaFiltro);
  if (!vis.length) card.append(h("div",{class:"empty"}, cons.some(c => c.last_sync_at) ? "Nada por aqui." : "Nada chegou ainda. Configure o conector do Google ao lado."));
  else { const ul = h("ul",{class:"items"}); for (const e of vis) ul.append(entradaRow(e)); card.append(ul); }
  grid.append(card);
  grid.append(conectoresCard(cons));
  v.append(grid);
}

function entradaRow(e){
  const meta = [FONTE_LABEL[e.source] || e.source, e.sender, e.source === "agenda" && e.data && e.data.inicio ? (e.data.diaInteiro ? prettyDay(entDay.format(new Date(e.data.inicio))) + ", dia inteiro" : entQuando(e.data.inicio)) : entQuando(e.occurred_at)].filter(Boolean).join(" · ");
  const href = safeHref(e.url);
  const acts = h("div",{class:"row-end",style:"margin-top:0;flex-wrap:wrap"});
  if (href) acts.append(h("a",{class:"btn ghost",href,target:"_blank",rel:"noopener noreferrer"},"Abrir"));
  if (e.status !== "arquivado") {
    acts.append(h("button",{class:"btn ghost",type:"button",onclick:()=>openVirarItem(e)},"Virar item"));
    acts.append(h("button",{class:"btn ghost",type:"button",onclick:ev=>mudarEntrada(e, "arquivado", ev.currentTarget)},"Arquivar"));
  } else acts.append(h("button",{class:"btn ghost",type:"button",onclick:ev=>mudarEntrada(e, "visto", ev.currentTarget)},"Desarquivar"));
  return h("li",{class:"item ap"+(e.status === "novo" ? " ent-novo" : "")},
    h("div",{style:"min-width:0"}, h("span",{class:"ttl",style:"text-decoration:none;color:var(--ink)"}, e.title || "(sem título)"),
      h("div",{class:"meta"}, meta), e.snippet ? h("div",{class:"meta ent-trecho"}, e.snippet) : null),
    acts);
}

async function mudarEntrada(e, status, btn){
  if (entradaBusy) return; entradaBusy = true; if (btn) btn.disabled = true;
  const { error } = await window.irisSb.from("inbox_events").update({ status, updated_at:new Date().toISOString() }).eq("id", e.id);
  entradaBusy = false;
  if (error) { toast("Não consegui salvar. Tente de novo."); if (btn) btn.disabled = false; return; }
  if (status === "arquivado") toast("Arquivado.");
  refreshEntradaBadge(); renderEntrada();
}

/* transformar um item da entrada em item das listas (decisão sua, então acontece na hora) */
function openVirarItem(e){
  const slot = $("dlgSlot"); slot.textContent = "";
  const close = () => { slot.textContent = ""; };
  const opts = []; for (const [area, cfg] of Object.entries(AREAS)) for (const s of cfg.secs) if (s.kind !== "ritual") opts.push([s.kind, `${cfg.label}: ${s.label}`]);
  const kind0 = e.source === "agenda" ? "compromisso" : "tarefa";
  const day0 = e.source === "agenda" && e.data && e.data.inicio ? entDay.format(new Date(e.data.inicio)) : "";
  const err = h("p",{class:"err",hidden:true});
  const sel = h("select",{id:"vkK"}, ...opts.map(([k, l]) => h("option",{value:k, selected:k === kind0}, l)));
  const f = h("form",{class:"dlg",role:"dialog","aria-modal":"true","aria-labelledby":"vkT",autocomplete:"off"},
    h("h2",{class:"t",id:"vkT"},"Virar item"),
    h("label",null,"Título", h("input",{type:"text",id:"vkTitle",value:(e.title || "").slice(0,240)})),
    h("label",null,"Onde", sel),
    h("label",null,"Dia (opcional)", h("input",{type:"date",id:"vkD",value:day0})),
    err,
    h("div",{class:"row-end",style:"margin-top:4px"}, h("button",{class:"btn ghost",type:"button",onclick:close},"Cancelar"), h("button",{class:"btn olive",type:"submit",id:"vkGo"},"Criar item")));
  f.onsubmit = async ev => { ev.preventDefault();
    const title = $("vkTitle").value.trim(); if (!title) { err.hidden = false; err.textContent = "Escreva um título."; return; }
    $("vkGo").disabled = true;
    const id = await addItem({ kind:$("vkK").value, area:KIND_AREA[$("vkK").value], title, date:$("vkD").value || null, fromInbox:e.id });
    if (!id) { $("vkGo").disabled = false; return; }
    await window.irisSb.from("inbox_events").update({ status:"convertido", updated_at:new Date().toISOString() }).eq("id", e.id);
    if (window.irisPermissions) irisPermissions.audit("natalia", "converteu_entrada", id, { title, fonte:e.source });
    close(); toast("Item criado."); refreshEntradaBadge(); renderEntrada(); };
  const ov = h("div",{class:"overlay",onclick:x => { if (x.target === ov) close(); }}, f);
  ov.addEventListener("keydown", x => { if (x.key === "Escape") close(); });
  slot.append(ov); setTimeout(() => $("vkTitle").focus(), 0);
}

function conectoresCard(cons){
  const card = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Conectores")));
  const ul = h("ul",{class:"items"});
  for (const [kind, c] of Object.entries(CONECTORES)) {
    const st = cons.find(x => x.kind === kind);
    const counts = st && st.last_counts ? Object.entries(st.last_counts).map(([k, n]) => `${n} de ${FONTE_LABEL[k] || k}`).join(", ") : "";
    const estado = !st ? "Ainda não configurado." :
      st.status === "erro" ? `Com erro ${tempoDesde(st.last_sync_at)}: ${st.last_error || "sem detalhe"}` :
      st.status === "ok" ? `Sincronizado ${tempoDesde(st.last_sync_at)}${counts ? " · " + counts : ""}` :
      st.status === "pausado" ? "Pausado." : "Esperando a primeira sincronização.";
    const atrasado = st && st.status === "ok" && st.last_sync_at && Date.now() - new Date(st.last_sync_at).getTime() > 2 * 3600e3;
    ul.append(h("li",{class:"item ap"},
      h("div",{style:"min-width:0"}, h("span",{class:"ttl",style:"text-decoration:none;color:var(--ink)"}, c.label),
        h("div",{class:"meta"+(st && st.status === "erro" || atrasado ? " ent-alerta" : "")}, atrasado ? `Parou de sincronizar: a última vez foi ${tempoDesde(st.last_sync_at)}.` : estado),
        h("div",{class:"meta"}, c.resumo)),
      h("div",{class:"row-end",style:"margin-top:0"}, h("button",{class:"btn ghost",type:"button",onclick:c.configurar}, st ? "Reconfigurar" : "Configurar"))));
  }
  card.append(ul); return card;
}

async function copiarTexto(texto, campo){
  try { await navigator.clipboard.writeText(texto); toast("Copiado."); }
  catch { if (campo) { campo.focus(); campo.select(); } toast("Selecionei o texto: copie com o menu do aparelho."); }
}

/* passo a passo do conector do Google (Apps Script na conta dela) */
async function openGoogleSetup(){
  const slot = $("dlgSlot"); slot.textContent = "";
  const close = () => { slot.textContent = ""; renderEntrada(); };
  const bloco = (id, rotulo, valor, linhas) => {
    const ta = h("textarea",{id,readonly:true,rows:String(linhas || 1),spellcheck:"false",class:"ent-code"}, valor);
    return h("div",{class:"ent-bloco"}, h("div",{class:"ent-bloco-h"}, h("span",null,rotulo), h("button",{class:"btn ghost",type:"button",onclick:()=>copiarTexto(ta.value, ta)},"Copiar")), ta);
  };
  let codigo = "", manifesto = "";
  try { [codigo, manifesto] = await Promise.all([fetch("apps-script/Codigo.gs?v=27").then(r => r.text()), fetch("apps-script/appsscript.json?v=27").then(r => r.text())]); }
  catch { toast("Não consegui carregar o código do conector. Tente de novo."); return; }
  const tokenBox = h("div",null, h("button",{class:"btn olive",type:"button",onclick:async ev => {
    ev.currentTarget.disabled = true;
    try { const t = await gerarTokenConector("google_apps_script"); tokenBox.textContent = "";
      tokenBox.append(bloco("gsTok","IRIS_TOKEN (aparece só agora; um token novo invalida o anterior)", t), h("p",{class:"meta"},"Se fechar sem copiar, gere outro.")); }
    catch { ev.currentTarget.disabled = false; toast("Não consegui gerar o token. Tente de novo."); } }},"Gerar token"));
  const f = h("div",{class:"dlg ent-dlg",role:"dialog","aria-modal":"true","aria-labelledby":"gsT"},
    h("h2",{class:"t",id:"gsT"},"Conectar o Google"),
    h("p",{class:"meta"},"O conector roda no Apps Script, na sua conta Google, sem custo. Ele só lê: não envia, apaga nem altera nada no Google. Leva uns 5 minutos."),
    h("ol",{class:"ent-passos"},
      h("li",null,"Abra ", h("a",{href:"https://script.google.com/home/projects/create",target:"_blank",rel:"noopener noreferrer"},"script.google.com"), " e crie um projeto novo. Dê o nome ", h("b",null,"ÍRIS conector"), "."),
      h("li",null,"Em ", h("b",null,"Configurações do projeto"), " (ícone de engrenagem), marque ", h("b",null,"Mostrar o arquivo de manifesto appsscript.json no editor"), "."),
      h("li",null,"No editor, troque todo o conteúdo de ", h("b",null,"appsscript.json"), " por este:", bloco("gsMan","appsscript.json", manifesto, 6)),
      h("li",null,"Troque todo o conteúdo de ", h("b",null,"Código.gs"), " por este e salve:", bloco("gsCod","Código.gs", codigo, 6)),
      h("li",null,"Em ", h("b",null,"Configurações do projeto → Propriedades do script"), ", adicione as duas propriedades:",
        bloco("gsUrl","IRIS_URL", INGEST_URL()), tokenBox),
      h("li",null,"Volte ao editor, escolha a função ", h("b",null,"configurar"), " no topo e clique em ", h("b",null,"Executar"), ". O Google vai avisar que o app não foi verificado: é o seu próprio script. Toque em Avançado, depois em Acessar ÍRIS conector, e permita."),
      h("li",null,"Pronto. Em até um minuto, esta tela mostra a primeira sincronização. Depois, ela acontece a cada 30 minutos, sozinha.")),
    h("div",{class:"row-end",style:"margin-top:4px"}, h("button",{class:"btn olive",type:"button",onclick:close},"Fechar")));
  const ov = h("div",{class:"overlay",onclick:x => { if (x.target === ov) close(); }}, f);
  ov.addEventListener("keydown", x => { if (x.key === "Escape") close(); });
  slot.append(ov);
}

async function refreshEntradaBadge(){
  if (!window.irisSb) return;
  try { const { count: n } = await window.irisSb.from("inbox_events").select("id", { count:"exact", head:true }).eq("status","novo");
    const b = $("inN"); if (b) { b.textContent = n ? String(n > 99 ? "99+" : n) : ""; b.hidden = !n; } } catch {}
}
