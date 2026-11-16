"use strict";
/* ÍRIS · Interface: temporizadores. */

/* ---------- TEMPO (temporizadores) ---------- */
let timers = store.get("iris.timers", []).filter(t => t.end > Date.now() - 3600e3);
let audioCtx = null;
function chime(){
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [[523.25,0],[659.25,0.35],[783.99,0.7]].forEach(([f,off]) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = "sine"; o.frequency.value = f;
      const t0 = audioCtx.currentTime + off; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
      o.connect(g).connect(audioCtx.destination); o.start(t0); o.stop(t0 + 1.25); });
  } catch {}
}
function saveTimers(){ store.set("iris.timers", timers); }
function startTimer(min, label){
  const m = Math.max(1, Math.min(600, Math.round(Number(min) || 0))); if (!m) return null;
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume && audioCtx.resume(); } catch {}
  timers.push({ id:newId(), label:String(label || "Lembrete").slice(0,80), min:m, end:Date.now() + m*60000, done:false });
  saveTimers(); renderTimers(); return { ok:true, minutos:m };
}
function renderTimers(){
  const ul = $("timers"); if (!ul) return; ul.textContent = "";
  timers.forEach(t => {
    const c = 2*Math.PI*10;
    ul.append(h("li",{class:"timer"+(t.done?" done":""),"data-id":t.id},
      h("div",{class:"lbl"}, t.label, h("small",null, t.done ? "terminou" : `${t.min} min`)),
      h("b",{class:"rem"}, "--:--"),
      h("button",{class:"ib",type:"button","aria-label":t.done?"Dispensar":"Cancelar",title:t.done?"Dispensar":"Cancelar",onclick:()=>{ timers = timers.filter(x => x.id !== t.id); saveTimers(); renderTimers(); }}, icon(t.done ? "i-check" : "i-trash"))));
  });
  tickTimers();
}
function tickTimers(){
  let changed = false;
  for (const t of timers){
    const left = Math.max(0, t.end - Date.now());
    if (!t.done && left === 0){ t.done = true; changed = true; chime();
      const msg = t.label === "Foco" || t.label === "Foco longo" ? "Tempo de foco concluído. Levanta, bebe uma água, respira." : t.label === "Pausa" ? "A pausa terminou. Volte quando estiver pronta." : `Lembrete: ${t.label}.`;
      toast(msg); addMsg("ai", msg); speak(msg); }
    const el = document.querySelector(`.timer[data-id="${t.id}"] .rem`);
    if (el) el.textContent = t.done ? "00:00" : `${String(Math.floor(left/60000)).padStart(2,"0")}:${String(Math.floor(left/1000)%60).padStart(2,"0")}`;
  }
  if (changed) { saveTimers(); renderTimers(); }
}
setInterval(tickTimers, 1000);
document.querySelectorAll("[data-t]").forEach(b => b.onclick = () => startTimer(b.dataset.t, b.dataset.l));
$("tForm").onsubmit = e => { e.preventDefault(); const m = $("tMin").value; if (!m) { $("tMin").focus(); return; } startTimer(m, $("tLbl").value.trim() || "Lembrete"); $("tMin").value = ""; $("tLbl").value = ""; };
