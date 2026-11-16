"use strict";
/* ÍRIS · Interface: central de aprovações e registro do que a ÍRIS fez. */

const ORIGIN_LABEL = { conversa:"Conversa", esvaziar:"Esvaziar a mente", voz:"Voz" };
const STATUS_LABEL = { pendente:"Esperando você", aprovada:"Aprovada", recusada:"Recusada", executada:"Feita", falhou:"Não deu certo" };
const ACTOR_LABEL = { ia:"ÍRIS", natalia:"Você", conector:"Conector", sistema:"Sistema" };
const whenFmt = new Intl.DateTimeFormat("pt-BR",{ timeZone:TZ, day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
const whenOf = iso => { try { return whenFmt.format(new Date(iso)); } catch { return ""; } };
let apBusy = false;

async function renderApprovals(){
  const v = $("v-aprovacoes"); if (!v || !window.irisPermissions || !window.irisSb) return;
  if (!v.childElementCount) v.append(h("div",{class:"empty"},"Carregando…"));
  let data, hist;
  try { [data, hist] = await Promise.all([irisPermissions.list(), irisPermissions.history(20)]); }
  catch { v.textContent = ""; v.append(h("div",{class:"empty"},"Não consegui abrir a central agora. Confira a conexão e tente de novo.")); return; }
  if (current !== "aprovacoes") return;
  v.textContent = "";
  v.append(h("div",{class:"area-h"},
    h("div",null, h("div",{class:"eyebrow"},"Permissões"), h("h1",{class:"t"},"Aprovações"),
      h("p",{class:"lede"},"O que a ÍRIS preparou e só faz depois do seu sim. Ações em serviços de fora sempre passam por aqui, e também qualquer pedido que surgiu depois de ela ler um e-mail.")),
    h("div",{class:"area-stat"}, h("div",null, h("b",null,String(data.pending.length)), h("span",null,"esperando você")))));

  const grid = h("div",{class:"area-grid"});
  const pend = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Esperando você")));
  if (!data.pending.length) pend.append(h("div",{class:"empty"},"Nada esperando aprovação."));
  else { const ul = h("ul",{class:"items"});
    for (const p of data.pending) ul.append(h("li",{class:"item ap"},
      h("div",{style:"min-width:0"}, h("span",{class:"ttl",style:"text-decoration:none;color:var(--ink)"}, p.title),
        h("div",{class:"meta"}, `${ORIGIN_LABEL[p.origin] || p.origin} · ${whenOf(p.created_at)}`),
        p.reason ? h("div",{class:"meta"}, p.reason) : null),
      h("div",{class:"row-end",style:"margin-top:0;flex-wrap:wrap"},
        h("button",{class:"btn ghost",type:"button",onclick:e => decideProposal(p, false, e.currentTarget)},"Recusar"),
        h("button",{class:"btn olive",type:"button",onclick:e => decideProposal(p, true, e.currentTarget)},"Aprovar"))));
    pend.append(ul); }
  grid.append(pend);

  const recent = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Decididas")));
  if (!data.recent.length) recent.append(h("div",{class:"empty"},"Nenhuma decisão ainda."));
  else { const ul = h("ul",{class:"items"});
    for (const p of data.recent) ul.append(h("li",{class:"item ap"},
      h("div",{style:"min-width:0"}, h("span",{class:"ttl",style:"text-decoration:none;color:var(--ink)"}, p.title),
        h("div",{class:"meta"}, `${STATUS_LABEL[p.status] || p.status} · ${whenOf(p.decided_at || p.created_at)}${p.status === "falhou" && p.result && p.result.erro ? " · " + p.result.erro : ""}`))));
    recent.append(ul); }
  grid.append(recent);

  const log = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"O que foi feito")),
    h("p",{class:"sec-intro"},"Registro de tudo o que a ÍRIS fez ou propôs e do que você decidiu. Ele não pode ser editado nem apagado pelo app."));
  if (!hist.length) log.append(h("div",{class:"empty"},"Nada registrado ainda."));
  else { const ul = h("ul",{class:"items"});
    for (const a of hist) ul.append(h("li",{class:"item ap"},
      h("div",{style:"min-width:0"}, h("span",{class:"ttl",style:"text-decoration:none;color:var(--ink)"}, auditText(a)),
        h("div",{class:"meta"}, `${ACTOR_LABEL[a.actor] || a.actor} · ${whenOf(a.at)}`))));
    log.append(ul); }
  grid.append(log);
  v.append(grid);
}

function auditText(a){
  const d = a.detail || {}; const act = String(a.action || "");
  if (act === "aprovou") return "Aprovou: " + (d.title || "uma proposta");
  if (act === "recusou") return "Recusou: " + (d.title || "uma proposta");
  if (act.startsWith("propos:")) return "Propôs: " + (d.title || act.slice(7));
  if (act.startsWith("falhou:")) return "Não deu certo: " + act.slice(7) + (d.erro ? " (" + d.erro + ")" : "");
  return irisPermissions.describe(act, d.args || {});
}

async function decideProposal(p, approve, btn){
  if (apBusy) return; apBusy = true;
  const row = btn && btn.closest("li"); if (row) row.querySelectorAll("button").forEach(b => { b.disabled = true; });
  try {
    const r = await irisPermissions.decide(p, approve);
    toast(!approve ? "Proposta recusada." : r.ok ? "Feito: " + p.title + "." : "Não deu certo: " + r.error);
  } catch { toast("Não consegui registrar a decisão. Tente de novo."); }
  apBusy = false; refreshApprovalsBadge(); renderApprovals();
}

async function refreshApprovalsBadge(){
  if (!window.irisPermissions || !window.irisSb) return;
  const n = await irisPermissions.count(); const b = $("apN");
  if (b) { b.textContent = n ? String(n) : ""; b.hidden = !n; }
}
addEventListener("iris:aprovacoes", () => { refreshApprovalsBadge(); if (current === "aprovacoes") renderApprovals(); });
