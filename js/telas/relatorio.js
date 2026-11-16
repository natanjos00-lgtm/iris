"use strict";
/* ÍRIS · Relatório financeiro: resumo de um período (mês, trimestre, semestre ou ano),
   para ver na tela, salvar em PDF (pela impressão do aparelho) ou baixar em planilha (CSV). */

let relPeriod = "mes";
const REL_PERIODS = [["mes","Este mês",1],["tri","Últimos 3 meses",3],["sem","Últimos 6 meses",6],["ano","Últimos 12 meses",12]];

function relMonths(){
  const n = (REL_PERIODS.find(p => p[0] === relPeriod) || REL_PERIODS[0])[2];
  return Array.from({ length:n }, (_, i) => addM(finMonth, i - n + 1));
}
function relData(){
  const months = relMonths(), first = months[0], last = months[months.length - 1];
  const per = months.map(m => { const c = finCalc(m); return { m, entradas:c.received || c.renda, saidas:c.spent + (m >= curYM() ? c.fixedPendSum + c.instSum : 0), benef:c.benef || 0 }; });
  const tx = fintx.filter(t => t.month >= first && t.month <= last).sort((a,b) => (a.month + a.date) < (b.month + b.date) ? -1 : 1);
  const out = tx.filter(t => t.type === "saida");
  const byCat = {}; for (const t of out) byCat[t.cat] = (byCat[t.cat] || 0) + t.amount;
  for (const m of months) if (m >= curYM()) for (const p of finCalc(m).instM) byCat[p.cat || "Compras"] = (byCat[p.cat || "Compras"] || 0) + p.amount;
  const byPay = {}; for (const t of out) { const k = t.method === "credito" ? (t.card || "Cartão de crédito") : (METHODS[t.method] || t.method || "Outro"); byPay[k] = (byPay[k] || 0) + t.amount; }
  const ahead = instAhead().filter(p => p.month > last);
  const entradas = sum(per, p => p.entradas), saidas = sum(per, p => p.saidas);
  return { months, first, last, per, tx, byCat, byPay, ahead, entradas, saidas, sobra: entradas - saidas };
}
function relLabel(d){ return d.months.length === 1 ? ymLabel(d.first) : `${ymLabel(d.first)} a ${ymLabel(d.last)}`; }
const relPct = (v, t) => t ? (v / t * 100).toFixed(0).replace(".", ",") + "%" : "—";

function relBody(d){
  const n = d.months.length, budgets = fincfg.budgets || {};
  const wrap = h("div",{class:"report"});
  wrap.append(h("div",{class:"rp-head"},
    h("div",null, h("div",{class:"eyebrow"},"Relatório financeiro"), h("h2",{class:"t"}, relLabel(d).replace(/^./, c => c.toUpperCase()))),
    h("div",{class:"muted small"}, `${userName || PERFIL.nome || ""}${userName || PERFIL.nome ? " · " : ""}gerado em ${new Date().toLocaleDateString("pt-BR")}`)));
  const kp = h("div",{class:"rp-kpis"});
  const k = (l, v, s, cls) => h("div",{class:"rp-k" + (cls ? " " + cls : "")}, h("span",null,l), h("b",null,v), s ? h("small",null,s) : null);
  kp.append(k("Entradas", brl(d.entradas), d.per.some(p => p.benef) ? `inclui ${brl(sum(d.per, p => p.benef))} de benefícios por dia` : null),
    k("Saídas", brl(d.saidas), n > 1 ? `média de ${brl(d.saidas / n)} por mês` : null),
    k(d.sobra >= 0 ? "Sobrou" : "Faltou", brl(Math.abs(d.sobra)), relPct(Math.abs(d.sobra), d.entradas) + " das entradas", d.sobra >= 0 ? "pos" : "neg"),
    k("Parcelas depois do período", brl(sum(d.ahead, p => p.amount)), d.ahead.length ? plural(d.ahead.length, "parcela", "parcelas") : "nenhuma"));
  wrap.append(kp);

  const cats = Object.entries(d.byCat).sort((a,b) => b[1] - a[1]), totCat = sum(cats, c => c[1]);
  const tc = h("table",{class:"rp-t"}, h("thead",null, h("tr",null, h("th",null,"Categoria"), h("th",{class:"n"},"Gasto"), h("th",{class:"n"},"Limite"), h("th",{class:"n"},"Do total"))));
  const tb = h("tbody"); cats.forEach(([c, v]) => { const lim = (+budgets[c] || 0) * n, over = lim && v > lim;
    tb.append(h("tr",{class: over ? "over" : ""}, h("td",null, h("span",{class:"rp-bar",style:`--w:${Math.max(2, v / (cats[0][1] || 1) * 100).toFixed(1)}%`}), c),
      h("td",{class:"n"}, brl(v)), h("td",{class:"n"}, lim ? brl(lim) + (over ? " ↑" : "") : "—"), h("td",{class:"n"}, relPct(v, totCat)))); });
  tc.append(tb); wrap.append(h("h3",{class:"rp-h"},"Para onde foi o dinheiro"), cats.length ? tc : h("p",{class:"empty"},"Nenhum gasto no período."));
  if (cats.some(([c, v]) => (+budgets[c] || 0) && v > (+budgets[c]) * n)) wrap.append(h("p",{class:"muted small"},"↑ passou do limite definido para a categoria."));

  if (n > 1) {
    const tm = h("table",{class:"rp-t"}, h("thead",null, h("tr",null, h("th",null,"Mês"), h("th",{class:"n"},"Entradas"), h("th",{class:"n"},"Saídas"), h("th",{class:"n"},"Sobra"))));
    const b = h("tbody"); d.per.forEach(p => b.append(h("tr",null, h("td",null, ymLabel(p.m)), h("td",{class:"n"}, brl(p.entradas)), h("td",{class:"n"}, brl(p.saidas)), h("td",{class:"n " + (p.entradas - p.saidas < 0 ? "neg" : "")}, brl(p.entradas - p.saidas)))));
    tm.append(b); wrap.append(h("h3",{class:"rp-h"},"Mês a mês"), tm);
  }

  const pays = Object.entries(d.byPay).sort((a,b) => b[1] - a[1]);
  if (pays.length) { const tp = h("table",{class:"rp-t"}, h("thead",null, h("tr",null, h("th",null,"Forma de pagamento"), h("th",{class:"n"},"Valor"), h("th",{class:"n"},"Do total"))));
    const b = h("tbody"); const tt = sum(pays, p => p[1]); pays.forEach(([kk, v]) => b.append(h("tr",null, h("td",null, kk), h("td",{class:"n"}, brl(v)), h("td",{class:"n"}, relPct(v, tt))))); tp.append(b);
    wrap.append(h("h3",{class:"rp-h"},"Por cartão e forma de pagamento"), tp); }

  if (d.ahead.length) {
    const g = {}; d.ahead.forEach(p => { const kk = normDesc(p.desc) + "|" + p.n + "|" + Math.round(p.amount); (g[kk] = g[kk] || { desc:p.desc, n:p.n, amount:p.amount, card:p.card, rest:0, last:"" }); g[kk].rest++; if (p.month > g[kk].last) g[kk].last = p.month; });
    const ta = h("table",{class:"rp-t"}, h("thead",null, h("tr",null, h("th",null,"Compra parcelada"), h("th",{class:"n"},"Parcela"), h("th",{class:"n"},"Faltam"), h("th",{class:"n"},"Até"), h("th",{class:"n"},"Total"))));
    const b = h("tbody"); Object.values(g).sort((a,b) => b.amount*b.rest - a.amount*a.rest).forEach(x => b.append(h("tr",null, h("td",null, x.desc), h("td",{class:"n"}, brl(x.amount)), h("td",{class:"n"}, String(x.rest)), h("td",{class:"n"}, ymLabel(x.last, true)), h("td",{class:"n"}, brl(x.amount * x.rest)))));
    ta.append(b); wrap.append(h("h3",{class:"rp-h"},"Parcelas que continuam depois do período"), ta);
  }

  const tl = h("table",{class:"rp-t rp-tx"}, h("thead",null, h("tr",null, h("th",null,"Data"), h("th",null,"Descrição"), h("th",null,"Categoria"), h("th",null,"Pagamento"), h("th",{class:"n"},"Valor"))));
  const b = h("tbody"); d.tx.forEach(t => b.append(h("tr",null, h("td",null, t.date ? t.date.slice(8) + "/" + t.date.slice(5,7) + (t.month !== t.date.slice(0,7) ? "*" : "") : ""),
    h("td",null, t.desc + (t.inst && t.inst.n > 1 ? ` (${t.inst.k}/${t.inst.n})` : "")), h("td",null, t.cat), h("td",null, t.method === "credito" ? (t.card || "Crédito") : (METHODS[t.method] || t.method || "")),
    h("td",{class:"n " + (t.type === "entrada" ? "pos" : "")}, (t.type === "entrada" ? "+ " : "") + brl(t.amount)))));
  tl.append(b); wrap.append(h("h3",{class:"rp-h"}, `Lançamentos (${d.tx.length})`), d.tx.length ? tl : h("p",{class:"empty"},"Nenhum lançamento no período."));
  if (d.tx.some(t => t.date && t.month !== t.date.slice(0,7))) wrap.append(h("p",{class:"muted small"},"* data da compra; o valor conta no mês da cobrança."));
  const an = d.months.length === 1 && finAn[d.first] && finAn[d.first].text;
  if (an) wrap.append(h("h3",{class:"rp-h"},"Análise da ÍRIS"), h("p",{class:"rp-an"}, an));
  return wrap;
}

function relCSV(d){
  const q = v => { const s = String(v == null ? "" : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const num = v => (Math.round(v * 100) / 100).toFixed(2).replace(".", ",");
  const rows = [["Data da compra","Mês da cobrança","Descrição","Categoria","Tipo","Forma","Cartão","Parcela","Valor (R$)"]];
  d.tx.forEach(t => rows.push([t.date || "", t.month || "", t.desc, t.cat, t.type === "entrada" ? "Entrada" : "Gasto", METHODS[t.method] || t.method || "", t.card || "", t.inst && t.inst.n > 1 ? `${t.inst.k}/${t.inst.n}` : "", num(t.type === "entrada" ? t.amount : -t.amount)]));
  return "﻿" + rows.map(r => r.map(q).join(";")).join("\r\n");
}
function relDownload(d){
  const blob = new Blob([relCSV(d)], { type:"text/csv;charset=utf-8" }), url = URL.createObjectURL(blob);
  const a = h("a",{ href:url, download:`iris-financeiro-${d.first}${d.months.length > 1 ? "-a-" + d.last : ""}.csv` }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000); toast("Planilha baixada. Abre no Excel, Numbers ou Google Planilhas.");
}
function relPrint(d){
  let pr = $("printRoot"); if (pr) pr.remove();
  pr = h("div",{id:"printRoot"}, relBody(d)); document.body.append(pr);
  document.documentElement.classList.add("print-report");
  const done = () => { document.documentElement.classList.remove("print-report"); const x = $("printRoot"); if (x) x.remove(); removeEventListener("afterprint", done); };
  addEventListener("afterprint", done);
  setTimeout(() => { try { window.print(); } catch { done(); toast("Este aparelho não abriu a impressão. Use Baixar planilha."); } }, 60);
}

function finRel(root){
  const d = relData();
  const bar = h("div",{class:"card rp-bar-c"},
    h("div",{class:"rp-ctl"},
      h("div",{class:"rp-per",role:"group","aria-label":"Período do relatório"}, ...REL_PERIODS.map(([k, l]) => h("button",{type:"button",class:"chip" + (relPeriod === k ? " on" : ""),"aria-pressed":String(relPeriod === k),onclick:()=>{ relPeriod = k; renderFin(); }}, l))),
      h("div",{class:"rp-act"},
        h("button",{class:"btn",type:"button",onclick:()=>relPrint(d)},"Salvar em PDF"),
        h("button",{class:"btn ghost",type:"button",onclick:()=>relDownload(d)},"Baixar planilha"))),
    h("p",{class:"muted small",style:"margin:10px 0 0"}, `Período: ${relLabel(d)}. Use as setas do mês lá em cima para mudar o mês final. Em "Salvar em PDF", escolha "Salvar como PDF" ou compartilhe na tela de impressão.`));
  root.append(bar, h("div",{class:"card"}, relBody(d)));
}
