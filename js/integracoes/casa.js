"use strict";
/* ÍRIS · Integrações: House to Home (só leitura). */

/* ---------- CASA: o app House to Home (enxoval e obra), lido direto do Supabase da casa, com o login que você já tem lá. Só leitura. ---------- */
let casa = null, casaState = "idle", casaMsg = "", casaAt = 0, casaBusy = null;
function casaBuild(rows){
  const rooms = {}, its = [], pays = []; let meta = {};
  for (const r of rows) { const d = (r && r.d) || {};
    if (r.coll === "rooms") rooms[r.id] = String(d.name || "").slice(0,60);
    else if (r.coll === "items") its.push({ id:r.id, ...d });
    else if (r.coll === "pays") pays.push(d);
    else if (r.coll === "_meta") meta = d; }
  const cents = v => Number.isFinite(+v) ? Math.round(+v) : 0;
  const paid = {}; for (const p of pays) if (p.paid) paid[p.itemId] = (paid[p.itemId] || 0) + (p.kind === "refund" ? -1 : 1) * cents(p.amount);
  const real = {}; for (const p of pays) if (p.kind !== "refund") real[p.itemId] = 1;
  const FORMAS = { pix:"Pix", cash:"Dinheiro", debit:"Débito", credit:"Crédito", transfer:"Transferência", boleto:"Boleto", other:"Outro" };
  const list = its.filter(i => !i.deleted && (i.area === "enxoval" || i.area === "obra")).map(i => {
    const need = Math.max(1, +i.qtyNeed || 1), got = Math.max(0, +i.qtyBought || 0);
    const sit = i.returned ? "devolvido" : got >= need ? "comprado" : got > 0 ? "parcial" : i.researching ? "pesquisando" : "pendente";
    return { area:i.area, nome:String(i.name || "").slice(0,90), categoria:String(i.cat || ""), ambiente:rooms[i.roomId] || "",
      ...(i.area === "enxoval" ? { situacao:sit, quantidade:`${Math.min(got,need)} de ${need}` } : { andamento:String(i.status || "") }),
      /* regra do House to Home: no enxoval, comprado (com valor informado) conta como pago, a menos que existam lançamentos feitos à mão */
      previsto: cents(i.planned)/100, contratado: i.contracted == null ? null : cents(i.contracted)/100, pago: ((paid[i.id] || 0) + (i.area === "enxoval" && !i.returned && got > 0 && cents(i.contracted) > 0 && !real[i.id] ? cents(i.contracted) : 0))/100,
      ...(i.area === "enxoval" && FORMAS[i.payMethod] ? { comoFoiPago: FORMAS[i.payMethod] + (i.payMethod === "credit" && +i.payN > 1 ? ` em ${+i.payN}x` : "") } : {}),
      loja:String(i.store || ""), dataCompra:i.buyDate || null, prazo:i.end || null, fotos:+i.fotos || 0 };
  });
  const b = meta.budget || {}; const bud = k => b[k] == null ? null : cents(b[k])/100;
  return { casa:String((meta.casa) || "Nossa casa").slice(0,80), list, rooms:Object.values(rooms).filter(Boolean), orcamento:{ total:bud("total"), obra:bud("obra"), enxoval:bud("enxoval") } };
}
function casaCounts(){
  if (!casa) return null; const enx = casa.list.filter(x => x.area === "enxoval"), ob = casa.list.filter(x => x.area === "obra");
  const n = k => enx.filter(x => x.situacao === k).length;
  const ativos = enx.filter(x => x.situacao !== "devolvido");
  return { total:enx.length, comprados:n("comprado"), parciais:n("parcial"), pesquisando:n("pesquisando"), pendentes:n("pendente"), devolvidos:n("devolvido"),
    previstoTotal:sum(ativos, x => x.previsto), previstoDoQueFalta:sum(ativos.filter(x => x.situacao !== "comprado"), x => x.previsto), pagoTotal:sum(enx, x => x.pago),
    semPrevisto:ativos.filter(x => !x.previsto).length, obraItens:ob.length };
}
function casaBrief(){
  if (!casa) return casaState === "loading" ? "ainda lendo" : "indisponível agora (use consultar_casa para tentar de novo)";
  const c = casaCounts(); return `${casa.casa}. Enxoval: ${c.total} itens, ${c.comprados} comprados, ${c.parciais} parcialmente, ${c.pesquisando} pesquisando, ${c.pendentes} pendentes. Orçamento do enxoval: ${casa.orcamento.enxoval == null ? "não definido" : brl0(casa.orcamento.enxoval)}. Ambientes: ${casa.rooms.join(", ") || "nenhum"}. Para detalhes, use consultar_casa.`;
}
function casaErr(code){
  return { casa_login:"Abra o House to Home neste aparelho e entre com o Google uma vez; depois a ÍRIS passa a ver o enxoval.", casa_sessao:"Sua entrada no House to Home expirou. Abra o app dele para entrar de novo.",
    casa_sem_casa:"Não encontrei a sua casa no House to Home. Abra o app dele e confira a conta.", casa_rede:"O app da casa não respondeu agora. Tente de novo em instantes.",
    casa_indisponivel:"A leitura do enxoval não está disponível neste aparelho." }[code] || "Não consegui ler o app da casa agora.";
}
async function loadCasa(force, signal){
  if (!window.irisCasaRead) { casaState = "error"; casaMsg = casaErr("casa_indisponivel"); casaCard(); return; }
  if (!force && casa && Date.now() - casaAt < 60000) return;
  if (casaBusy) return casaBusy;
  if (!casa) casaState = "loading"; casaCard();
  casaBusy = (async () => {
    try { casa = casaBuild(await window.irisCasaRead()); casaAt = Date.now(); casaState = "ok"; }
    catch (e) { casaState = "error"; casaMsg = e && e.code ? casaErr(e.code) : "Não consegui ler o app da casa agora."; }
    finally { casaBusy = null; casaCard(); }
  })();
  return casaBusy;
}
function casaCard(){
  const box = $("casaHome"); if (!box) return; box.textContent = "";
  if (!casa) {
    box.append(h("div",{class:"empty"}, casaState === "loading" ? "Abrindo o seu enxoval…" : casaState === "error" ? casaMsg : "Toque para a ÍRIS ler o seu enxoval."));
    if (window.irisCasaRead && casaState !== "loading") box.append(h("button",{class:"btn ghost",type:"button",style:"margin-top:8px",onclick:()=>loadCasa(true)}, casaState === "error" ? "Tentar de novo" : "Carregar o enxoval"));
    return;
  }
  const c = casaCounts(); const pct = c.total ? Math.round(c.comprados / c.total * 100) : 0;
  box.append(h("div",{class:"finmini"},
    h("div",null, h("span",null,"Comprados"), h("b",null, `${c.comprados} de ${c.total}`), h("small",null, pct + "% do enxoval")),
    h("div",null, h("span",null,"Ainda faltam"), h("b",null, String(c.pendentes + c.pesquisando + c.parciais)), h("small",null, c.parciais ? `${c.parciais} parcialmente` : "itens"))),
    h("div",{class:"meter","aria-hidden":"true",style:"grid-column:1 / -1"}, h("i",{style:`width:${pct}%`})));
  const hh = new Date(casaAt); box.append(h("div",{class:"muted small",style:"margin-top:10px"}, casaState === "error" ? casaMsg + " Mostrando a última leitura. " : "", `Lido às ${hmFmt.format(hh)}. `,
    h("button",{class:"link",type:"button",onclick:()=>loadCasa(true)},"Atualizar"), " · ", h("a",{class:"link",href:"#iris",onclick:()=>setTimeout(()=>send(PROTOS.casa),0)},"Pedir sugestões à ÍRIS")));
}

const safeHref = u => (typeof u === "string" && /^https:\/\//.test(u)) ? u : null;
function str(v){ return typeof v === "string" ? v : ""; }
function normEvents(payload){
  const list = Array.isArray(payload) ? payload : ((payload && (payload.items || payload.events)) || []);
  return list.map(e => {
    const s = str(e?.start?.dateTime || e?.start?.date || e?.startTime), en = str(e?.end?.dateTime || e?.end?.date || e?.endTime);
    const allDay = /^\d{4}-\d{2}-\d{2}$/.test(s);
    let day = s.slice(0,10), time = "";
    if (!allDay && s) { const d = new Date(s); if (!isNaN(d)) { day = dayFmt.format(d); time = hmFmt.format(d); } }
    return { title: str(e?.summary) || "(sem título)", day, time, allDay, end: en, location: str(e?.location) || "", href: safeHref(e?.htmlLink) };
  }).filter(e => e.day);
}
function calInput(){ return { startTime: today()+"T00:00:00", endTime: addDays(today(),8)+"T00:00:00", orderBy:"startTime", pageSize:40, timeZone:TZ }; }
function calErr(code){
  return { needs_reauth:"Reconecte o Google Agenda em Configurações → Conectores do claude.ai.", server_not_connected:"Conecte o Google Agenda em Configurações → Conectores para ver seus compromissos aqui.",
    selection_required:"Escolha qual Google Agenda usar quando o claude.ai perguntar.", not_in_manifest:"A agenda não foi liberada para esta página.",
    approval_required:"A ÍRIS precisa da sua permissão para ler a agenda.", blocked_by_policy:"Sua organização bloqueou a agenda aqui.",
    server_unavailable:"A agenda não respondeu agora. Ela tenta de novo sozinha." }[code] || "Não consegui abrir a agenda agora.";
}
async function loadCal(fresh){
  if (!mcp) return;
  try { const r = await mcp.callTool(CAL, "list_events", calInput(), fresh ? { cache:{ refresh:true } } : undefined); calEvents = normEvents(r.payload); calState = "ok"; }
  catch (e) { calState = "error"; calMsg = calErr(e.code); }
  if (current === "inicio") renderHome();
}
function watchCal(){
  mcp.watchTool(CAL, "list_events", calInput(), ev => {
    if (ev.type === "data") { calEvents = normEvents(ev.result.payload); calState = "ok"; }
    else { const c = ev.error.code; if (["needs_reauth","server_not_connected","not_in_manifest","blocked_by_policy","approval_required","selection_required"].includes(c)) calEvents = []; if (!calEvents.length) { calState = "error"; calMsg = calErr(c); } }
    if (current === "inicio") renderHome();
  }, { refetchInterval: 600000, cache:{ staleTime: 120000, gcTime: 900000 } });
}
