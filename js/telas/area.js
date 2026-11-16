"use strict";
/* ÍRIS · Interface: áreas. */

/* ---------- ÁREA ---------- */
function renderArea(key){
  const cfg = AREAS[key]; const v = $("v-"+key); v.textContent = "";
  const w = doneThisWeek(key); const open = pending(key).length;
  v.append(h("div",{class:"area-h"},
    h("div",null, h("div",{class:"eyebrow"},"Área"), h("h1",{class:"t"}, cfg.label), h("p",{class:"lede"}, cfg.intro)),
    h("div",{class:"area-stat"},
      h("div",null, h("b",null,String(w.count)), h("span",null,"feitos na semana")),
      h("div",null, h("b",null,String(open)), h("span",null,"em aberto")))));
  const grid = h("div",{class:"area-grid"});
  for (const s of cfg.secs){
    const card = h("div",{class:"card"}, h("div",{class:"card-h"}, h("h2",{class:"t"}, s.label)), h("p",{class:"sec-intro"}, s.intro));
    if (s.kind === "ritual"){
      const list = items.filter(it => it.area === key && it.kind === "ritual");
      const ul = h("ul",{class:"items"});
      list.forEach(it => { const on = isRitualDoneToday(it); const wk = (it.doneDates||[]).filter(d => d >= weekStart()).length;
        ul.append(h("li",{class:"item"+(on?" done":"")}, checkBtn(on, (on?"Desmarcar hoje: ":"Fiz hoje: ")+it.title, ()=>toggleRitual(it)),
          h("div",null, h("span",{class:"ttl",style:"text-decoration:none;color:var(--ink)"}, it.title), h("div",{class:"meta"}, `${wk}× nesta semana`)),
          h("div",{class:"acts"}, h("button",{class:"ib",type:"button","aria-label":"Remover",title:"Remover",onclick:()=>removeItem(it.id)}, icon("i-trash"))))); });
      card.append(list.length ? ul : h("div",{class:"empty"}, "Nenhum ritual ainda."));
    } else {
      const open = items.filter(it => it.area === key && it.kind === s.kind && !it.done && !(it.date && it.date < today()));
      open.sort((a,b) => (b.focus-a.focus) || ((a.date||"9999") < (b.date||"9999") ? -1 : 1));
      const doneW = items.filter(it => it.area === key && it.kind === s.kind && it.done && it.doneAt && dayFmt.format(new Date(it.doneAt)) >= weekStart());
      const ul = h("ul",{class:"items"});
      open.forEach(it => ul.append(itemRow(it, { expandSteps: !!s.steps, canSplit: !!s.steps })));
      card.append(open.length ? ul : h("div",{class:"empty"}, "Nada em aberto aqui."));
      if (doneW.length){
        const det = h("details",{style:"margin-top:10px"}, h("summary",{class:"muted small",style:"cursor:pointer"}, `${doneW.length} concluído${doneW.length===1?"":"s"} nesta semana`));
        const ul2 = h("ul",{class:"items"}); doneW.forEach(it => ul2.append(itemRow(it, {}))); det.append(ul2); card.append(det);
      }
    }
    // formulário
    const inId = `in-${key}-${s.kind}`, dId = `dt-${key}-${s.kind}`;
    const form = h("form",{class:"add",autocomplete:"off"},
      h("input",{type:"text",id:inId,placeholder:s.ph,"aria-label":s.ph}),
      s.dated ? h("input",{type:"date",id:dId,"aria-label":"Data (opcional)"}) : null,
      h("button",{class:"btn ghost",type:"submit",style:"padding:7px 14px"},"Adicionar"));
    form.addEventListener("submit", async e => { e.preventDefault(); const t = $(inId).value.trim(); if (!t) return;
      const date = s.dated ? ($(dId).value || null) : null; $(inId).value = ""; if (s.dated) $(dId).value = "";
      await addItem({ area:key, kind:s.kind, title:t, date }); $(inId).focus(); });
    card.append(form);
    grid.append(card);
  }
  v.append(grid);

  // ficou para trás
  const behind = items.filter(it => it.area === key && !it.done && it.kind !== "ritual" && it.date && it.date < today());
  if (behind.length){
    const c = h("div",{class:"card later"}, h("div",{class:"card-h"}, h("h2",{class:"t"},"Ficou para trás, e tudo bem"), h("span",{class:"hint"},"escolha uma nova data ou tire a data")));
    const ul = h("ul",{class:"items"});
    behind.forEach(it => { const row = itemRow(it, { showKind:true });
      row.children[1].append(h("div",{class:"resched"},
        h("button",{type:"button",onclick:()=>updateItem(it.id,{date:today()})},"hoje"),
        h("button",{type:"button",onclick:()=>updateItem(it.id,{date:addDays(today(),1)})},"amanhã"),
        h("button",{type:"button",onclick:()=>updateItem(it.id,{date:addDays(today(),7)})},"semana que vem"),
        h("button",{type:"button",onclick:()=>updateItem(it.id,{date:null})},"sem data")));
      ul.append(row); });
    c.append(ul); v.append(c);
  }
}
