"use strict";
/* ÍRIS · Memória e banco: armazenamento das listas e do financeiro, cálculos. */

/* ---------- armazenamento (db privado por pessoa; navegador como alternativa) ---------- */
let items = [];
let col = null, loaded = false;
const local = { load(){ items = store.get("iris.items", []); }, save(){ store.set("iris.items", items); } };
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
async function addItem(data){
  const it = Object.assign({ title:"", area:KIND_AREA[data.kind]||"pessoal", kind:"tarefa", date:null, focus:false, done:false, doneAt:null, steps:[], doneDates:[], createdAt:new Date().toISOString() }, data);
  it.title = String(it.title).trim().slice(0,240); if (!it.title) return null;
  if (col) { try { const ref = col.doc(); await ref.set(it); return ref.id; } catch(e){ toast(e && e.code === "quota_exceeded" ? "Espaço cheio. Apague itens antigos para liberar." : "Não consegui salvar agora. Tente de novo."); return null; } }
  const id = newId(); items.push({ id, ...it }); local.save(); renderAll(); return id;
}
async function updateItem(id, patch){
  if (col) { try { await col.doc(id).update(patch); } catch { toast("Não consegui salvar a alteração."); } return; }
  const it = items.find(x => x.id === id); if (it) { Object.assign(it, patch); local.save(); renderAll(); }
}
async function removeItem(id){
  const it = items.find(x => x.id === id); if (!it) return;
  const { id:_, ...body } = it;
  if (col) { try { await col.doc(id).delete(); } catch { toast("Não consegui remover."); return; } }
  else { items = items.filter(x => x.id !== id); local.save(); renderAll(); }
  toast("Item removido.", async () => { if (col) { await col.doc(id).set(body); } else { items.push(it); local.save(); renderAll(); } });
}


/* ================= FINANCEIRO ================= */
const BRL = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const BRL0 = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const brl = v => BRL.format(Math.round((+v||0)*100)/100);
const brl0 = v => BRL0.format(+v||0);
const CATS = ["Moradia","Contas da casa","Mercado","Alimentação fora","Delivery","Transporte","Saúde","Educação","Beleza e cuidado","Lazer","Compras","Enxoval","Assinaturas","Presentes","Outros"];
const INCATS = ["Salário","Estágio / bolsa","Freelance","Outras entradas"];
const METHODS = { credito:"Crédito", debito:"Débito", pix:"Pix", dinheiro:"Dinheiro", boleto:"Boleto" };
const SER = { fixas:"#5F7A2E", parcelas:"#336FA8", variavel:"#C27840" };
const SER_LABEL = { fixas:"Contas fixas", parcelas:"Parcelas", variavel:"Gastos do dia a dia (média)" };
let fintx = [], finAn = {};
let fincfg = { income:0, savingsPct:10, reserve:0, reserveGoalMonths:6, budgets:{}, cards:[], fixed:[] };
let finCol = null, finMeta = null, finTab = "visao", finMonth = null, finCatFilter = "", faturaDrafts = [];
const ym = iso => String(iso||"").slice(0,7);
const curYM = () => today().slice(0,7);
const addM = (m, n) => { let [y, mo] = m.split("-").map(Number); mo += n; y += Math.floor((mo-1)/12); mo = ((mo-1)%12+12)%12+1; return `${y}-${String(mo).padStart(2,"0")}`; };
const ymLabel = (m, short) => { const s = new Intl.DateTimeFormat("pt-BR", short ? {month:"short",timeZone:"UTC"} : {month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(m+"-15T12:00:00Z")).replace(".",""); return s; };
const sum = (arr, f) => arr.reduce((a,x) => a + (f ? f(x) : x), 0);
const pct = v => Math.round(v*100) + "%";
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
const monthsTxt = m => { const r = Math.round(m*10)/10; return `${String(r).replace(".",",")} ${r === 1 ? "mês" : "meses"}`; };

/* armazenamento */
const finLocal = {
  load(){ fintx = store.get("iris.fintx", []); fincfg = Object.assign({}, fincfg, store.get("iris.fincfg", {})); finAn = store.get("iris.finan", {}); },
  save(){ store.set("iris.fintx", fintx); store.set("iris.fincfg", fincfg); store.set("iris.finan", finAn); }
};
function renderFinIfOpen(){ if (current === "financeiro") renderFin(); else if (current === "inicio") renderHome(); }
async function txAdd(t){
  const body = Object.assign({ type:"saida", amount:0, desc:"", cat:"Outros", method:"pix", card:null, date:today(), month:null, inst:null, fixedId:null, source:"manual", createdAt:new Date().toISOString() }, t);
  body.amount = Math.round(Math.abs(+body.amount||0)*100)/100; if (!body.amount) return null;
  body.desc = String(body.desc||"").trim().slice(0,160) || (body.type === "entrada" ? "Entrada" : "Gasto");
  if (!body.month) body.month = ym(body.date);
  if (finCol) { try { const r = finCol.doc(); await r.set(body); return r.id; } catch (e) { toast(e && e.code === "quota_exceeded" ? "O espaço de dados encheu. Apague lançamentos antigos." : "Não consegui salvar o lançamento."); return null; } }
  const id = newId(); fintx.push({ id, ...body }); finLocal.save(); renderFinIfOpen(); return id;
}
async function txUpdate(id, patch){
  const t = fintx.find(x => x.id === id); if (!t) return false;
  if (finCol) { try { await finCol.doc(id).update(patch); } catch { toast("Não consegui salvar a mudança."); return false; } Object.assign(t, patch); }
  else { Object.assign(t, patch); finLocal.save(); }
  return true;
}
/* mudar a categoria de um gasto; numa compra parcelada, muda também as outras parcelas já lançadas dela */
async function txSetCat(id, cat){
  const t = fintx.find(x => x.id === id); if (!t || t.cat === cat) return;
  const sib = t.inst && t.inst.n > 1 ? fintx.filter(x => x.id !== id && x.type === t.type && x.inst && x.inst.n === t.inst.n && x.card === t.card && Math.abs(x.amount - t.amount) < 0.06 && normDesc(x.desc) === normDesc(t.desc)) : [];
  let ok = await txUpdate(id, { cat }); for (const x of sib) ok = (await txUpdate(x.id, { cat })) && ok;
  if (ok) toast(sib.length ? `Categoria trocada para ${cat}, nesta e nas outras parcelas.` : `Categoria trocada para ${cat}.`);
  renderFinIfOpen();
}
async function txDel(id){
  const t = fintx.find(x => x.id === id); if (!t) return; const { id:_, ...b } = t;
  if (finCol) { try { await finCol.doc(id).delete(); } catch { toast("Não consegui remover."); return; } }
  else { fintx = fintx.filter(x => x.id !== id); finLocal.save(); renderFinIfOpen(); }
  toast("Lançamento removido.", async () => { if (finCol) await finCol.doc(id).set(b); else { fintx.push(t); finLocal.save(); renderFinIfOpen(); } });
}
async function cfgSave(patch, quiet){
  fincfg = Object.assign({}, fincfg, patch);
  if (finMeta) { try { await finMeta.doc("cfg").set(JSON.parse(JSON.stringify(fincfg))); } catch { toast("Não consegui salvar o planejamento."); return; } }
  else finLocal.save();
  if (!quiet) toast("Planejamento salvo.");
  renderFinIfOpen();
}
async function anSave(m, text){
  finAn = Object.assign({}, finAn, { [m]: { text, at:new Date().toISOString() } });
  if (finMeta) { try { await finMeta.doc("an-"+m).set(finAn[m]); } catch {} } else finLocal.save();
}

/* cálculos */
const normDesc = s => String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\d+\s*\/\s*\d+/g,"").replace(/[^a-z]/g,"").slice(0,14);
function instTimeline(){
  const seen = new Set(), out = [];
  for (const t of fintx) if (t.type === "saida" && t.inst && t.inst.n > 1 && t.inst.k < t.inst.n) {
    for (let j = 1; j <= t.inst.n - t.inst.k; j++) {
      const p = { month:addM(t.month, j), k:t.inst.k + j, n:t.inst.n, amount:t.amount, desc:t.desc, card:t.card, cat:t.cat };
      const key = [p.month, p.k, p.n, normDesc(p.desc), Math.round(p.amount)].join("|");
      if (seen.has(key)) continue; seen.add(key);
      if (fintx.some(r => r.month === p.month && r.inst && r.inst.k === p.k && r.inst.n === p.n && Math.abs(r.amount - p.amount) < 0.06 && normDesc(r.desc) === normDesc(p.desc))) continue;
      out.push(p);
    }
  }
  return out;
}
/* benefícios por dia trabalhado (ex.: transporte e alimentação): calculados mês a mês,
   com dias úteis, feriados (nacionais, da Bahia e de Salvador) e as faltas ou folgas que ela marcar */
function easterDate(y){ const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), hh = (19*a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2*e + 2*i - hh - k) % 7, m = Math.floor((a + 11*hh + 22*l) / 451), mo = Math.floor((hh + l - 7*m + 114) / 31), da = ((hh + l - 7*m + 114) % 31) + 1; return Date.UTC(y, mo - 1, da); }
const HOLIDAY_NAMES = { "01-01":"Confraternização", "04-21":"Tiradentes", "05-01":"Dia do Trabalho", "06-24":"São João (Salvador)", "07-02":"Independência da Bahia", "09-07":"Independência", "10-12":"Nossa Senhora Aparecida", "11-02":"Finados", "11-15":"Proclamação da República", "11-20":"Consciência Negra", "12-08":"Nossa Senhora da Conceição (Salvador)", "12-25":"Natal" };
function holidaysOf(y){
  const out = {}; for (const [md, nm] of Object.entries(HOLIDAY_NAMES)) out[y + "-" + md] = nm;
  const gf = new Date(easterDate(y) - 2*864e5).toISOString().slice(0,10); out[gf] = "Sexta-feira Santa";
  return out;
}
function workInfo(M){
  const y = +M.slice(0,4), mo = +M.slice(5,7), dim = new Date(Date.UTC(y, mo, 0)).getUTCDate(), wd = fincfg.workDays || [1,2,3,4,5], hol = holidaysOf(y);
  let util = 0; const feriados = [];
  for (let d = 1; d <= dim; d++) { const dt = new Date(Date.UTC(y, mo - 1, d)), iso = dt.toISOString().slice(0,10); if (!wd.includes(dt.getUTCDay())) continue; util++; if (hol[iso]) feriados.push({ date:iso, name:hol[iso] }); }
  const off = Math.max(0, +((fincfg.daysOff || {})[M]) || 0), worked = Math.max(0, util - feriados.length - off);
  return { util, feriados, off, worked };
}
function perDayTotal(){ return sum(fincfg.perDay || [], b => +b.amount || 0); }
function perDayIncome(M){ const t = perDayTotal(); return t ? Math.round(t * workInfo(M).worked * 100) / 100 : 0; }
/* parcelas que ainda vão cair: as projetadas e as já lançadas em meses à frente (ex.: lidas de uma fatura) */
function instAhead(){
  const cur = curYM();
  const real = fintx.filter(t => t.type === "saida" && t.month > cur && t.inst && t.inst.n > 1).map(t => ({ month:t.month, k:t.inst.k, n:t.inst.n, amount:t.amount, desc:t.desc, card:t.card, cat:t.cat, real:true }));
  return [...real, ...instTimeline().filter(p => p.month > cur)];
}
function outAhead(m){ return sum(fintx.filter(t => t.type === "saida" && t.month === m && !t.fixedId && !(t.inst && t.inst.n > 1)), t => t.amount); }
function finCalc(M){
  const cur = curYM(), benef = perDayIncome(M), inc = (+fincfg.income || 0) + benef;
  const txM = fintx.filter(t => t.month === M);
  const out = txM.filter(t => t.type === "saida"), inn = txM.filter(t => t.type === "entrada");
  const spent = sum(out, t => t.amount), received = sum(inn, t => t.amount);
  const renda = Math.max(received, inc);
  const fixed = fincfg.fixed || [];
  const fixedPend = M >= cur ? fixed.filter(f => !txM.some(t => t.fixedId === f.id)) : [];
  const instM = M >= cur ? instTimeline().filter(p => p.month === M) : [];
  const fixedPendSum = sum(fixedPend, f => +f.amount || 0), instSum = sum(instM, p => p.amount);
  const forecast = spent + fixedPendSum + instSum;
  const save = renda * (+fincfg.savingsPct || 0) / 100;
  const free = renda - forecast - save;
  const byCat = {}; for (const t of out) byCat[t.cat] = (byCat[t.cat] || 0) + t.amount;
  for (const p of instM) byCat[p.cat || "Compras"] = (byCat[p.cat || "Compras"] || 0) + p.amount;
  return { M, renda, received, inc, benef, spent, fixedPend, fixedPendSum, instM, instSum, forecast, save, free, byCat, out, inn };
}
function varOf(m){ return sum(fintx.filter(t => t.month === m && t.type === "saida" && !t.fixedId && !(t.inst && t.inst.n > 1)), t => t.amount); }
function varAvg(){
  const cur = curYM(); const months = [1,2,3].map(n => addM(cur,-n)).filter(m => fintx.some(t => t.month === m && t.type === "saida"));
  if (months.length) return sum(months.map(varOf)) / months.length;
  const day = +today().slice(8), dim = new Date(Date.UTC(+cur.slice(0,4), +cur.slice(5,7), 0)).getUTCDate();
  return day >= 5 ? varOf(cur) / day * dim : varOf(cur);
}
function projection(n){
  const cur = curYM(), tl = instTimeline(), fx = sum(fincfg.fixed || [], f => +f.amount || 0), va = varAvg();
  const ah = instAhead();
  return Array.from({ length:n }, (_, i) => { const m = addM(cur, i+1); return { m, fixas:fx, parcelas:sum(ah.filter(x => x.month === m), x => x.amount), variavel:Math.max(va, outAhead(m)), renda:(+fincfg.income || 0) + perDayIncome(m) }; });
}
function committedAhead(){ return sum(instAhead(), p => p.amount); }
function avgMonthlyExpense(){
  const cur = curYM(); const ms = [1,2,3].map(n => addM(cur,-n)).filter(m => fintx.some(t => t.month === m && t.type === "saida"));
  const vals = ms.map(m => sum(fintx.filter(t => t.month === m && t.type === "saida"), t => t.amount));
  const base = vals.length ? sum(vals) / vals.length : finCalc(cur).forecast;
  return Math.max(base, sum(fincfg.fixed || [], f => +f.amount || 0));
}
function health(){
  const c = finCalc(curYM()); if (!c.renda) return null;
  const r = (c.renda - c.forecast) / c.renda;
  const s1 = r >= 0.2 ? 35 : r <= 0 ? Math.max(0, 10 + r*20) : 10 + (r/0.2)*25;
  const nx = projection(1)[0]; const comm = (nx.fixas + nx.parcelas) / c.renda;
  const s2 = comm <= 0.4 ? 25 : comm >= 0.8 ? 0 : 25*(0.8-comm)/0.4;
  const avg = avgMonthlyExpense(); const months = avg ? (+fincfg.reserve || 0) / avg : 0; const goal = +fincfg.reserveGoalMonths || 6;
  const s3 = Math.min(25, 25*months/goal);
  const breached = Object.entries(fincfg.budgets || {}).filter(([k,v]) => +v > 0 && (c.byCat[k] || 0) > +v).length;
  const s4 = Math.max(0, 15 - 5*breached);
  const score = Math.round(Math.max(0, Math.min(100, s1+s2+s3+s4)));
  const label = score >= 75 ? "Tranquila" : score >= 50 ? "Estável, com pontos de atenção" : score >= 30 ? "Apertada" : "Pedindo cuidado";
  return { score, label, r, comm, months, goal, breached, parts:{ s1, s2, s3, s4 } };
}
function cardUse(card){
  const cur = curYM();
  const used = sum(fintx.filter(t => t.type === "saida" && t.method === "credito" && t.card === card.name && t.month === cur), t => t.amount)
             + sum(instTimeline().filter(p => p.card === card.name && p.month === cur), p => p.amount);
  const fut = sum(instAhead().filter(p => p.card === card.name), p => p.amount);
  return { used, fut, total:used + fut, limit:+card.limit || 0 };
}
function daysUntilDay(day){
  const [y, m, d] = today().split("-").map(Number); const base = Date.UTC(y, m-1, d);
  let target = Date.UTC(y, m-1, day); if (day < d) target = Date.UTC(y, m, day);
  return Math.round((target - base) / 864e5);
}
const inDays = d => d === 0 ? "hoje" : d === 1 ? "amanhã" : `em ${d} dias`;
function finAlerts(){
  const A = []; const c = finCalc(curYM());
  if (!c.renda) A.push({ k:"info", t:"Informe sua renda mensal em Planejamento para a ÍRIS calcular saúde financeira, limites e projeções." });
  for (const [cat, lim] of Object.entries(fincfg.budgets || {})) { const v = c.byCat[cat] || 0; if (+lim > 0) {
    if (v > +lim) A.push({ k:"warn", t:`${cat}: ${brl(v)} de ${brl(lim)}. Passou ${brl(v - lim)} do limite que você definiu.` });
    else if (v >= 0.8*lim) A.push({ k:"soft", t:`${cat} já usou ${pct(v/lim)} do limite do mês. Restam ${brl(lim - v)}.` }); } }
  for (const card of fincfg.cards || []) {
    const u = cardUse(card);
    if (u.limit && u.total / u.limit >= 0.7) A.push({ k:u.total > u.limit ? "warn" : "soft", t:`Cartão ${card.name}: ${pct(u.total/u.limit)} do limite ocupado, contando parcelas futuras.` });
    if (+card.dueDay) { const d = daysUntilDay(+card.dueDay); if (d <= 5) A.push({ k:"soft", t:`A fatura do ${card.name} vence ${inDays(d)}.` }); }
  }
  for (const f of c.fixedPend) if (+f.day) { const d = daysUntilDay(+f.day); if (d <= 3 && +f.day >= +today().slice(8)) A.push({ k:"soft", t:`${f.desc} (${brl(f.amount)}) vence ${inDays(d)}.` }); }
  if (c.renda && c.free < 0) A.push({ k:"warn", t:`No ritmo atual, ${ymLabel(c.M).split(" ")[0]} fecha ${brl(-c.free)} abaixo do planejado, já contando a meta de guardar ${fincfg.savingsPct || 0}%.` });
  const nx = projection(1)[0];
  if (c.renda && (nx.fixas + nx.parcelas) / c.renda > 0.5) A.push({ k:"soft", t:`Mais da metade da renda de ${ymLabel(nx.m).split(" ")[0]} já está comprometida com contas fixas e parcelas (${brl(nx.fixas + nx.parcelas)}).` });
  const h = health(); if (h && h.months < 3) A.push({ k:"soft", t:`Sua reserva cobre ${monthsTxt(h.months)} de gastos. A meta é ${h.goal}.` });
  const deliv = c.out.filter(t => t.cat === "Delivery"); if (deliv.length >= 6) A.push({ k:"soft", t:`${deliv.length} pedidos de delivery neste mês, somando ${brl(sum(deliv, t => t.amount))}.` });
  return A;
}
function finSummary(){
  const M = curYM(), c = finCalc(M), h = health();
  return { mes:M, renda:c.renda, gastoRealizado:Math.round(c.spent), previstoAteFimDoMes:Math.round(c.forecast), livreParaGastar:Math.round(c.free), metaGuardarPct:fincfg.savingsPct,
    contasFixasPendentes:c.fixedPend.map(f => ({ desc:f.desc, valor:f.amount, dia:f.day })), parcelasNoMes:Math.round(c.instSum), comprometidoFuturoEmParcelas:Math.round(committedAhead()),
    reserva:+fincfg.reserve || 0, saude:h ? { nota:h.score, rotulo:h.label, reservaEmMeses:Math.round(h.months*10)/10 } : null,
    porCategoria:Object.fromEntries(Object.entries(c.byCat).map(([k,v]) => [k, Math.round(v)])), limites:fincfg.budgets,
    cartoes:(fincfg.cards || []).map(cd => { const u = cardUse(cd); return { nome:cd.name, limite:u.limit, usadoNoMes:Math.round(u.used), parcelasFuturas:Math.round(u.fut), vencimento:cd.dueDay }; }),
    projecao:projection(6).map(p => ({ mes:p.m, renda:p.renda, fixas:Math.round(p.fixas), parcelas:Math.round(p.parcelas), variavelEstimada:Math.round(p.variavel), sobra:Math.round(p.renda - p.fixas - p.parcelas - p.variavel) })),
    avisos:finAlerts().map(a => a.t) };
}
