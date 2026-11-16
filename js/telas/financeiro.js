"use strict";
/* ÍRIS · Interface: financeiro. */

/* ---- telas ---- */
function opt(v, label, sel){ return h("option",{ value:v, selected: sel ? true : null }, label); }
function finHeader(){
  const v = h("div",{class:"area-h"},
    h("div",null, h("div",{class:"eyebrow"},"Área"), h("h1",{class:"t"},"Financeiro"),
      h("p",{class:"lede"},"Sua saúde financeira em um lugar só: o que entrou, o que saiu, o que já está comprometido e para onde o dinheiro está indo.")),
    h("div",{class:"monthnav"},
      h("button",{class:"ib",type:"button","aria-label":"Mês anterior",onclick:()=>{ finMonth = addM(finMonth,-1); renderFin(); }}, "‹"),
      h("b",null, ymLabel(finMonth).replace(/^./, ch => ch.toUpperCase())),
      h("button",{class:"ib",type:"button","aria-label":"Próximo mês",onclick:()=>{ finMonth = addM(finMonth,1); renderFin(); }}, "›")));
  const tabs = h("div",{class:"subtabs",role:"tablist"});
  [["visao","Visão geral"],["lanc","Lançamentos"],["rel","Relatório"],["fatura","Ler fatura"],["plano","Planejamento"]].forEach(([k,l]) =>
    tabs.append(h("button",{type:"button",role:"tab","aria-selected":String(finTab === k),class:finTab === k ? "on" : "",onclick:()=>{ finTab = k; renderFin(); }}, l)));
  return [v, tabs];
}
function renderFin(){
  if (!finMonth) finMonth = curYM();
  const v = $("v-financeiro"); const a = document.activeElement;
  if (a && v.contains(a) && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT") && finTab !== "visao") { pendingRender = true; return; }
  v.textContent = ""; v.append(...finHeader());
  const body = h("div",{class:"finbody"}); v.append(body);
  if (finTab === "visao") finOverview(body); else if (finTab === "lanc") finLanc(body); else if (finTab === "fatura") finFatura(body); else if (finTab === "rel") finRel(body); else finPlano(body);
}

function finOverview(root){
  const M = finMonth, cur = curYM(), c = finCalc(M), h0 = M === cur ? health() : null;
  if (!fintx.length && !(+fincfg.income)) {
    root.append(h("div",{class:"card welcome"}, h("h2",{class:"t"},"Vamos montar seu painel"),
      h("p",{class:"lede",style:"margin:6px 0 14px"},"Três passos e a ÍRIS começa a calcular saúde, limites e projeções. Dá para fazer aos poucos."),
      h("ol",{class:"steps-big"},
        h("li",null, h("b",null,"Planejamento: "), "sua renda mensal, quanto quer guardar, seus cartões e contas fixas."),
        h("li",null, h("b",null,"Ler fatura: "), "envie o PDF ou um print da fatura do cartão. A ÍRIS lê, categoriza e encontra as parcelas."),
        h("li",null, h("b",null,"Lançamentos: "), "registre o que sair no Pix, débito ou dinheiro.")),
      h("div",{class:"row-end",style:"justify-content:flex-start"}, h("button",{class:"btn",type:"button",onclick:()=>{ finTab = "plano"; renderFin(); }},"Começar pelo planejamento"), h("button",{class:"btn ghost",type:"button",onclick:()=>{ finTab = "fatura"; renderFin(); }},"Ler uma fatura"))));
    return;
  }
  // linha 1: saúde + números
  const top = h("div",{class:"fin-top"});
  const hc = h("div",{class:"card health"});
  if (h0) {
    hc.append(h("div",{class:"eyebrow"},"Saúde financeira"),
      h("div",{class:"score"}, h("b",null,String(h0.score)), h("span",null,"/100")),
      h("div",{class:"score-l"}, h0.label),
      h("div",{class:"meter","aria-hidden":"true"}, h("i",{style:`width:${h0.score}%`})),
      h("ul",{class:"factors"},
        h("li",null, h("span",null,"Sobra do mês"), h("b",null, pct(Math.max(-1, h0.r)))),
        h("li",null, h("span",null,"Renda comprometida no próximo mês"), h("b",null, pct(h0.comm))),
        h("li",null, h("span",null,"Reserva"), h("b",null, monthsTxt(h0.months))),
        h("li",null, h("span",null,"Limites estourados"), h("b",null, String(h0.breached)))));
  } else hc.append(h("div",{class:"eyebrow"},"Saúde financeira"), h("p",{class:"empty"}, M !== cur ? `A nota é calculada para o mês atual. Aqui você vê os números de ${ymLabel(M)}.` : "Informe sua renda em Planejamento para calcular a nota."));
  top.append(hc);
  const kp = h("div",{class:"card kpis"});
  const kpi = (l, v, sub, strong) => h("div",{class:"kpi"+(strong?" strong":"")}, h("span",null,l), h("b",null,v), sub ? h("small",null,sub) : null);
  kp.append(
    kpi("Entradas", c.renda ? brl(c.renda) : "—", [c.regular ? "salário registrado" : (c.inc ? "salário planejado" : ""), c.benef && !c.regular ? `${brl(c.benef)} de benefícios (${plural(workInfo(M).worked, "dia", "dias")})` : "", c.extra ? `${brl(c.extra)} de extras` : ""].filter(Boolean).join(" + ") || "—"),
    kpi("Gasto até agora", brl(c.spent), plural(c.out.length, "lançamento", "lançamentos")),
    kpi(M >= cur ? "Previsto até o fim do mês" : "Total do mês", brl(M >= cur ? c.forecast : c.spent), M >= cur ? `inclui ${brl(c.fixedPendSum)} em contas fixas a pagar e ${brl(c.instSum + sum(c.out.filter(t => t.inst && t.inst.n > 1), t => t.amount))} em parcelas` : null),
    kpi("Livre para gastar", c.renda ? brl(c.free) : "—", c.renda ? `depois de guardar ${fincfg.savingsPct || 0}% (${brl(c.save)})` : "precisa da renda", true),
    (() => { const ip = c.out.filter(t => t.inst && t.inst.n > 1), v = sum(ip, t => t.amount) + c.instSum, q = ip.length + c.instM.length;
      return kpi("Parcelas deste mês", brl(v), q ? plural(q, "parcela no crédito", "parcelas no crédito") : "nenhuma parcela"); })(),
    kpi("Reserva", brl(+fincfg.reserve || 0), h0 ? `cobre ${monthsTxt(h0.months)}` : null));
  top.append(kp); root.append(top);

  // avisos
  const al = finAlerts();
  const ac = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Avisos"), h("span",{class:"hint"}, al.length ? plural(al.length,"ponto de atenção","pontos de atenção") : "tudo em ordem")));
  if (!al.length) ac.append(h("div",{class:"empty"},"Nada pedindo atenção agora. Os limites estão respeitados e as contas, em dia."));
  else { const ul = h("ul",{class:"alerts"}); al.forEach(x => ul.append(h("li",{class:x.k}, h("span",{class:"ai","aria-hidden":"true"}, x.k === "warn" ? "!" : x.k === "info" ? "i" : "·"), h("span",null, x.t)))); ac.append(ul); }

  // categorias
  const cc = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Para onde foi o dinheiro"), h("span",{class:"hint"}, ymLabel(M).split(" ")[0])));
  const cats = Object.entries(c.byCat).sort((a,b) => b[1]-a[1]);
  Object.entries(fincfg.budgets || {}).forEach(([k,v]) => { if (+v > 0 && !cats.some(x => x[0] === k)) cats.push([k, 0]); });
  if (!cats.length) cc.append(h("div",{class:"empty"},"Nenhum gasto neste mês ainda."));
  else {
    const maxv = Math.max(...cats.map(([k,v]) => Math.max(v, +(fincfg.budgets||{})[k] || 0)));
    const ul = h("ul",{class:"catbars"});
    cats.forEach(([k, v]) => { const lim = +(fincfg.budgets||{})[k] || 0; const over = lim && v > lim;
      const bar = h("div",{class:"track"},
        h("i",{class:"fill",style:`width:${(Math.min(v, lim || v)/maxv*100).toFixed(1)}%`}),
        over ? h("i",{class:"over",style:`left:calc(${(lim/maxv*100).toFixed(1)}% + 2px);width:calc(${((v-lim)/maxv*100).toFixed(1)}% - 2px)`}) : null,
        lim ? h("i",{class:"lim",style:`left:${(lim/maxv*100).toFixed(1)}%`,title:`Limite: ${brl(lim)}`}) : null);
      ul.append(h("li",{title: lim ? `${k}: ${brl(v)} de ${brl(lim)}` : `${k}: ${brl(v)}`},
        h("div",{class:"cl"}, h("span",null,k), h("b",null, brl(v), lim ? h("small",null,` de ${brl0(lim)}`) : null)), bar)); });
    cc.append(ul);
    if (Object.keys(fincfg.budgets || {}).length) cc.append(h("div",{class:"muted small",style:"margin-top:10px"},"A linha fina marca o limite que você definiu. O trecho mais escuro é o que passou dele."));
  }

  // projeção
  const pc = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Próximos 6 meses"), h("span",{class:"hint"},"projeção")));
  pc.append(projChart(projection(6)));

  // análise
  const an = finAn[M];
  const anc = h("div",{class:"card analysis"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Leitura da ÍRIS"), h("span",{class:"hint"}, an ? "atualizada " + prettyDay(dayFmt.format(new Date(an.at))) : ymLabel(M).split(" ")[0])));
  const anText = h("div",{class:"antext"}, an ? an.text : "Peça uma leitura do mês: como você está, o que chama atenção e três próximos passos possíveis, com sinceridade e sem sermão.");
  const anBtn = h("button",{class:"btn",type:"button"}, an ? "Atualizar leitura" : "Gerar leitura do mês");
  anBtn.onclick = () => genAnalysis(M, anText, anBtn);
  anc.append(anText, h("div",{class:"row-end"}, anBtn));

  // cartões, parcelas, fixas
  const side = h("div",{class:"stack"});
  const cardsC = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Cartões"), h("button",{class:"link",type:"button",onclick:()=>{ finTab="plano"; renderFin(); }},"gerenciar")));
  if (!(fincfg.cards || []).length) cardsC.append(h("div",{class:"empty"},"Nenhum cartão cadastrado."));
  (fincfg.cards || []).forEach(cd => { const u = cardUse(cd); const L = u.limit || Math.max(u.total, 1);
    cardsC.append(h("div",{class:"ccard"},
      h("div",{class:"cl"}, h("span",null, cd.name), h("b",null, u.limit ? `${brl0(Math.max(0, u.limit - u.total))} livres` : brl(u.total))),
      h("div",{class:"track"}, h("i",{class:"fill",style:`width:${Math.min(100, u.used/L*100).toFixed(1)}%`}), h("i",{class:"fut",style:`left:calc(${Math.min(100,u.used/L*100).toFixed(1)}% + 2px);width:calc(${Math.min(100 - Math.min(100,u.used/L*100), u.fut/L*100).toFixed(1)}% - 2px)`})),
      h("div",{class:"meta"}, h("span",null,`Fatura do mês ${brl(u.used)}`), h("span",null,`Parcelas futuras ${brl(u.fut)}`), u.limit ? h("span",null,`Limite ${brl0(u.limit)}`) : null, +cd.dueDay ? h("span",null,`Vence dia ${cd.dueDay}`) : null))); });
  if ((fincfg.cards || []).length) cardsC.append(h("div",{class:"legend-row"}, h("span",null, h("i",{style:"background:var(--olive)"}), "fatura do mês"), h("span",null, h("i",{style:`background:${SER.parcelas}`}), "parcelas futuras")));

  const ahead = committedAhead();
  const instC = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Parcelas em andamento"), ahead ? h("span",{class:"hint"}, `${brl(ahead)} a pagar nos próximos meses`) : null));
  const groups = {}; instAhead().concat(instTimeline().filter(p => p.month === curYM())).forEach(p => { const k = normDesc(p.desc) + "|" + p.n + "|" + Math.round(p.amount); (groups[k] = groups[k] || { desc:p.desc, n:p.n, amount:p.amount, card:p.card, rest:[] }).rest.push(p); });
  const gl = Object.values(groups).sort((a,b) => b.amount*b.rest.length - a.amount*a.rest.length);
  if (!gl.length) instC.append(h("div",{class:"empty"},"Nenhuma compra parcelada em aberto."));
  else { const ul = h("ul",{class:"items"}); gl.slice(0,8).forEach(g => { const last = g.rest.reduce((a,p) => p.month > a ? p.month : a, ""); const firstK = Math.min(...g.rest.map(p=>p.k));
    ul.append(h("li",{class:"item",style:"grid-template-columns:minmax(0,1fr) auto"}, h("div",{style:"min-width:0"}, h("span",{class:"ttl"}, g.desc), h("div",{class:"meta"}, h("span",null,`faltam ${g.rest.length} de ${g.n}`), h("span",null,`até ${ymLabel(last,true)}`), g.card ? h("span",null,g.card) : null)),
      h("div",{style:"text-align:right"}, h("b",{style:"font-weight:500"}, brl(g.amount)), h("div",{class:"meta",style:"justify-content:flex-end"}, `${brl0(g.amount*g.rest.length)} no total`)))); });
    instC.append(ul); }

  const fxC = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Contas fixas"), h("span",{class:"hint"}, ymLabel(M).split(" ")[0])));
  const fixed = fincfg.fixed || [];
  if (!fixed.length) fxC.append(h("div",{class:"empty"},"Cadastre aluguel, internet, plano de celular e outras contas em Planejamento."));
  else { const ul = h("ul",{class:"items"}); fixed.slice().sort((a,b) => (+a.day||99) - (+b.day||99)).forEach(f => { const paid = fintx.some(t => t.month === M && t.fixedId === f.id);
    ul.append(h("li",{class:"item"+(paid?" done":"")},
      checkBtn(paid, (paid?"Desmarcar pagamento: ":"Marcar como paga: ")+f.desc, async () => { if (paid) { const t = fintx.find(t => t.month === M && t.fixedId === f.id); if (t) txDel(t.id); } else await txAdd({ type:"saida", amount:fixedAmt(f, M), desc:f.desc, cat:f.cat || "Contas da casa", method:"pix", date: M === cur ? today() : M+"-"+String(Math.min(28, +f.day||1)).padStart(2,"0"), month:M, fixedId:f.id }); }),
      h("div",null, h("span",{class:"ttl"}, f.desc), h("div",{class:"meta"}, fixedWhen(f, M) ? h("span",null, fixedWhen(f, M)) : null, h("span",null, f.cat || "Contas da casa"))),
      h("b",{style:"font-weight:500"}, brl(fixedAmt(f, M))))); });
    fxC.append(ul); }

  side.append(cardsC, fxC, instC);
  const grid = h("div",{class:"home",style:"margin-top:22px"}, h("div",{class:"stack"}, ac, cc, pc, anc), side);
  root.append(grid);
}

function projChart(data){
  const wrap = h("div",{class:"chartwrap"});
  if (!data.some(d => d.renda || d.fixas || d.parcelas || d.variavel)) { wrap.append(h("div",{class:"empty"},"Sem dados suficientes para projetar ainda.")); return wrap; }
  const legend = h("div",{class:"legend-row"});
  ["fixas","parcelas","variavel"].forEach(k => legend.append(h("span",null, h("i",{style:`background:${SER[k]}`}), SER_LABEL[k])));
  if (data[0].renda) legend.append(h("span",null, h("i",{class:"line"}), "Renda"));
  wrap.append(legend);
  const narrow = innerWidth < 640; const W = narrow ? 360 : 640, H = narrow ? 230 : 250, L = narrow ? 56 : 64, Rr = 12, T = 14, B = 30;
  const maxv = Math.max(...data.map(d => Math.max(d.renda, d.fixas + d.parcelas + d.variavel))) * 1.08 || 1;
  const step = niceStep(maxv/4); const top = Math.ceil(maxv/step)*step;
  const y = v => T + (H - T - B) * (1 - v/top);
  const bw = (W - L - Rr) / data.length;
  const NS = "http://www.w3.org/2000/svg"; const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const svg = el("svg",{ viewBox:`0 0 ${W} ${H}`, role:"img", "aria-label":"Projeção de gastos e renda para os próximos seis meses" });
  for (let v = 0; v <= top + 0.01; v += step) { svg.append(el("line",{ x1:L, x2:W-Rr, y1:y(v), y2:y(v), stroke:"#E3DACB", "stroke-width":1 }));
    const t = el("text",{ x:L-8, y:y(v)+4, "text-anchor":"end", "font-size":11, fill:"#9A8A79" }); t.textContent = brl0(v); svg.append(t); }
  data.forEach((d, i) => {
    const x = L + i*bw + bw*0.22, w = bw*0.56; let acc = 0;
    ["fixas","parcelas","variavel"].forEach((k, j, arr) => { const v = d[k]; if (v <= 0) return; const y1 = y(acc + v), y0 = y(acc);
      const hgt = Math.max(0, y0 - y1 - (acc > 0 ? 2 : 0)); acc += v;
      svg.append(el("rect",{ x, y:y1, width:w, height:hgt, fill:SER[k], rx: 2 })); });
    const t = el("text",{ x:x + w/2, y:H-10, "text-anchor":"middle", "font-size":12, fill:"#5C5650" }); t.textContent = ymLabel(d.m, true); svg.append(t);
  });
  if (data[0].renda) {
    const pts = data.map((d, i) => [L + i*bw + bw/2, y(d.renda)]);
    svg.append(el("polyline",{ points:pts.map(p => p.join(",")).join(" "), fill:"none", stroke:"#2F2C29", "stroke-width":2, "stroke-linejoin":"round" }));
    pts.forEach(p => svg.append(el("circle",{ cx:p[0], cy:p[1], r:4, fill:"#2F2C29", stroke:"#FBF9F5", "stroke-width":2 })));
  }
  const tip = h("div",{class:"tip",hidden:true});
  data.forEach((d, i) => { const r = el("rect",{ x:L + i*bw, y:T, width:bw, height:H-T-B, fill:"transparent", style:"cursor:default" });
    const show = ev => { const sobra = d.renda - d.fixas - d.parcelas - d.variavel; tip.textContent = "";
      tip.append(h("b",null, ymLabel(d.m)), h("div",null,`Contas fixas: ${brl(d.fixas)}`), h("div",null,`Parcelas: ${brl(d.parcelas)}`), h("div",null,`Dia a dia (média): ${brl(d.variavel)}`),
        d.renda ? h("div",null,`Renda: ${brl(d.renda)}`) : null, d.renda ? h("div",{style:"margin-top:4px"}, sobra >= 0 ? `Sobra estimada: ${brl(sobra)}` : `Faltaria: ${brl(-sobra)}`) : null);
      tip.hidden = false; const box = wrap.getBoundingClientRect(); const px = (L + i*bw + bw/2)/W*box.width; tip.style.left = Math.min(box.width - 180, Math.max(0, px - 90)) + "px"; };
    r.addEventListener("mouseenter", show); r.addEventListener("focus", show); r.addEventListener("mouseleave", () => { tip.hidden = true; }); r.setAttribute("tabindex","0"); svg.append(r); });
  const sc = h("div",{class:"svgbox"}); sc.append(svg); wrap.append(sc, tip);
  const tbl = h("details",{class:"tbl"}, h("summary",{class:"muted small"},"Ver em tabela"));
  const t = h("table",null, h("thead",null, h("tr",null, h("th",null,"Mês"), h("th",null,"Fixas"), h("th",null,"Parcelas"), h("th",null,"Dia a dia"), h("th",null,"Renda"), h("th",null,"Sobra"))));
  const tb = h("tbody"); data.forEach(d => tb.append(h("tr",null, h("td",null,ymLabel(d.m,true)), h("td",null,brl0(d.fixas)), h("td",null,brl0(d.parcelas)), h("td",null,brl0(d.variavel)), h("td",null,d.renda?brl0(d.renda):"—"), h("td",null,d.renda?brl0(d.renda-d.fixas-d.parcelas-d.variavel):"—"))));
  t.append(tb); tbl.append(h("div",{style:"overflow-x:auto"}, t)); wrap.append(tbl);
  return wrap;
}
function niceStep(raw){ const p = Math.pow(10, Math.floor(Math.log10(raw || 1))); const n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }

async function genAnalysis(M, out, btn){
  if (!sample) { out.textContent = "A leitura precisa do Claude, disponível ao abrir a página no claude.ai."; return; }
  btn.disabled = true; const prev = out.textContent; out.textContent = "A ÍRIS está lendo seus números…";
  const data = finSummary(); const c = finCalc(M);
  const prompt = `Você é a ÍRIS, assistente pessoal de ${userName || "uma pessoa"}, ${PERFIL.descricao}, inspirada no J.A.R.V.I.S., mas acolhedora e sincera. Ela valoriza segurança financeira e autonomia, tem orçamento limitado e tende a se cobrar demais.
Faça uma leitura financeira de ${ymLabel(M)} em português do Brasil, em texto simples (sem markdown, sem asteriscos), com três partes curtas separadas por linha em branco:
1) Como você está: 2 a 3 frases honestas, sem alarmismo e sem elogio vazio.
2) O que chama atenção: 2 a 4 observações concretas com números (categorias que cresceram, parcelas que pesam, limites, reserva, padrões como muitos gastos pequenos).
3) Próximos passos: no máximo 3 ações simples e realistas para as próximas semanas, começando por verbo.
Não invente números. Se faltar dado (ex.: renda ou limites), diga o que ajudaria preencher.
Dados: ${JSON.stringify(data).slice(0, 12000)}
Gastos do mês por lançamento (amostra): ${JSON.stringify(c.out.slice(0,120).map(t => [t.date, t.desc, Math.round(t.amount), t.cat, t.method]))}`;
  try { const r = await sample(prompt, { cache:false, onText:({ text }) => { out.textContent = text; } }); out.textContent = r.text; await anSave(M, r.text); renderFinIfOpen(); }
  catch (e) { out.textContent = (e.text || prev) + "\n\n" + aiMsg(e, "Não consegui terminar a leitura agora. Tente de novo em instantes."); }
  finally { btn.disabled = false; }
}

/* lançamentos */
function finLanc(root){
  const M = finMonth, cards = fincfg.cards || [];
  const form = h("form",{class:"card lform",autocomplete:"off"},
    h("div",{class:"card-h"}, h("h2",{class:"t"},"Novo lançamento")),
    h("div",{class:"lgrid"},
      h("label",null,"Tipo", h("select",{id:"fType"}, opt("saida","Gasto",true), opt("entrada","Entrada"))),
      h("label",null,"Valor (R$)", h("input",{type:"number",id:"fVal",step:"0.01",min:"0",inputmode:"decimal",placeholder:"0,00"})),
      h("label",{class:"wide"},"Descrição", h("input",{type:"text",id:"fDesc",placeholder:"Ex.: mercado do mês"})),
      h("label",null,"Categoria", h("select",{id:"fCat"}, ...CATS.map(c => opt(c,c)))),
      h("label",null,"Forma", h("select",{id:"fMeth"}, ...Object.entries(METHODS).map(([k,l]) => opt(k,l,k==="pix")))),
      h("label",{id:"wCard",hidden:true},"Cartão", h("select",{id:"fCard"}, ...(cards.length ? cards.map(c => opt(c.name,c.name)) : [opt("","Cadastre em Planejamento")]))),
      h("label",{id:"wInst",hidden:true},"Parcelas", h("input",{type:"number",id:"fInst",min:"1",max:"48",value:"1"})),
      h("label",null,"Data", h("input",{type:"date",id:"fDate",value: M === curYM() ? today() : M+"-01"}))),
    h("div",{class:"row-end"}, h("span",{class:"muted small",id:"fHint",style:"margin-right:auto"}), h("button",{class:"btn",type:"submit"},"Adicionar")));
  root.append(form);
  const sync = () => { const t = $("fType").value, credit = $("fMeth").value === "credito";
    const cat = $("fCat"); const want = t === "entrada" ? INCATS : CATS; if (!want.includes(cat.value)) { cat.textContent = ""; want.forEach(c => cat.append(opt(c,c))); }
    $("wCard").hidden = !credit || t === "entrada"; $("wInst").hidden = !credit || t === "entrada";
    const n = +$("fInst").value || 1, v = +$("fVal").value || 0; $("fHint").textContent = credit && n > 1 && v ? `${n}× de ${brl(v/n)}. As parcelas futuras entram nas projeções.` : ""; };
  ["fType","fMeth","fInst","fVal"].forEach(id => $(id).addEventListener("input", sync)); sync();
  form.onsubmit = async e => { e.preventDefault(); const v = +$("fVal").value; if (!v) { $("fVal").focus(); return; }
    const credit = $("fMeth").value === "credito" && $("fType").value === "saida"; const n = credit ? Math.max(1, Math.min(48, +$("fInst").value || 1)) : 1;
    const id = await txAdd({ type:$("fType").value, amount: v/n, desc:$("fDesc").value, cat:$("fCat").value, method:$("fMeth").value, card: credit ? ($("fCard").value || null) : null, date:$("fDate").value || today(), inst: n > 1 ? { k:1, n } : null });
    if (id) { $("fVal").value = ""; $("fDesc").value = ""; $("fInst").value = "1"; sync(); toast("Lançamento guardado."); $("fVal").focus(); } };

  const list = fintx.filter(t => t.month === M && (!finCatFilter || t.cat === finCatFilter)).sort((a,b) => a.date < b.date ? 1 : -1);
  const all = fintx.filter(t => t.month === M);
  const lc = h("div",{class:"card",style:"margin-top:22px"},
    h("div",{class:"card-h"}, h("h2",{class:"t"}, `Lançamentos de ${ymLabel(M).split(" ")[0]}`),
      h("select",{class:"mini","aria-label":"Filtrar por categoria",onchange:e=>{ finCatFilter = e.target.value; renderFin(); }}, opt("","Todas as categorias",!finCatFilter), ...[...new Set(all.map(t => t.cat))].sort().map(c => opt(c,c,c===finCatFilter)))),
    h("div",{class:"lsum"}, h("span",null,"Entradas ", h("b",null, brl(sum(all.filter(t=>t.type==="entrada"), t=>t.amount)))), h("span",null,"Gastos ", h("b",null, brl(sum(all.filter(t=>t.type==="saida"), t=>t.amount))))));
  if (!list.length) lc.append(h("div",{class:"empty"}, "Nenhum lançamento aqui."));
  else { const ul = h("ul",{class:"txlist"}); let lastDay = "";
    list.forEach(t => { if (t.date !== lastDay) { lastDay = t.date; ul.append(h("li",{class:"txday"}, prettyDay(t.date))); }
      ul.append(h("li",{class:"tx"},
        h("div",{style:"min-width:0"}, h("span",{class:"ttl"}, t.desc), h("div",{class:"meta"}, h("select",{class:"catsel","aria-label":"Categoria de " + t.desc,title:"Trocar a categoria",onchange:e => txSetCat(t.id, e.target.value)}, ...((t.type === "entrada" ? INCATS : CATS).includes(t.cat) ? [] : [opt(t.cat, t.cat, true)]), ...(t.type === "entrada" ? INCATS : CATS).map(c => opt(c, c, c === t.cat))), h("span",null, METHODS[t.method] || t.method), t.card ? h("span",null,t.card) : null, t.inst && t.inst.n > 1 ? h("span",null,`parcela ${t.inst.k}/${t.inst.n}`) : null, t.source === "fatura" ? h("span",null,"da fatura") : null)),
        h("b",{class:t.type === "entrada" ? "in" : ""}, (t.type === "entrada" ? "+ " : "") + brl(t.amount)),
        h("button",{class:"ib",type:"button","aria-label":"Remover lançamento",title:"Remover",onclick:()=>txDel(t.id)}, icon("i-trash")))); });
    lc.append(ul); }
  root.append(lc);
}

/* leitura de fatura */
let pdfReady = null;
function loadScript(src){ return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("script")); document.head.append(s); }); }
function ensurePdf(){
  if (!pdfReady) pdfReady = (async () => {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    const lib = window.pdfjsLib || window["pdfjs-dist/build/pdf"];
    lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    return lib;
  })().catch(e => { pdfReady = null; throw e; });
  return pdfReady;
}
async function pdfToInput(file){
  const lib = await ensurePdf();
  const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let text = "";
  for (let i = 1; i <= Math.min(doc.numPages, 12); i++) {
    const pg = await doc.getPage(i); const tc = await pg.getTextContent(); let lastY = null, line = [];
    for (const it of tc.items) { const yy = Math.round(it.transform[5]); if (lastY !== null && Math.abs(yy - lastY) > 2) { text += line.join(" ") + "\n"; line = []; } line.push(it.str); lastY = yy; }
    text += line.join(" ") + "\n\n";
  }
  if (text.replace(/\s/g,"").length > 200) return { text };
  const images = [];
  for (let i = 1; i <= Math.min(doc.numPages, 4); i++) { const pg = await doc.getPage(i); const vp = pg.getViewport({ scale:1.6 }); const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
    await pg.render({ canvasContext:cv.getContext("2d"), viewport:vp }).promise; images.push(await new Promise(r => cv.toBlob(r, "image/jpeg", 0.85))); }
  return { images };
}
function finFatura(root){
  const card = h("div",{class:"card"},
    h("div",{class:"card-h"}, h("h2",{class:"t"},"Ler faturas dos cartões")),
    h("p",{class:"lede",style:"margin:-4px 0 14px"},"Envie uma ou várias faturas de uma vez, de cartões e meses diferentes: PDF, print ou foto. Também dá para colar o texto. A ÍRIS lê uma por uma, identifica cada compra, sugere a categoria e encontra as parcelas. Você revisa cada fatura antes de guardar."),
    h("label",{class:"drop",id:"drop"}, h("input",{type:"file",id:"fatFile",accept:"application/pdf,image/png,image/jpeg,image/webp",multiple:true,hidden:true}),
      h("b",null,"Escolher arquivos"), h("span",{class:"muted small",id:"fatName"},"PDF, PNG ou JPG · pode selecionar vários ou arrastar aqui")),
    h("ul",{class:"filelist",id:"fatList"}),
    h("textarea",{class:"mind",id:"fatText",placeholder:"…ou cole aqui o texto de uma fatura ou extrato",style:"margin-top:12px;min-height:80px"}),
    h("div",{class:"row-end"}, h("button",{class:"btn",type:"button",id:"fatGo"},"Ler com a ÍRIS")),
    h("div",{id:"fatStatus"}),
    h("div",{id:"fatOut"}));
  root.append(card);
  let files = [];
  const showFiles = () => { const ul = $("fatList"); ul.textContent = "";
    $("fatName").textContent = files.length ? `${plural(files.length,"arquivo escolhido","arquivos escolhidos")} · clique para trocar ou arraste mais` : "PDF, PNG ou JPG · pode selecionar vários ou arrastar aqui";
    files.forEach((f, i) => ul.append(h("li",null, h("span",null, f.name), h("small",null, `${(f.size/1024).toFixed(0)} KB`),
      h("button",{class:"ib",type:"button","aria-label":"Tirar "+f.name,onclick:()=>{ files.splice(i,1); showFiles(); }}, icon("i-trash"))))); };
  const addFiles = list => { for (const f of list) if (/pdf|png|jpe?g|webp/i.test(f.type || f.name) && !files.some(x => x.name === f.name && x.size === f.size)) files.push(f); files = files.slice(0, 12); showFiles(); };
  $("fatFile").onchange = e => { addFiles(Array.from(e.target.files || [])); e.target.value = ""; };
  const drop = $("drop");
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("over"); addFiles(Array.from(e.dataTransfer.files || [])); });
  $("fatGo").onclick = async () => { await readFaturas(files.slice(), $("fatText").value.trim()); };
  if (faturaDrafts.length) renderFaturaDrafts();
}
async function extractOne(file, pasted){
  let text = pasted || "", images = null;
  if (file) {
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) { const r = await pdfToInput(file); if (r.text) text = r.text; else images = r.images; }
    else images = [file];
  }
  if (images) { const lim = await sample.limits().catch(() => null); if (!lim || !lim.images) throw { code:"images_unavailable" }; images = images.slice(0, lim.images.maxCount || 4); }
  const prompt = `Extraia os dados desta fatura de cartão de crédito (ou extrato) brasileira. Hoje é ${today()}.
Responda só com JSON neste formato:
{"cartao": "nome do cartão/banco ou null", "vencimento": "AAAA-MM-DD ou null", "total": número ou null, "limite": número ou null,
 "lancamentos": [{"data":"AAAA-MM-DD","descricao":"texto curto","valor":número,"parcela":número ou null,"parcelas":número ou null,"categoria":"uma de: ${CATS.join(", ")}"}]}
Regras: valor positivo para compras; negativo para estornos e créditos. NÃO inclua o pagamento da fatura anterior, saldo anterior, juros de rotativo já somados no total ou linhas de resumo. Se a linha indicar parcela (ex.: "03/10" ou "PARC 3/10"), preencha parcela=3 e parcelas=10 e use o valor da parcela. Datas sem ano: deduza pelo vencimento. Descrições legíveis (ex.: "IFOOD *RESTAURANTE" vira "iFood"). Categorize com bom senso (iFood/Rappi = Delivery; Uber/99 = Transporte; farmácia = Saúde; Netflix/Spotify = Assinaturas).
${text ? "Texto da fatura:\n\"\"\"" + text.slice(0, 60000) + "\"\"\"" : "A fatura está nas imagens."}`;
  const res = await sample.json(prompt, images ? { images, cache:false } : { cache:false });
  const lines = (Array.isArray(res && res.lancamentos) ? res.lancamentos : []).filter(l => l && l.descricao && isFinite(+l.valor) && +l.valor !== 0).slice(0, 300);
  if (!lines.length) throw { code:"empty" };
  const venc = /^\d{4}-\d{2}-\d{2}$/.test(String(res.vencimento||"")) ? res.vencimento : null;
  return { id:newId(), source: file ? file.name : "texto colado", cartao:String(res.cartao || "").slice(0,60), month: venc ? ym(venc) : curYM(), venc, total:+res.total || null, limite:+res.limite || null,
    lines: lines.map(l => ({ date: /^\d{4}-\d{2}-\d{2}$/.test(String(l.data||"")) ? l.data : (venc || today()), desc:String(l.descricao).slice(0,120), amount:+l.valor, k:+l.parcela || null, n:+l.parcelas || null, cat: CATS.includes(l.categoria) ? l.categoria : "Outros", on:true })) };
}
function fatErr(e){
  return e && e.code === "images_unavailable" ? "não consegui enviar a imagem; envie o PDF ou cole o texto" :
    e && e.code === "empty" ? "não encontrei lançamentos; tente um arquivo mais nítido ou cole o texto" :
    e && e.code === "not_granted" ? "o uso do Claude não foi permitido" :
    e && e.message === "script" ? "não consegui abrir o leitor de PDF; envie um print ou cole o texto" :
    e && (e.code === "invalid_json" || e.code === "bad_json") ? "a leitura saiu incompleta; tente de novo só com as páginas de lançamentos" : e && e.code === "fn_error" ? "o Gemini não respondeu" + (e.detail ? " (" + String(e.detail).slice(0,100) + ")" : "") : "não consegui ler agora; tente de novo";
}
async function readFaturas(files, pasted){
  const st = $("fatStatus"); st.textContent = "";
  if (!files.length && !pasted) { st.append(h("div",{class:"empty",style:"margin-top:10px"},"Escolha um ou mais arquivos, ou cole o texto de uma fatura.")); return; }
  if (!sample) { st.append(h("div",{class:"empty",style:"margin-top:10px"},"A leitura precisa do Claude, disponível ao abrir a página no claude.ai.")); return; }
  const jobs = files.map(f => ({ file:f })); if (pasted) jobs.push({ pasted });
  const btn = $("fatGo"); btn.disabled = true; btn.textContent = "Lendo…";
  const line = h("div",{class:"muted small",style:"margin-top:10px"}); const errs = h("ul",{class:"faterrs"}); st.append(line, errs);
  let ok = 0;
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i]; const name = j.file ? j.file.name : "texto colado";
    line.textContent = `Lendo ${i+1} de ${jobs.length}: ${name}. Faturas longas levam até um minuto cada.`;
    try { const d = await extractOne(j.file, j.pasted); faturaDrafts.push(d); ok++; renderFaturaDrafts(); }
    catch (e) { errs.append(h("li",null, `${name}: ${fatErr(e)}.`)); }
  }
  line.textContent = ok ? `${plural(ok,"fatura lida","faturas lidas")}${jobs.length - ok ? `, ${jobs.length - ok} com problema` : ""}. Revise abaixo e guarde.` : "Nenhuma fatura pôde ser lida.";
  btn.disabled = false; btn.textContent = "Ler com a ÍRIS";
  if (ok) { const fl = $("fatList"); if (fl) fl.textContent = ""; $("fatText").value = ""; $("fatName").textContent = "PDF, PNG ou JPG · pode selecionar vários ou arrastar aqui"; }
}
function guessCard(d){ const cards = fincfg.cards || []; return (cards.find(c => normDesc(c.name) && normDesc(d.cartao).includes(normDesc(c.name))) || {}).name || null; }
function renderFaturaDrafts(){
  const out = $("fatOut"); if (!out) return; out.textContent = "";
  if (!faturaDrafts.length) return;
  const cards = fincfg.cards || [];
  if (faturaDrafts.length > 1) out.append(h("div",{class:"row-end",style:"margin-top:18px"},
    h("span",{class:"muted small",style:"margin-right:auto"}, `${faturaDrafts.length} faturas para revisar`),
    h("button",{class:"btn olive",type:"button",id:"fdAll",onclick:()=>importFaturas(faturaDrafts.map(d => d.id))},"Guardar todas")));
  faturaDrafts.forEach((d, di) => {
    if (d.cardSel === undefined) d.cardSel = guessCard(d);
    const totalSel = () => sum(d.lines.filter(l => l.on), l => l.amount);
    const dupe = l => fintx.some(t => t.month === d.month && Math.abs(t.amount - Math.abs(l.amount)) < 0.06 && normDesc(t.desc) === normDesc(l.desc) && (!l.k || (t.inst && t.inst.k === l.k)));
    const sumEl = h("b",null, brl(totalSel()));
    const box = h("div",{class:"fatdraft"},
      h("div",{class:"fd-h"}, h("div",null, h("h3",null, d.cartao || "Fatura"), h("div",{class:"meta"}, h("span",null, d.source), h("span",null, plural(d.lines.length,"lançamento","lançamentos")))),
        h("button",{class:"link",type:"button",onclick:()=>{ faturaDrafts = faturaDrafts.filter(x => x.id !== d.id); renderFaturaDrafts(); }},"descartar")),
      h("div",{class:"lgrid",style:"margin-top:12px"},
        h("label",null,"Cartão", h("select",{id:"fdCard"+di,onchange:e=>{ d.cardSel = e.target.value === "__new" ? null : e.target.value; }}, ...cards.map(c => opt(c.name, c.name, c.name === d.cardSel)), opt("__new", d.cartao ? `Novo: ${d.cartao}` : "Novo cartão", !d.cardSel))),
        h("label",null,"Mês da fatura", h("input",{type:"month",id:"fdMonth"+di,value:d.month,onchange:e=>{ d.month = e.target.value || d.month; renderFaturaDrafts(); }}))),
      h("div",{class:"lsum",style:"margin-top:12px"}, h("span",null,"Selecionado ", sumEl), d.total ? h("span",null,"Total na fatura ", h("b",null, brl(d.total))) : null, d.venc ? h("span",null,"Vence ", h("b",null, d.venc.split("-").reverse().join("/"))) : null));
    const ul = h("ul",{class:"txlist"});
    const det = h("details",{class:"fd-lines",open: faturaDrafts.length === 1 ? true : null}, h("summary",{class:"muted small"},"Ver e ajustar os lançamentos"));
    d.lines.forEach((l, i) => { const isDup = dupe(l); if (isDup && !l.touched) l.on = false;
      const cid = `fl${di}_${i}`;
      ul.append(h("li",{class:"tx draft"},
        h("input",{type:"checkbox",id:cid,checked:l.on ? true : null,"aria-label":"Importar "+l.desc,onchange:e=>{ l.on = e.target.checked; l.touched = true; sumEl.textContent = brl(totalSel()); }}),
        h("div",{style:"min-width:0"}, h("label",{for:cid,class:"ttl"}, l.desc), h("div",{class:"meta"}, h("span",null, prettyDay(l.date)), l.k && l.n ? h("span",null,`parcela ${l.k}/${l.n}`) : null, isDup ? h("span",null,"já lançado") : null,
          h("select",{class:"mini","aria-label":"Categoria",onchange:e=>{ l.cat = e.target.value; }}, ...CATS.map(c => opt(c,c,c===l.cat))))),
        h("b",{class:l.amount < 0 ? "in" : ""}, (l.amount < 0 ? "− " : "") + brl(Math.abs(l.amount))))); });
    det.append(ul); box.append(det,
      h("div",{class:"row-end"}, h("button",{class: faturaDrafts.length > 1 ? "btn ghost" : "btn olive",type:"button",onclick:()=>importFaturas([d.id])}, faturaDrafts.length > 1 ? "Guardar esta" : "Guardar lançamentos")));
    out.append(box);
  });
}
async function importFaturas(ids){
  document.querySelectorAll("#fatOut button").forEach(b => b.disabled = true);
  let total = 0, nf = 0, lastMonth = null;
  for (const id of ids) {
    const d = faturaDrafts.find(x => x.id === id); if (!d) continue;
    let cardName = d.cardSel;
    if (!cardName) { cardName = d.cartao || "Cartão"; if (!(fincfg.cards || []).some(c => c.name === cardName)) {
      const dueDay = d.venc ? +d.venc.slice(8) : null;
      await cfgSave({ cards:[...(fincfg.cards || []), { id:newId(), name:cardName, limit:d.limite || 0, dueDay, closingDay: dueDay ? (((dueDay + 23) % 30) || 30) : null }] }, true); } }
    for (const l of d.lines) { if (!l.on) continue;
      if (l.amount < 0) await txAdd({ type:"entrada", amount:-l.amount, desc:"Estorno: " + l.desc, cat:"Outras entradas", method:"credito", card:cardName, date:l.date, month:d.month, source:"fatura" });
      else await txAdd({ type:"saida", amount:l.amount, desc:l.desc, cat:l.cat, method:"credito", card:cardName, date:l.date, month:d.month, inst: l.k && l.n && l.n > 1 ? { k:l.k, n:l.n } : null, source:"fatura" });
      total++; }
    faturaDrafts = faturaDrafts.filter(x => x.id !== id); nf++; lastMonth = d.month;
  }
  toast(`${plural(total,"lançamento guardado","lançamentos guardados")} de ${plural(nf,"fatura","faturas")}.`);
  if (!faturaDrafts.length) { finTab = "visao"; if (lastMonth) finMonth = lastMonth; }
  renderFin();
}

/* planejamento */
function finPlano(root){
  const c = fincfg;
  const basics = h("form",{autocomplete:"off"},
    h("div",{class:"card-h",style:"margin-top:22px"}, h("h2",{class:"t",style:"font-size:21px"},"Renda, metas e reserva")),
    h("div",{class:"lgrid"},
      h("label",null,"Renda mensal (R$)", h("input",{type:"number",id:"pInc",step:"0.01",min:"0",value:c.income || ""})),
      h("label",null,"Quero guardar (% da renda)", h("input",{type:"number",id:"pSave",min:"0",max:"90",value:c.savingsPct ?? 10})),
      h("label",null,"Reserva atual (R$)", h("input",{type:"number",id:"pRes",step:"0.01",min:"0",value:c.reserve || ""})),
      h("label",null,"Meta da reserva (meses de gastos)", h("input",{type:"number",id:"pResG",min:"1",max:"24",value:c.reserveGoalMonths || 6}))),
    h("div",{class:"card-h",style:"margin-top:22px"}, h("h2",{class:"t",style:"font-size:21px"},"Limites por categoria"), h("span",{class:"hint"},"deixe vazio o que não quiser limitar")),
    h("div",{class:"lgrid budgets"}, ...CATS.map((k, i) => h("label",null, k, h("input",{type:"number",id:"pb"+i,min:"0",step:"1",placeholder:"—",value:(c.budgets||{})[k] || ""})))),
    h("div",{class:"row-end"}, h("button",{class:"btn",type:"submit"},"Salvar")));
  basics.onsubmit = e => { e.preventDefault(); const budgets = {}; CATS.forEach((k, i) => { const v = +$("pb"+i).value; if (v > 0) budgets[k] = v; });
    cfgSave({ income:+$("pInc").value || 0, savingsPct:Math.max(0, Math.min(90, +$("pSave").value || 0)), reserve:+$("pRes").value || 0, reserveGoalMonths:Math.max(1, +$("pResG").value || 6), budgets }); };

  const cardsC = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Cartões")));
  const ulc = h("ul",{class:"items"}); (c.cards || []).forEach(cd => ulc.append(h("li",{class:"item",style:"grid-template-columns:minmax(0,1fr) auto"},
    h("div",null, h("span",{class:"ttl"}, cd.name), h("div",{class:"meta"}, h("span",null,`limite ${brl0(cd.limit)}`), cd.closingDay ? h("span",null,`fecha dia ${cd.closingDay}`) : null, cd.dueDay ? h("span",null,`vence dia ${cd.dueDay}`) : null)),
    h("button",{class:"ib",type:"button","aria-label":"Remover cartão",onclick:()=>cfgSave({ cards:(fincfg.cards||[]).filter(x => x.id !== cd.id) }, true)}, icon("i-trash")))));
  cardsC.append((c.cards||[]).length ? ulc : h("div",{class:"empty"},"Nenhum cartão ainda."));
  const cf = h("form",{class:"lgrid",style:"margin-top:12px",autocomplete:"off"},
    h("label",{class:"wide"},"Nome", h("input",{type:"text",id:"cName",placeholder:"Ex.: Nubank"})),
    h("label",null,"Limite (R$)", h("input",{type:"number",id:"cLim",min:"0",step:"1"})),
    h("label",null,"Fecha dia", h("input",{type:"number",id:"cClose",min:"1",max:"31"})),
    h("label",null,"Vence dia", h("input",{type:"number",id:"cDue",min:"1",max:"31"})),
    h("div",{style:"display:flex;align-items:flex-end"}, h("button",{class:"btn ghost",type:"submit"},"Adicionar cartão")));
  cf.onsubmit = e => { e.preventDefault(); const name = $("cName").value.trim(); if (!name) { $("cName").focus(); return; }
    cfgSave({ cards:[...(fincfg.cards||[]), { id:newId(), name:name.slice(0,40), limit:+$("cLim").value || 0, closingDay:+$("cClose").value || null, dueDay:+$("cDue").value || null }] }, true); };
  cardsC.append(cf);

  const fxC = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Contas fixas"), h("span",{class:"hint"}, `${brl(sum(c.fixed||[], f => fixedAmt(f, finMonth)))} em ${ymLabel(finMonth).split(" ")[0]}`)));
  const ulf = h("ul",{class:"items"}); (c.fixed || []).forEach(f => ulf.append(h("li",{class:"item",style:"grid-template-columns:minmax(0,1fr) auto auto"},
    h("div",null, h("span",{class:"ttl"}, f.desc), h("div",{class:"meta"}, h("span",null, f.cat), fixedWhen(f) ? h("span",null, fixedWhen(f)) : null)),
    h("b",{style:"font-weight:500"}, brl(f.amount) + (f.freq === "semanal" ? " / sem." : "")),
    h("button",{class:"ib",type:"button","aria-label":"Remover conta",onclick:()=>cfgSave({ fixed:(fincfg.fixed||[]).filter(x => x.id !== f.id) }, true)}, icon("i-trash")))));
  fxC.append((c.fixed||[]).length ? ulf : h("div",{class:"empty"},"Nenhuma conta fixa ainda."));
  const ff = h("form",{class:"lgrid",style:"margin-top:12px",autocomplete:"off"},
    h("label",{class:"wide"},"Conta", h("input",{type:"text",id:"xDesc",placeholder:"Ex.: aluguel, internet, plano do celular"})),
    h("label",null,"Valor (R$, por vez)", h("input",{type:"number",id:"xVal",min:"0",step:"0.01"})),
    h("label",null,"Repete", h("select",{id:"xFreq",onchange:e=>{ const w = e.target.value === "semanal"; $("wXDay").hidden = w; $("wXWd").hidden = !w; }}, opt("mensal","Todo mês",true), opt("semanal","Toda semana"))),
    h("label",{id:"wXDay"},"Dia do vencimento", h("input",{type:"number",id:"xDay",min:"1",max:"31"})),
    h("label",{id:"wXWd",hidden:true},"Dia da semana", h("select",{id:"xWd"}, ...[1,2,3,4,5,6,0].map(d => opt(String(d), DOW_PT[d].replace(/^./, c => c.toUpperCase()), d === 1)))),
    h("label",null,"Categoria", h("select",{id:"xCat"}, ...CATS.map(k => opt(k,k,k==="Contas da casa")))),
    h("div",{style:"display:flex;align-items:flex-end"}, h("button",{class:"btn ghost",type:"submit"},"Adicionar conta")));
  ff.onsubmit = e => { e.preventDefault(); const desc = $("xDesc").value.trim(), val = +$("xVal").value; if (!desc || !val) { (desc ? $("xVal") : $("xDesc")).focus(); return; }
    const wk = $("xFreq").value === "semanal";
    cfgSave({ fixed:[...(fincfg.fixed||[]), wk ? { id:newId(), desc:desc.slice(0,60), amount:val, freq:"semanal", weekday:+$("xWd").value, cat:$("xCat").value } : { id:newId(), desc:desc.slice(0,60), amount:val, day:+$("xDay").value || null, cat:$("xCat").value }] }, true); };
  fxC.append(ff);

  // recebo por dia trabalhado
  const M = finMonth, wi = workInfo(M), pd = c.perDay || [], tot = perDayTotal();
  const DOW = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"], wd = c.workDays || [1,2,3,4,5];
  const pdC = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Recebo por dia trabalhado"), tot ? h("span",{class:"hint"}, `${brl(tot)} por dia`) : null));
  const ulp = h("ul",{class:"items"}); pd.forEach(b => ulp.append(h("li",{class:"item",style:"grid-template-columns:minmax(0,1fr) auto auto"},
    h("div",null, h("span",{class:"ttl"}, b.desc)), h("b",{style:"font-weight:500"}, brl(b.amount) + " / dia"),
    h("button",{class:"ib",type:"button","aria-label":"Remover "+b.desc,onclick:()=>cfgSave({ perDay:(fincfg.perDay||[]).filter(x => x.id !== b.id) }, true)}, icon("i-trash")))));
  pdC.append(pd.length ? ulp : h("div",{class:"empty"},"Vale-transporte, alimentação ou outro valor que você recebe por dia de trabalho."));
  if (pd.length) {
    const setOff = v => cfgSave({ daysOff:Object.assign({}, fincfg.daysOff || {}, { [M]: Math.max(0, Math.min(wi.util, v)) }) }, true);
    pdC.append(h("div",{class:"workm"},
      h("div",{class:"wm-h"}, h("b",null, ymLabel(M)), h("span",{class:"muted small"}, `${wi.util} dias úteis`)),
      wi.feriados.length ? h("div",{class:"muted small"}, `Feriados em dia de trabalho: ${wi.feriados.map(f => `${f.date.slice(8)}/${f.date.slice(5,7)} ${f.name}`).join(" · ")}`) : h("div",{class:"muted small"},"Nenhum feriado em dia de trabalho."),
      h("div",{class:"wm-off"}, h("span",null,"Faltas ou folgas"),
        h("button",{class:"ib step",type:"button","aria-label":"Menos uma falta",onclick:()=>setOff(wi.off - 1),disabled:!wi.off},"−"),
        h("b",{"aria-live":"polite"}, String(wi.off)),
        h("button",{class:"ib step",type:"button","aria-label":"Mais uma falta",onclick:()=>setOff(wi.off + 1)},"+")),
      h("div",{class:"wm-tot"}, h("span",null, `${plural(wi.worked, "dia trabalhado", "dias trabalhados")} × ${brl(tot)}`), h("b",null, brl(perDayIncome(M))))));
  }
  const pf = h("form",{class:"lgrid",style:"margin-top:12px",autocomplete:"off"},
    h("label",{class:"wide"},"O que é", h("input",{type:"text",id:"dDesc",placeholder:"Ex.: transporte, alimentação"})),
    h("label",null,"Valor por dia (R$)", h("input",{type:"number",id:"dVal",min:"0",step:"0.01"})),
    h("div",{style:"display:flex;align-items:flex-end"}, h("button",{class:"btn ghost",type:"submit"},"Adicionar")));
  pf.onsubmit = e => { e.preventDefault(); const desc = $("dDesc").value.trim(), val = +$("dVal").value; if (!desc || !val) { (desc ? $("dVal") : $("dDesc")).focus(); return; }
    cfgSave({ perDay:[...(fincfg.perDay||[]), { id:newId(), desc:desc.slice(0,60), amount:val }] }, true); };
  pdC.append(pf, h("div",{class:"wdays",role:"group","aria-label":"Dias da semana em que você trabalha"}, h("span",{class:"muted small"},"Trabalho em:"),
    ...[1,2,3,4,5,6,0].map(d => h("button",{type:"button",class:"chip"+(wd.includes(d)?" on":""),"aria-pressed":String(wd.includes(d)),onclick:()=>cfgSave({ workDays: wd.includes(d) ? wd.filter(x => x !== d) : [...wd, d].sort() }, true)}, DOW[d]))));

  // holerite e 13º
  const ps = Object.assign({ salarioBase:0, anuenio:0, inss:0, vtDesconto:0, irrf:0 }, c.payslip || {});
  const bruto = (+ps.salarioBase || 0) + (+ps.anuenio || 0), liq = bruto - (+ps.inss || 0) - (+ps.vtDesconto || 0) - (+ps.irrf || 0);
  const row = (l, v, cls) => h("li",{class:"hl-r" + (cls ? " " + cls : "")}, h("span",null,l), h("b",null,v));
  const hlC = h("div",null, h("div",{class:"card-h"}, h("h2",{class:"t",style:"font-size:21px"},"Holerite"), ps.mes ? h("span",{class:"hint"}, `referência: ${ymLabel(ps.mes)}`) : null));
  if (bruto) hlC.append(h("ul",{class:"hl"},
    row("Salário base", brl(ps.salarioBase)), +ps.anuenio ? row("Anuênio", "+ " + brl(ps.anuenio)) : null, row("Bruto", brl(bruto), "sub"),
    row("INSS", "− " + brl(ps.inss || 0)), +ps.vtDesconto ? row("Vale-transporte (sua parte)", "− " + brl(ps.vtDesconto)) : null,
    row("IRRF", +ps.irrf ? "− " + brl(ps.irrf) : "R$ 0,00 · isento até R$ 5 mil"), row("Líquido", brl(liq), "tot"),
    h("li",{class:"muted small"}, `Valor da hora (${+ps.horas || 220} h no mês): ${brl(bruto / (+ps.horas || 220))} bruto · ${brl(liq / (+ps.horas || 220))} líquido · hora extra 50%: ${brl(bruto / (+ps.horas || 220) * 1.5)}`),
    (+ps.vaEmpresa || +ps.vtEmpresa) ? h("li",{class:"muted small",style:"padding-top:6px"}, `Benefícios pagos pela empresa no mês: ${[+ps.vaEmpresa ? "alimentação " + brl(ps.vaEmpresa) : "", +ps.vtEmpresa ? "transporte " + brl(ps.vtEmpresa) : ""].filter(Boolean).join(" · ")}. Eles entram em "Recebo por dia trabalhado".`) : null,
    Math.abs(liq - (+c.income || 0)) > 0.01 ? h("li",null, h("button",{class:"btn ghost",type:"button",style:"margin-top:8px",onclick:()=>cfgSave({ income: Math.round(liq * 100) / 100 })}, `Usar ${brl(liq)} como renda mensal`)) : h("li",{class:"muted small",style:"padding-top:6px"},"A renda mensal do planejamento usa este líquido.")));
  else hlC.append(h("div",{class:"empty"},"Cadastre os valores do seu contracheque para a ÍRIS calcular o líquido e o 13º."));
  const hf = h("form",{class:"lgrid",style:"margin-top:12px",autocomplete:"off"},
    h("label",null,"Mês de referência", h("input",{type:"month",id:"hMes",value:ps.mes || curYM()})),
    h("label",null,"Salário base (R$)", h("input",{type:"number",id:"hBase",step:"0.01",min:"0",value:ps.salarioBase || ""})),
    h("label",null,"Adicionais / anuênio (R$)", h("input",{type:"number",id:"hAn",step:"0.01",min:"0",value:ps.anuenio || ""})),
    h("label",null,"INSS (R$)", h("input",{type:"number",id:"hInss",step:"0.01",min:"0",value:ps.inss || ""})),
    h("label",null,"Desconto do vale-transporte (R$)", h("input",{type:"number",id:"hVt",step:"0.01",min:"0",value:ps.vtDesconto || ""})),
    h("label",null,"IRRF (R$)", h("input",{type:"number",id:"hIr",step:"0.01",min:"0",value:ps.irrf || "",placeholder:"0"})),
    h("div",{style:"display:flex;align-items:flex-end"}, h("button",{class:"btn ghost",type:"submit"},"Salvar holerite")));
  hf.onsubmit = e => { e.preventDefault(); const np = Object.assign({}, c.payslip || {}, { mes:$("hMes").value || curYM(), salarioBase:+$("hBase").value || 0, anuenio:+$("hAn").value || 0, inss:+$("hInss").value || 0, vtDesconto:+$("hVt").value || 0, irrf:+$("hIr").value || 0 });
    np.bruto = np.salarioBase + np.anuenio; np.liquido = Math.round((np.bruto - np.inss - np.vtDesconto - np.irrf) * 100) / 100; cfgSave({ payslip:np }); };
  const det = h("details",{class:"hl-edit"}, h("summary",null, bruto ? "Atualizar valores do holerite" : "Preencher holerite"), hf); hlC.append(det);

  // 13º salário
  const y = +curYM().slice(0,4), adm = ps.admissao ? new Date(ps.admissao + "T12:00:00") : null;
  const avos = adm && adm.getFullYear() === y ? Math.max(0, 12 - adm.getMonth() - (adm.getDate() > 15 ? 1 : 0)) : 12;
  const b13 = bruto * avos / 12, p1 = Math.round(b13 / 2 * 100) / 100, inss13 = avos === 12 ? (+ps.inss || 0) : Math.round((+ps.inss || 0) * avos / 12 * 100) / 100, p2 = Math.round((b13 - p1 - inss13 - 0) * 100) / 100;
  const t13 = fintx.filter(t => t.type === "entrada" && t.cat === "13º salário" && t.month && t.month.startsWith(String(y)));
  const d13 = h("div",{style:"margin-top:22px"}, h("div",{class:"card-h"}, h("h2",{class:"t",style:"font-size:21px"}, `13º salário de ${y}`), bruto ? h("span",{class:"hint"}, `${avos}/12 avos`) : null));
  if (!bruto) d13.append(h("div",{class:"empty"},"Preencha o holerite para ver o 13º."));
  else { d13.append(h("ul",{class:"hl"}, row("Base (bruto)", brl(b13)),
      row(`1ª parcela · até 30/11`, brl(p1)), h("li",{class:"muted small"},"50% do bruto, sem INSS nem IRRF."),
      row(`2ª parcela · até 20/12`, brl(p2)), h("li",{class:"muted small"}, `Bruto − 1ª parcela − INSS (${brl(inss13)}). IRRF: R$ 0, isento até R$ 5 mil.`),
      row("Total líquido", brl(p1 + p2), "tot")));
    d13.append(t13.length ? h("p",{class:"muted small",style:"margin:10px 0 0"}, `Lançado no Financeiro: ${t13.map(t => `${brl(t.amount)} em ${ymLabel(t.month).split(" ")[0]}`).join(" e ")}.`)
      : h("button",{class:"btn ghost",type:"button",style:"margin-top:10px",onclick:async()=>{ await txAdd({ type:"entrada", amount:p1, desc:"13º salário — 1ª parcela", cat:"13º salário", method:"pix", date:y + "-11-30", month:y + "-11" }); await txAdd({ type:"entrada", amount:p2, desc:"13º salário — 2ª parcela", cat:"13º salário", method:"pix", date:y + "-12-18", month:y + "-12" }); toast("13º lançado em novembro e dezembro."); renderFin(); }}, "Lançar as duas parcelas no Financeiro")); }

  const baseC = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Base do mês")), hlC, d13, basics);
  root.append(h("div",{class:"home"}, h("div",{class:"stack"}, baseC, pdC), h("div",{class:"stack"}, cardsC, fxC)));
}

/* resumo no início */
function finHomeCard(){
  const box = $("finHome"); if (!box) return; box.textContent = "";
  if (!fintx.length && !(+fincfg.income)) { box.append(h("div",{class:"empty"},"Monte seu painel financeiro para ver aqui quanto ainda está livre no mês. ", h("a",{class:"link",href:"#financeiro"},"Começar"))); return; }
  const c = finCalc(curYM()), hh = health(), al = finAlerts().filter(a => a.k !== "info");
  box.append(h("div",{class:"finmini"},
    h("div",null, h("span",null,"Livre para gastar"), h("b",null, c.renda ? brl0(c.free) : "—")),
    h("div",null, h("span",null,"Saúde"), h("b",null, hh ? String(hh.score) : "—"), hh ? h("small",null, hh.label) : null)));
  if (al[0]) box.append(h("p",{class:"muted small",style:"margin:10px 0 0"}, al[0].t));
}
