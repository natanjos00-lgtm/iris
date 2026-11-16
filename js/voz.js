"use strict";
/* ÍRIS · Interface de voz: preferências, fala, núcleo animado, microfone. */

/* ---------- PREFERÊNCIAS DA ÍRIS (nome e voz) ---------- */
let prefs = Object.assign({ name:"", voiceURI:"", rate:1, pitch:1, engine:"device", gemVoice:"Kore" }, store.get("iris.prefs", {}));
function applyName(){ userName = (prefs.name || "Natália").trim(); }
applyName();
function scoreVoice(v){ let s = 0; if (/pt-BR/i.test(v.lang)) s += 20; else if (/^pt/i.test(v.lang)) s += 8;
  if (/natural|neural|online|premium|enhanced|aprimorad/i.test(v.name)) s += 8; if (/google/i.test(v.name)) s += 5;
  if (/luciana|francisca|thalita|vit[oó]ria|maria|female|feminin/i.test(v.name)) s += 3; if (v.localService === false) s += 1; return s; }
function ptVoices(){ try { return speechSynthesis.getVoices().filter(v => /^pt/i.test(v.lang)).sort((a,b) => scoreVoice(b) - scoreVoice(a)); } catch { return []; } }
function pickVoice(){ const vs = ptVoices(); return (prefs.voiceURI && vs.find(v => v.voiceURI === prefs.voiceURI)) || vs[0] || null; }
function forSpeech(text){
  let t = String(text).replace(/[*_#`>]/g, "").replace(/\p{Extended_Pictographic}/gu, "");
  const n = userName; if (n && n.length <= 4) t = t.replace(new RegExp("\\b" + n + "\\b", "gi"), n.charAt(0).toUpperCase() + n.slice(1).toLowerCase());
  return t;
}
function voiceUtter(text){ const u = new SpeechSynthesisUtterance(forSpeech(text)); u.lang = "pt-BR"; u.rate = +prefs.rate || 1; u.pitch = +prefs.pitch || 1; const v = pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } return u; }
/* fala mais natural: texto pensado para voz, frases em partes, pausas e pequenas variações */
const SPOKEN = "\nEsta resposta será lida em voz alta. Escreva como fala uma pessoa próxima: frases curtas, pausas marcadas por vírgulas e pontos, um conector de conversa de vez em quando (olha, então, tá, ah) sem exagero, valores arredondados e falados (uns trezentos reais), horários do jeito falado (às duas da tarde). Nada de listas, siglas ou símbolos.";
function toSpoken(text){
  let t = forSpeech(text);
  t = t.replace(/R\$\s?([\d.]+),(\d{2})/g, (m, a, b) => b === "00" ? `${a} reais` : `${a} reais e ${+b} centavos`).replace(/R\$\s?([\d.]+)/g, "$1 reais");
  t = t.replace(/\b(\d{1,2})h(\d{2})\b/g, "$1 e $2").replace(/\b(\d{1,2})h\b/g, "$1 horas").replace(/\bmin\b/g, "minutos");
  t = t.replace(/\s[·•|—–]\s/g, ", ").replace(/[()]/g, ", ").replace(/\n+\s*[-•]\s*/g, ". ").replace(/\n+/g, ". ");
  t = t.replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").replace(/,\s*,/g, ",").replace(/([.!?])\s*[.,]/g, "$1").replace(/,\s*([.!?])/g, "$1").replace(/:\s/g, ", ");
  return t.trim();
}
function speechChunks(t){
  const parts = t.match(/[^.!?…]+[.!?…]*/g) || [t]; const out = [];
  for (let p of parts) { p = p.trim(); if (!p) continue;
    if (p.length <= 130) { out.push(p); continue; }
    let buf = ""; for (const s of p.split(/(?<=[,;])\s+/)) { if (buf && (buf + " " + s).length > 110) { out.push(buf.trim()); buf = s; } else buf += " " + s; }
    if (buf.trim()) out.push(buf.trim()); }
  return out;
}
let speakToken = 0;
function speakNatural(text, { onstart, onend, onboundary, over } = {}){
  const my = ++speakToken; try { speechSynthesis.cancel(); } catch {}
  const P = Object.assign({}, prefs, over || {});
  const list = speechChunks(toSpoken(text)); let i = 0, started = false;
  const next = () => {
    if (my !== speakToken) return;
    if (i >= list.length) { onend && onend(); return; }
    const s = list[i++]; const u = new SpeechSynthesisUtterance(s); u.lang = "pt-BR";
    const v = (P.voiceURI && ptVoices().find(x => x.voiceURI === P.voiceURI)) || pickVoice(); if (v) { u.voice = v; u.lang = v.lang; }
    const r = +P.rate || 1, pt = +P.pitch || 1;
    u.rate = Math.max(0.6, Math.min(1.6, r * (0.96 + Math.random()*0.07) * (s.length < 35 ? 0.96 : 1)));
    u.pitch = Math.max(0.5, Math.min(1.6, /\?$/.test(s) ? pt * 1.07 : pt * (0.97 + Math.random()*0.05)));
    u.onstart = () => { if (!started) { started = true; onstart && onstart(); } };
    u.onboundary = () => { onboundary && onboundary(); };
    u.onend = () => { if (my !== speakToken) return; setTimeout(next, /[.!?…]$/.test(s) ? 240 + Math.random()*220 : 120 + Math.random()*80); };
    u.onerror = () => { if (my === speakToken) { speakToken++; onend && onend(); } };
    try { speechSynthesis.speak(u); } catch { onend && onend(); }
  };
  next();
  return () => started;
}
function stopSpeaking(){ speakToken++; try { speechSynthesis.cancel(); } catch {} if (curSrc) { try { curSrc.stop(); } catch {} curSrc = null; } }
/* ---------- VOZ NATURAL (Speko) ---------- */
const PREMIUM = [
  { key:"luana", label:"Luana · brasileira, natural", voice:"pt-BR-Luana:MAI-Voice-2.1", allow:"azure:MAI-Voice-2.1" },
  { key:"ana", label:"Ana Paula · brasileira, calorosa", voice:"1cf751f6-8749-43ab-98bd-230dd633abdb", allow:"cartesia:sonic-3.5" },
  { key:"alice", label:"Alice · brasileira, serena", voice:"9904416a-0831-44ea-b8ee-5f145e8f9bbf", allow:"cartesia:sonic-3.5" },
  { key:"sarah", label:"Sarah · madura e acolhedora", voice:"EXAVITQu4vr4xnSDxMaL", model:"eleven_v3_conversational", allow:"elevenlabs" }
];
let actx = null, analyser = null, curSrc = null, premiumBroken = false, levelBuf = null;
function ensureAudio(){
  try { if (!actx) { actx = new (window.AudioContext || window.webkitAudioContext)(); analyser = actx.createAnalyser(); analyser.fftSize = 512; analyser.connect(actx.destination); levelBuf = new Uint8Array(analyser.fftSize); }
    if (actx.state === "suspended") actx.resume(); } catch {}
}
function unlockAudio(){
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}
  ensureAudio();
  try { if (actx && !unlockAudio.a) { const s0 = actx.createBufferSource(); s0.buffer = actx.createBuffer(1,1,22050); s0.connect(actx.destination); s0.start(0); unlockAudio.a = true; } } catch {}
  try { if (!unlockAudio.t && "speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); unlockAudio.t = true; } } catch {}
}
["pointerdown","touchstart","touchend","click"].forEach(ev => addEventListener(ev, unlockAudio, { passive:true }));
function audioLevel(){ if (!analyser || !curSrc) return 0; analyser.getByteTimeDomainData(levelBuf); let s = 0; for (const v of levelBuf) { const d = (v - 128)/128; s += d*d; } return Math.sqrt(s / levelBuf.length); }
const GEM_VOICES = [["Kore","Kore (firme e clara)"],["Leda","Leda (jovem e suave)"],["Aoede","Aoede (leve)"],["Zephyr","Zephyr (brilhante)"],["Sulafat","Sulafat (calorosa)"],["Achernar","Achernar (suave)"],["Vindemiatrix","Vindemiatrix (gentil)"],["Callirrhoe","Callirrhoe (tranquila)"]];
function usePremium(P){ return P.engine === "gemini" && !premiumBroken && !!window.irisSb; }
function premiumChunks(t){ const sents = speechChunks(t); const out = []; let buf = "";
  for (const s of sents) { if (buf && (buf + " " + s).length > 240) { out.push(buf); buf = s; } else buf = buf ? buf + " " + s : s; }
  if (buf) out.push(buf); return out; }
async function synthChunk(text, P){
  const { data, error } = await window.irisSb.functions.invoke("tts", { body:{ text, voice:P.gemVoice || "Kore" } });
  if (error || !data || !data.audio_base64) {
    let detail = ""; try { const j = error && error.context ? await error.context.json() : (data || {}); detail = j.detail || j.error || ""; } catch {}
    throw { code:"no_audio", detail };
  }
  const bin = atob(data.audio_base64); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  if (/^audio\/(l16|pcm)/i.test(data.mime || "") ) { // PCM cru 16 bits, 24 kHz, mono
    const n = Math.floor(bytes.length / 2), buf = actx.createBuffer(1, n, 24000), ch = buf.getChannelData(0), dv = new DataView(bytes.buffer);
    for (let k = 0; k < n; k++) ch[k] = dv.getInt16(k*2, true) / 32768;
    return buf;
  }
  return await new Promise((res, rej) => actx.decodeAudioData(bytes.buffer, res, rej)); // forma com callback: funciona também em Safari antigo
}
function playBuffer(buf){ return new Promise(res => { const src = actx.createBufferSource(); src.buffer = buf; src.connect(analyser); curSrc = src; src.onended = () => { if (curSrc === src) curSrc = null; res(); }; src.start(); }); }
async function speakPremium(text, { onstart, onend, over } = {}){
  const my = ++speakToken; try { speechSynthesis.cancel(); } catch {} if (curSrc) { try { curSrc.stop(); } catch {} curSrc = null; }
  const P = Object.assign({}, prefs, over || {}); ensureAudio();
  const parts = premiumChunks(toSpoken(text)); let started = false;
  try {
    let next = synthChunk(parts[0], P);
    for (let i = 0; i < parts.length; i++) {
      const buf = await next; if (my !== speakToken) return;
      next = i + 1 < parts.length ? synthChunk(parts[i+1], P) : null;
      if (!started) { started = true; onstart && onstart(); }
      await playBuffer(buf); if (my !== speakToken) return;
    }
    onend && onend();
  } catch (e) {
    if (my !== speakToken) return;
    if (!started) { premiumBroken = true;
      toast("A voz do Gemini não respondeu agora" + (e && e.detail ? " (" + String(e.detail).slice(0,90) + ")" : "") + ". Usei a voz do aparelho.");
      speakNatural(text, { onstart, onend, over }); }
    else onend && onend();
  }
}
function speakAny(text, opts = {}){ const P = Object.assign({}, prefs, opts.over || {}); if (usePremium(P)) { speakPremium(text, opts); return () => true; } return speakNatural(text, opts); }

async function savePrefs(p){
  prefs = Object.assign({}, prefs, p); store.set("iris.prefs", prefs); applyName();
  if (finMeta) { try { await finMeta.doc("prefs").set(JSON.parse(JSON.stringify(prefs))); } catch {} }
  renderView(); hello();
}
function openPrefs(){
  const slot = $("dlgSlot"); slot.textContent = ""; const close = () => { stopSpeaking(); slot.textContent = ""; };
  const vs = ptVoices();
  const sel = h("select",{id:"pVoice"}, vs.length ? vs.map((v, i) => opt(v.voiceURI, `${v.name}${i === 0 ? " (recomendada)" : ""}`, (prefs.voiceURI || (vs[0] && vs[0].voiceURI)) === v.voiceURI)) : [opt("","Nenhuma voz em português neste aparelho")]);
  const rateOut = h("span",{class:"muted small"}), pitchOut = h("span",{class:"muted small"});
  const f = h("form",{class:"dlg",role:"dialog","aria-modal":"true","aria-labelledby":"prT",autocomplete:"off"},
    h("h2",{class:"t",id:"prT"},"Configurações"),
    h("div",null, h("div",{class:"muted small",style:"margin-bottom:6px"},"Tema da interface"),
      h("div",{class:"themeopt",id:"themeOpt"}, [["light","Claro","i-sun"],["dark","Escuro","i-moon"],["auto","Dispositivo","i-contrast"]].map(([k,l,ic]) => h("button",{type:"button","aria-pressed":String(themeMode() === k),onclick:e => { themeSet(k); document.querySelectorAll("#themeOpt button").forEach(b => b.setAttribute("aria-pressed","false")); e.currentTarget.setAttribute("aria-pressed","true"); }}, icon(ic), l)))),
    h("label",null,"Como ela te chama", h("input",{type:"text",id:"pName",value:userName,placeholder:"Natália"})),
    h("p",{class:"muted small",style:"margin:-6px 0 0"},"Escreva do jeito que você quer ouvir. Nomes muito curtos, como Nat, às vezes são soletrados pela voz do aparelho; nesse caso, prefira o nome completo."),
    h("div",{class:"muted small",style:"display:flex;gap:10px;align-items:center;flex-wrap:wrap"}, h("button",{class:"btn ghost",type:"button",id:"pTest",style:"padding:6px 12px;font-size:12.5px"},"Testar o Gemini"), h("span",{id:"pTestOut"})),
    h("label",null,"Tipo de voz", h("select",{id:"pEngine"}, opt("device","Voz do aparelho (grátis, sem internet)", prefs.engine !== "gemini"), opt("gemini","Voz natural do Gemini (usa sua chave)", prefs.engine === "gemini"))),
    h("label",null,"Voz do Gemini", h("select",{id:"pGem"}, GEM_VOICES.map(([k,l]) => opt(k, l, (prefs.gemVoice || "Kore") === k)))),
    h("label",null,"Voz do aparelho", sel),
    h("p",{class:"muted small",style:"margin:-6px 0 0"},"Grátis: usa as vozes do seu celular ou navegador. As marcadas como Natural, Online ou Google costumam soar melhor."),
    h("label",null, h("span",null,"Velocidade ", rateOut), h("input",{type:"range",id:"pRate",min:"0.8",max:"1.25",step:"0.05",value:prefs.rate || 1})),
    h("label",null, h("span",null,"Tom ", pitchOut), h("input",{type:"range",id:"pPitch",min:"0.8",max:"1.2",step:"0.05",value:prefs.pitch || 1})),
    h("div",{class:"row-end",style:"margin-top:4px"},
      h("button",{class:"btn ghost",type:"button",style:"margin-right:auto",onclick:()=>{ const nm = $("pName").value.trim() || "Natália";
        ensureAudio(); speakAny(`Oi, ${nm}. Tudo bem? Então, é assim que eu vou falar com você. Se não gostar, a gente ajusta junto, tá?`, { over:{ engine:$("pEngine").value, gemVoice:$("pGem").value, voiceURI:$("pVoice").value, rate:+$("pRate").value, pitch:+$("pPitch").value } }); }},"Ouvir exemplo"),
      h("button",{class:"btn ghost",type:"button",onclick:close},"Cancelar"),
      h("button",{class:"btn olive",type:"submit"},"Salvar")));
  const sync = () => { rateOut.textContent = (+$("pRate").value).toFixed(2).replace(".",",") + "×"; pitchOut.textContent = (+$("pPitch").value).toFixed(2).replace(".",","); };
  const ov = h("div",{class:"overlay",onclick:e=>{ if (e.target === ov) close(); }}, f); slot.append(ov);
  $("pTest").onclick = async () => { const o = $("pTestOut"); o.textContent = "Testando…"; try { const r = await sample([{ role:"user", content:"Responda só com a palavra: ok" }], {}); o.textContent = "Gemini respondeu: " + String(r.text).slice(0,40); } catch (e) { o.textContent = "Falhou: " + ((e && e.detail) || (e && e.code) || "erro desconhecido"); } };
  $("pRate").oninput = sync; $("pPitch").oninput = sync; sync();
  ov.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  f.onsubmit = async e => { e.preventDefault(); premiumBroken = false; await savePrefs({ name:$("pName").value.trim(), engine:$("pEngine").value, gemVoice:$("pGem").value, voiceURI:$("pVoice").value, rate:+$("pRate").value, pitch:+$("pPitch").value }); close(); toast("Ajustes da ÍRIS salvos."); };
  setTimeout(() => $("pName").focus(), 0);
}
try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => { const s = $("pVoice"); if (!s) return; const vs = ptVoices(); if (!vs.length) return; const cur = s.value || prefs.voiceURI; s.textContent = ""; vs.forEach((v, i) => s.append(opt(v.voiceURI, `${v.name}${i === 0 ? " (recomendada)" : ""}`, cur ? cur === v.voiceURI : i === 0))); }; } catch {}

/* ---------- NÚCLEO (toque para ouvir a ÍRIS) ---------- */
const cv = $("reactor"), cx2 = cv.getContext("2d"), wv = $("waves"), wx2 = wv ? wv.getContext("2d") : null;
let energy = 0.18, target = 0.18, coreMode = "idle", spike = 0, coreSpeaking = false, coreAbort = null, coreW = 0, wvW = 0, wvH = 0;
const reduceM = matchMedia("(prefers-reduced-motion: reduce)").matches;
function sizeCore(){ const r = cv.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1); coreW = r.width; cv.width = Math.max(1, r.width*dpr); cv.height = Math.max(1, r.width*dpr); cx2.setTransform(dpr,0,0,dpr,0,0); }
function sizeWaves(){ if (!wv) return; const r = wv.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1); wvW = r.width; wvH = r.height; wv.width = Math.max(1, r.width*dpr); wv.height = Math.max(1, r.height*dpr); wx2.setTransform(dpr,0,0,dpr,0,0); }
addEventListener("resize", () => { sizeCore(); sizeWaves(); });
function setCore(m){ coreMode = m; target = m === "think" ? 0.6 : m === "speak" ? 1 : m === "listen" ? 0.8 : 0.18; $("core").classList.toggle("live", m !== "idle"); }
function drawCore(ts){
  requestAnimationFrame(drawCore);
  if ($("v-inicio").hidden) return;
  const W = cv.getBoundingClientRect().width; if (!W) return; if (Math.abs(W - coreW) > 0.5) sizeCore();
  if (wv) { const r = wv.getBoundingClientRect(); if (Math.abs(r.width - wvW) > 0.5 || Math.abs(r.height - wvH) > 0.5) sizeWaves(); }
  const dark = document.documentElement.dataset.theme === "dark";
  const c = W/2, R = W*0.47; cx2.clearRect(0,0,W,W);
  energy += (target - energy) * 0.05; spike *= 0.9;
  if (coreMode === "speak") { if (curSrc) spike = Math.max(spike, Math.min(1.2, audioLevel()*5)); else if (Math.random() < 0.09) spike = Math.max(spike, 0.5 + Math.random()*0.5); }
  if (coreMode === "listen" && Math.random() < 0.12) spike = Math.max(spike, 0.4 + Math.random()*0.5);
  const sp = reduceM ? 0 : ts/1000, e = Math.min(1.4, energy + spike*0.45);
  const pulse = 1 + Math.sin(sp*(1.4 + e*4)) * 0.025 * (0.4 + e);
  const gold = dark ? "238,178,100" : "166,112,58", hot = dark ? "255,218,160" : "196,132,66";
  const L = a => Math.min(1, a);
  const ring = (r, al, lw, dx, dy) => { cx2.strokeStyle = `rgba(${gold},${L(al)})`; cx2.lineWidth = lw; cx2.beginPath(); cx2.arc(c + (dx||0)*R, c + (dy||0)*R, R*r*pulse, 0, Math.PI*2); cx2.stroke(); };
  const glowArc = (r, a0, a1, lw, al, blur) => { cx2.save(); cx2.strokeStyle = `rgba(${hot},${L(al*0.16)})`; cx2.lineWidth = lw*4.5; cx2.lineCap = "round"; cx2.beginPath(); cx2.arc(c,c,R*r*pulse,a0,a1); cx2.stroke(); cx2.shadowColor = `rgba(${hot},${L(al)})`; cx2.shadowBlur = blur; cx2.strokeStyle = `rgba(${hot},${L(al)})`; cx2.lineWidth = lw; cx2.lineCap = "round"; cx2.beginPath(); cx2.arc(c,c,R*r*pulse,a0,a1); cx2.stroke(); cx2.restore(); };
  // fundo suave atrás dos anéis
  const bgG = cx2.createRadialGradient(c, c, R*0.2, c, c, R*0.98);
  if (dark) { bgG.addColorStop(0, "rgba(34,22,13,.85)"); bgG.addColorStop(0.75, "rgba(58,38,21,.55)"); bgG.addColorStop(1, "rgba(58,38,21,0)"); }
  else { bgG.addColorStop(0, "rgba(255,250,240,.9)"); bgG.addColorStop(0.75, "rgba(240,226,203,.55)"); bgG.addColorStop(1, "rgba(240,226,203,0)"); }
  cx2.fillStyle = bgG; cx2.beginPath(); cx2.arc(c,c,R*0.98,0,Math.PI*2); cx2.fill();
  // anéis finos, levemente deslocados
  cx2.lineCap = "round";
  ring(0.99, dark ? 0.30 : 0.32, 1);
  ring(0.935, dark ? 0.40 : 0.38, 1, -0.008, 0.01);
  ring(0.88, dark ? 0.34 : 0.34, 1, 0.012, 0);
  ring(0.80, dark ? 0.55 : 0.5, 1.4);
  ring(0.745, dark ? 0.30 : 0.3, 1, -0.01, -0.006);
  // pontilhado em rotação lenta
  cx2.save(); cx2.setLineDash([1.1, 5.2]); cx2.lineDashOffset = -sp*3; ring(0.67, dark ? 0.7 : 0.6, 1.5); cx2.restore();
  ring(0.60, dark ? 0.55 : 0.5, 1.3, 0.006, 0.004);
  ring(0.52, dark ? 0.42 : 0.4, 1.1, -0.01, 0.008);
  // arcos luminosos (crescem quando a ÍRIS ouve ou fala)
  const dr = Math.sin(sp*0.22)*0.18 + sp*0.015, k = 0.85 + e*0.4;
  glowArc(0.80, -1.45 + dr, -0.2 + dr + 0.3*e, 3, 0.95*k, 30);
  glowArc(0.80, 2.15 + dr, 3.1 + dr + 0.4*e, 3.2, 0.9*k, 30);
  glowArc(0.935, 3.45 + dr*0.6, 3.95 + dr*0.6 + 0.25*e, 2.4, 0.9*k, 20);
  glowArc(0.745, 0.15 - dr, 0.95 - dr + 0.3*e, 2.2, 0.7*k, 18);
  glowArc(0.60, -1.3 - dr, -0.55 - dr, 1.6, 0.6*k, 10);
  // disco interno com brilho quente embaixo
  const ir = R*0.395*(1 + Math.sin(sp*(1.2 + e*4))*0.012*(0.5 + e) + spike*0.03);
  cx2.save(); cx2.beginPath(); cx2.arc(c,c,ir,0,Math.PI*2); cx2.clip();
  const inG = cx2.createRadialGradient(c, c + ir*0.75, 0, c, c + ir*0.75, ir*1.25);
  if (dark) { inG.addColorStop(0, `rgba(210,130,50,${0.55 + e*0.3})`); inG.addColorStop(0.55, "rgba(90,52,24,.45)"); inG.addColorStop(1, "rgba(26,17,10,.95)"); }
  else { inG.addColorStop(0, `rgba(222,160,90,${0.55 + e*0.3})`); inG.addColorStop(0.55, "rgba(246,230,205,.7)"); inG.addColorStop(1, "rgba(255,251,244,.96)"); }
  cx2.fillStyle = inG; cx2.fillRect(c-ir, c-ir, ir*2, ir*2); cx2.restore();
  cx2.save(); cx2.shadowColor = `rgba(${hot},${0.5 + e*0.4})`; cx2.shadowBlur = W*0.02; cx2.strokeStyle = `rgba(${hot},${dark ? 0.85 : 0.75})`; cx2.lineWidth = 1.6; cx2.beginPath(); cx2.arc(c,c,ir,0,Math.PI*2); cx2.stroke(); cx2.restore();
  // ondas que se expandem ao ouvir / pensar / falar
  if (coreMode !== "idle"){
    for (let q = 0; q < 3; q++){ const ph = ((sp*(coreMode === "think" ? 0.3 : 0.6) + q/3) % 1);
      cx2.strokeStyle = `rgba(${hot},${(1 - ph)*0.5})`; cx2.lineWidth = 1.4; cx2.beginPath(); cx2.arc(c,c,ir + (R*0.99 - ir)*ph,0,Math.PI*2); cx2.stroke(); }
  }
  drawWaves(sp, e, dark, gold);
}
/* fios de onda que atravessam a tela atrás do círculo */
function drawWaves(sp, e, dark, gold){
  if (!wx2 || !wvW) return; const wW = wvW, wH = wvH; wx2.clearRect(0,0,wW,wH);
  const box = cv.getBoundingClientRect(), hb = wv.getBoundingClientRect();
  const cxp = box.left - hb.left + box.width/2, cyp = box.top - hb.top + box.height/2, rr = box.width*0.47*0.74;
  const lines = 5;
  for (let k = 0; k < lines; k++){
    wx2.beginPath(); let first = true;
    wx2.strokeStyle = `rgba(${gold},${(dark ? 0.34 : 0.3) * (1 - k*0.14)})`; wx2.lineWidth = k === 0 ? 1.3 : 0.8;
    for (let x = Math.max(0, cxp - wW*0.62); x <= Math.min(wW, cxp + rr*1.7); x += 6){
      const d = Math.abs(x - cxp);
      const fade = Math.min(1, d/(rr*0.9)) * (x < cxp ? Math.max(0, 1 - d/(wW*0.62)) : Math.max(0, 1 - d/(rr*1.7)));
      const y = cyp + fade*(wH*0.16)*(0.5 + e*0.8)*(Math.sin(x*0.011 + sp*(0.7 + k*0.15) + k*0.9) + 0.5*Math.sin(x*0.027 - sp*(1.1 + k*0.1) + k*1.3)) + (k-2)*fade*7;
      first ? (wx2.moveTo(x,y), first = false) : wx2.lineTo(x,y);
    }
    wx2.stroke();
  }
}
requestAnimationFrame(drawCore);
function localBrief(){
  const t = today(); const ev = calEvents.filter(e => e.day === t && !e.allDay); const focus = items.filter(it => it.focus && !it.done);
  let s = `${greet()}${userName ? ", " + userName : ""}. `;
  s += ev.length ? `Você tem ${ev.length === 1 ? "um compromisso" : ev.length + " compromissos"} hoje, o primeiro às ${ev[0].time}. ` : "Sua agenda está livre hoje. ";
  if (focus.length) s += `No foco: ${focus.map(f => f.title).slice(0,2).join(" e ")}. `;
  else { const nx = nextFor(); if (nx) s += `Se quiser um próximo passo, que tal: ${nx.title}? `; }
  const c = finCalc(curYM()); if (c.renda) s += c.free >= 0 ? `Ainda há ${brl0(c.free)} livres no mês. ` : `O mês está um pouco apertado; vale olhar o financeiro com calma. `;
  return s + "Estou por aqui.";
}
async function coreTalk(){
  if (coreSpeaking || coreMode === "think") { stopSpeaking(); coreAbort?.abort(); coreSpeaking = false; setCore("idle"); $("coreCap").textContent = "Toque para ouvir a ÍRIS"; return; }
  ensureAudio(); try { const u = new SpeechSynthesisUtterance(""); speechSynthesis.speak(u); } catch {}
  setCore("think"); $("coreCap").textContent = "Pensando no que te dizer…";
  let text = localBrief();
  if (sample) { coreAbort = new AbortController();
    try { const r = await sample(`${persona()}\n\nEla acabou de tocar no núcleo para ouvir você. Fale com ela em voz alta, em 2 a 4 frases curtas e naturais (no máximo 60 palavras): cumprimente pelo nome, diga como está o dia (compromissos e foco), traga uma observação útil das listas ou das finanças se houver algo relevante, e sugira um próximo passo possível. Sem listas, sem markdown, sem emojis.${SPOKEN}`, { modelTier:"quick", signal:coreAbort.signal, cache:{ gcTime:600000 } }); text = r.text.trim() || text; }
    catch (e) { if (e.code === "cancelled") return; } }
  $("coreCap").textContent = text;
  sayWithWaves(text);
}
function sayWithWaves(text){
  const end = () => { coreSpeaking = false; setCore("idle"); setTimeout(() => { if (!coreSpeaking && coreMode === "idle") $("coreCap").textContent = "Toque para ouvir a ÍRIS"; }, 8000); };
  coreSpeaking = true; setCore("speak");
  if (usePremium(prefs)) { speakPremium(text, { onend:end }); return; }
  if (!("speechSynthesis" in window)) { setTimeout(end, Math.min(16000, 600 + text.length*60)); return; }
  const did = speakNatural(text, { onboundary:() => { spike = 1; }, onend:end });
  setTimeout(() => { if (coreSpeaking && !did()) { stopSpeaking(); end(); } }, 3000);
}
$("core").addEventListener("click", coreTalk);



/* ---------- ouvir a Natália (microfone com estado claro) ---------- */
const SRx = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, recOn = false, recText = "", recTimer = null;
function listenShow(on, t, sub){ const el = $("listen"); if (!el) return; el.hidden = !on; if (t) $("lnT").textContent = t; $("lnS").textContent = sub || ""; document.querySelectorAll("#tabMic,#askMic,#orbMic").forEach(b => b.classList.toggle("on", !!on && recOn));
  try { if (on && recOn && coreMode === "idle") setCore("listen"); else if ((!on || !recOn) && coreMode === "listen") setCore("idle"); } catch {} }
function listenEnd(msg){ recOn = false; clearTimeout(recTimer); try { rec && rec.abort(); } catch {} rec = null; if (msg) { listenShow(true, msg.t, msg.s); setTimeout(() => { if (!recOn) listenShow(false); }, 3200); } else listenShow(false); }
function toggleListen(){
  if (recOn) { const t = recText.trim(); const r = rec; recOn = false; clearTimeout(recTimer); try { r && r.stop(); } catch {} if (!t) listenEnd({ t:"Não ouvi nada", s:"Toque no microfone e fale logo em seguida." }); return; }
  if (!SRx) { listenShow(true, "Este navegador não ouve a voz aqui", "Toque na barra de texto e use o microfone do teclado."); setTimeout(() => listenShow(false), 4200); if (current !== "inicio") location.hash = "#inicio"; setTimeout(() => $("askIn").focus(), 200); return; }
  try { stopSpeaking(); } catch {}
  recText = ""; let sent = false;
  try {
    rec = new SRx(); rec.lang = "pt-BR"; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    rec.onstart = () => { recOn = true; try { navigator.vibrate && navigator.vibrate(25); } catch {} listenShow(true, "Ouvindo…", "Pode falar. Toque no microfone para parar."); };
    rec.onresult = ev => { recText = Array.from(ev.results).map(x => x[0].transcript).join(" "); $("lnS").textContent = recText || "Pode falar."; };
    rec.onerror = e => { const c = e && e.error; recOn = false;
      if (c === "not-allowed" || c === "service-not-allowed") listenEnd({ t:"Microfone bloqueado", s:"Libere o microfone para este site nas configurações do navegador e tente de novo." });
      else if (c === "no-speech") listenEnd({ t:"Não ouvi nada", s:"Toque no microfone e comece a falar logo em seguida." });
      else if (c !== "aborted") listenEnd({ t:"Não consegui ouvir", s:"Tente de novo ou escreva na barra." }); };
    rec.onend = () => { const t = recText.trim(); const wasOn = recOn; recOn = false; clearTimeout(recTimer);
      if (t && !sent) { sent = true; listenShow(false); $("askIn").value = t; if (current !== "inicio") location.hash = "#inicio"; setTimeout(() => $("askbar").requestSubmit(), 80); }
      else if (wasOn && !t) listenEnd({ t:"Não ouvi nada", s:"Toque no microfone e comece a falar logo em seguida." });
      else listenShow(false); };
    rec.start(); recOn = true; listenShow(true, "Ouvindo…", "Pode falar. Toque no microfone para parar.");
    recTimer = setTimeout(() => { try { rec && rec.stop(); } catch {} }, 15000);
  } catch { listenEnd({ t:"Não consegui ligar o microfone", s:"Escreva na barra ou tente de novo." }); }
}
$("askMic").onclick = toggleListen;
$("lnStop").onclick = () => { if (recOn) toggleListen(); else listenShow(false); };
