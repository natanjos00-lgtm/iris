"use strict";
/* ÍRIS · Interface: esvaziar a mente. */

/* ---------- ESVAZIAR A MENTE (modo dedicado) ---------- */
function openMind(){
  const slot = $("dlgSlot"); slot.textContent = "";
  let rec = null, listening = false;
  const close = () => { try { rec && rec.stop(); } catch {} stopSpeaking(); slot.textContent = ""; document.body.style.overflow = ""; };
  const draft = store.get("iris.mindDraft", "");
  const ta = h("textarea",{class:"mindta",id:"mindTa",placeholder:"Pode ser tudo misturado: o que precisa fazer, o que está te preocupando, ideias, prazos…","aria-label":"O que está na sua cabeça"}, draft);
  const micHint = h("p",{class:"muted small",id:"mindHint",style:"margin:0"}, "Escreva ou use o microfone do teclado para ditar.");
  const micBtn = h("button",{class:"btn ghost micb",type:"button",hidden:true}, "Falar");
  const out = h("div",{id:"mindRes"});
  const go = h("button",{class:"btn olive",type:"button"},"Pronto, organizar");
  const sheet = h("div",{class:"mindsheet",role:"dialog","aria-modal":"true","aria-labelledby":"mindT"},
    h("div",{class:"mind-in"},
      h("div",{class:"mind-top"}, h("span",{class:"eyebrow"},"Esvaziar a mente"), h("button",{class:"link",type:"button",onclick:close},"fechar")),
      h("h2",{class:"t mind-h",id:"mindT"}, `Pode falar, ${userName}.`),
      h("p",{class:"lede",style:"margin:0 0 18px"},"Sem ordem e sem filtro. Quando terminar, eu separo o que é ação, organizo por área e você escolhe o que guardar."),
      ta,
      h("div",{class:"mind-acts"}, micBtn, micHint, h("span",{style:"flex:1"}), go),
      out));
  slot.append(sheet); document.body.style.overflow = "hidden";
  ta.addEventListener("input", () => store.set("iris.mindDraft", ta.value));
  sheet.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 50);
  const SRc = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SRc) {
    micBtn.hidden = false; micHint.textContent = "Toque em Falar e vá dizendo. Eu escrevo enquanto você fala.";
    micBtn.onclick = () => {
      if (listening) { try { rec.stop(); } catch {} return; }
      try { rec = new SRc(); rec.lang = "pt-BR"; rec.continuous = true; rec.interimResults = true;
        let base = ta.value ? ta.value.replace(/\s*$/, " ") : "";
        rec.onstart = () => { listening = true; micBtn.textContent = "Parar"; micBtn.classList.add("on"); };
        rec.onresult = e => { let fin = "", tmp = ""; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript + " "; else tmp += r[0].transcript; }
          if (fin) base += fin; ta.value = base + tmp; store.set("iris.mindDraft", base); ta.scrollTop = ta.scrollHeight; };
        rec.onerror = e => { if (/not-allowed|service-not-allowed/.test(e.error)) { micBtn.hidden = true; micHint.textContent = "O microfone da página não está liberado aqui. Use o microfone do teclado para ditar."; } };
        rec.onend = () => { listening = false; micBtn.textContent = "Falar"; micBtn.classList.remove("on"); };
        rec.start();
      } catch { micBtn.hidden = true; micHint.textContent = "Use o microfone do teclado para ditar."; }
    };
  }
  go.onclick = async () => {
    try { rec && rec.stop(); } catch {}
    const txt = ta.value.trim(); out.textContent = "";
    if (!txt) { ta.focus(); return; }
    if (!sample) { out.append(h("div",{class:"empty",style:"margin-top:14px"},"Organizar precisa do Claude, disponível ao abrir a página no claude.ai.")); return; }
    go.disabled = true; go.textContent = "Organizando…";
    out.append(h("div",{class:"muted small",style:"margin-top:14px"},"Lendo com calma…"));
    try {
      const res = await sample.json(`Você é a ÍRIS, assistente pessoal acolhedora e sincera de ${userName}, estudante de Psicologia em Salvador. Ela acabou de esvaziar a mente no texto abaixo.
1) "acolhimento": 1 ou 2 frases curtas e naturais reconhecendo o que ela trouxe (se houver preocupação ou cansaço, reconheça sem minimizar e sem frase motivacional genérica).
2) "itens": transforme o que é ação em itens claros e curtos. Para cada item: area (pessoal|trabalho|faculdade) e tipo: ritual, compromisso ou objetivo (pessoal); tarefa, projeto ou reuniao (trabalho); estudo, atividade ou prova (faculdade). Data AAAA-MM-DD se houver (hoje é ${today()}), senão null. Títulos de até 10 palavras, começando por verbo quando for ação. Junte duplicados. Não transforme desabafo em tarefa. Máximo 12.
3) "comecar": o índice do item que faz mais sentido fazer primeiro (o que tem prazo mais perto ou destrava os outros), ou null.
Responda só com JSON: {"acolhimento":"...","itens":[{"titulo":"...","area":"...","tipo":"...","data":null}],"comecar":0}
Texto:
"""${txt.slice(0,6000)}"""`, { modelTier:"quick", cache:false });
      out.textContent = "";
      const list = (Array.isArray(res && res.itens) ? res.itens : []).filter(x => x && x.titulo && KIND_AREA[x.tipo]).slice(0,12)
        .map(x => ({ title:String(x.titulo).slice(0,200), kind:x.tipo, area:KIND_AREA[x.tipo], date:/^\d{4}-\d{2}-\d{2}$/.test(String(x.data||"")) ? x.data : null }));
      const first = Number.isInteger(res && res.comecar) && res.comecar >= 0 && res.comecar < list.length ? res.comecar : null;
      const hug = String((res && res.acolhimento) || "").slice(0,400);
      if (hug) { out.append(h("div",{class:"iris-line",style:"margin-top:18px"}, h("b",null,"ÍRIS"), h("p",null, hug))); if (voiceOn) speak(hug); }
      if (!list.length) { out.append(h("div",{class:"empty",style:"margin-top:12px"},"Não encontrei ações para guardar, e tudo bem. Às vezes só colocar para fora já ajuda. Se quiser conversar sobre isso, é só abrir a conversa."),
        h("div",{class:"row-end"}, h("button",{class:"btn ghost",type:"button",onclick:()=>{ store.set("iris.mindDraft",""); close(); location.hash = "#iris"; }},"Conversar com a ÍRIS"))); return; }
      const box = h("div",{class:"proposal"}, h("div",{class:"muted small"},"Desmarque o que não quiser guardar:"));
      list.forEach((x, i) => box.append(h("label",{for:"mp"+i,class: i === first ? "first" : null}, h("input",{type:"checkbox",id:"mp"+i,checked:true}),
        h("span",null, x.title, h("span",{class:"meta",style:"display:flex"}, i === first ? h("span",{class:"tag",style:"color:var(--olive)"},"por onde começar") : null, h("span",{class:"tag"}, h("span",{class:"dot",style:`background:${AREAS[x.area].color}`}), AREAS[x.area].label), h("span",{class:"tag"}, KIND_LABEL[x.kind]), x.date ? h("span",{class:"tag"}, prettyDay(x.date)) : null)))));
      const save = async (focusFirst) => { let n = 0;
        for (let i = 0; i < list.length; i++) if ($("mp"+i).checked) { const canFocus = focusFirst && i === first && items.filter(x => x.focus && !x.done).length < 3; await addItem({ ...list[i], focus: canFocus }); n++; }
        store.set("iris.mindDraft", ""); close(); toast(n ? `${n} ${n===1?"item guardado":"itens guardados"} nas suas áreas. Mente um pouco mais leve.` : "Nada guardado."); };
      box.append(h("div",{class:"row-end"},
        h("button",{class:"btn ghost",type:"button",onclick:()=>save(false)},"Guardar selecionados"),
        first !== null ? h("button",{class:"btn olive",type:"button",onclick:()=>save(true)},"Guardar e pôr o primeiro no foco") : null));
      out.append(box);
    } catch (e) { out.textContent = ""; out.append(h("div",{class:"empty",style:"margin-top:14px"}, aiMsg(e, "Não consegui organizar agora. Seu texto continua salvo aqui; tente de novo em instantes."))); }
    finally { go.disabled = false; go.textContent = "Pronto, organizar"; }
  };
}
