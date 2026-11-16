"use strict";
/* ÍRIS · Interface: esfera neural em 3D (tela inicial) e fundo animado de todas as telas.
   A esfera é desenhada no canvas do núcleo (#reactor): filamentos e neurônios em dourado e rosa,
   que se montam ao abrir, giram em 360° com o dedo e reagem quando a ÍRIS ouve, pensa ou fala.
   Cada área é um neurônio na esfera; tocar nele ativa a área. Tocar no centro continua fazendo
   a ÍRIS falar com você. Com "reduzir movimento" ligado no aparelho, tudo fica parado. */

const NN_GOLD = [255, 184, 92], NN_PINK = [255, 79, 163];
const nnMix = (a, b, k) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * k));
const nnRgba = (c, a) => "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")";
const nnReduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const NN_KEYS = ["pessoal", "trabalho", "faculdade", "casa", "financeiro", "metas", "projetos", "biblioteca"];
const nn = { ry: 0, rx: -0.22, sel: 0, drag: null, moved: false, suppress: false, AP: [], last: 0, born: 0, geo: null };
try { const s = store.get("iris.nnSel", 0); if (s >= 0 && s < NN_KEYS.length) nn.sel = s; } catch {}

function nnLabel(k){ return k === "financeiro" ? "Finanças" : (AREAS[k] && AREAS[k].label) || k; }
function nnInfo(k){
  try {
    if (k === "financeiro") { const c = finCalc(curYM()); return c.renda ? `${brl0(c.free)} livres no mês` : "Configure sua renda"; }
    const n = pending(k).length; const hoje = pending(k).filter(it => it.date === today()).length;
    return hoje ? `${hoje} para hoje · ${n} em aberto` : n ? `${n} em aberto` : "Nada pendente";
  } catch { return ""; }
}

function nnGeometry(){
  let s = 9; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const nodes = Array.from({ length: 150 }, () => { const u = rnd() * 2 - 1, a = rnd() * 6.283, q = Math.sqrt(1 - u * u), rr = 0.82 + rnd() * 0.2; return { p: [Math.cos(a) * q * rr, u * rr, Math.sin(a) * q * rr], c: Math.pow(rnd(), 1.4), s: rnd() * 6, from: [(rnd() - 0.5) * 7, (rnd() - 0.5) * 7, (rnd() - 0.5) * 7], d: rnd() * 0.6 }; });
  const links = []; nodes.forEach((n, i) => { const ds = nodes.map((m, j) => [Math.hypot(n.p[0] - m.p[0], n.p[1] - m.p[1], n.p[2] - m.p[2]), j]).filter(d => d[1] !== i).sort((a, b) => a[0] - b[0]); for (const [, j] of ds.slice(0, 4)) if (i < j) links.push([i, j, rnd()]); });
  const basis = n => { const t = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]; let u = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]]; const l = Math.hypot(u[0], u[1], u[2]); u = u.map(v => v / l); return [u, [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]]]; };
  const arcs = Array.from({ length: 18 }, () => { const ax = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]; const l = Math.hypot(ax[0], ax[1], ax[2]); const b = basis(ax.map(v => v / l)); return { u: b[0], v: b[1], a0: rnd() * 6.283, len: 1 + rnd() * 2.6, r: 0.95 + rnd() * 0.12, c: Math.pow(rnd(), 1.4) }; });
  const lat = [0.35, -0.3, 0.05, -0.45, 0.4, -0.1, 0.2, -0.35];
  const areas = NN_KEYS.map((k, i) => { const t = i / NN_KEYS.length * 6.283, y = lat[i], r = Math.sqrt(1 - y * y); return { phi: t, p: [Math.cos(t) * r * 1.04, y * 1.04, Math.sin(t) * r * 1.04] }; });
  return { nodes, links, arcs, areas };
}

function nnTargetRy(){ const raw = nn.geo.areas[nn.sel].phi - Math.PI / 2; const k = Math.round((nn.ry - raw) / (2 * Math.PI)); return raw + k * 2 * Math.PI; }

/* chamado a cada quadro pelo núcleo (voz.js): e = energia da ÍRIS (0,18 parada; até ~1,4 falando) */
function drawNeural(x, W, sp, e, mode, spike){
  if (!nn.geo) { nn.geo = nnGeometry(); nn.ry = nnTargetRy() + 1.4; nn.born = sp; }
  const G = nn.geo, now = performance.now() / 1000, dt = Math.min(0.05, nn.last ? now - nn.last : 0.016); nn.last = now;
  if (!nn.drag) { const tr = nnTargetRy(); nn.ry += (tr - nn.ry) * Math.min(1, dt * 2.5); nn.rx += (-0.22 - nn.rx) * Math.min(1, dt * 2.5); }
  const t = nnReduce ? 10 : sp - nn.born;
  const R = W * 0.31 * Math.max(1, nnZ), CX = W / 2, CY = W * 0.45, F = W * 1.6, ry = nn.ry, rx = nn.rx, SEL = nn.sel;
  const cy = Math.cos(ry), sy = Math.sin(ry), cr = Math.cos(rx), sr = Math.sin(rx);
  const rot = p => { const X = p[0] * cy + p[2] * sy, Z = -p[0] * sy + p[2] * cy; return [X, p[1] * cr - Z * sr, p[1] * sr + Z * cr]; };
  const proj = v => { const s = F / (F - v[2] * R); return [CX + v[0] * R * s, CY + v[1] * R * s, s, v[2]]; };
  const ease = v => { const k = Math.min(1, Math.max(0, v)); return 1 - Math.pow(1 - k, 3); };
  const grow = ease((t - 0.2) / 1.8), act = Math.min(1.4, e);
  x.clearRect(0, 0, W, W);
  x.globalCompositeOperation = "lighter";
  const hg = x.createRadialGradient(CX, CY, 0, CX, CY, R * 1.55); hg.addColorStop(0, `rgba(255,130,120,${0.22 + act * 0.18})`); hg.addColorStop(0.6, "rgba(255,90,140,0.06)"); hg.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = hg; x.beginPath(); x.arc(CX, CY, R * 1.55, 0, 7); x.fill();
  for (const a of G.arcs) {
    x.beginPath();
    for (let k = 0; k <= 36; k++) { const th = a.a0 + t * 0.15 + a.len * grow * (k / 36); const p = [0, 1, 2].map(i => (a.u[i] * Math.cos(th) + a.v[i] * Math.sin(th)) * a.r); const P = proj(rot(p)); if (k) x.lineTo(P[0], P[1]); else x.moveTo(P[0], P[1]); }
    const col = nnMix(NN_GOLD, NN_PINK, a.c); x.strokeStyle = nnRgba(col, 0.12); x.lineWidth = 3; x.stroke(); x.strokeStyle = nnRgba(col, 0.45); x.lineWidth = 0.9; x.stroke();
  }
  const NP = G.nodes.map(n => { const k = ease((t - n.d) / 1.6); return proj(rot(n.p.map((v, i) => n.from[i] + (v - n.from[i]) * k))); });
  const speed = 0.6 * (1 + act * 1.6);
  for (const [i, j, w] of G.links) {
    const a = NP[i], b = NP[j], dep = Math.min(1, Math.max(0, ((a[3] + b[3]) / 2 + 1) / 2));
    const mx = (a[0] + b[0]) / 2 - (CX - (a[0] + b[0]) / 2) * 0.08, my = (a[1] + b[1]) / 2 - (CY - (a[1] + b[1]) / 2) * 0.08;
    const lc = nnMix(NN_GOLD, NN_PINK, G.nodes[i].c);
    x.beginPath(); x.moveTo(a[0], a[1]); x.quadraticCurveTo(mx, my, b[0], b[1]);
    x.strokeStyle = nnRgba(lc, (0.06 + 0.16 * dep) * grow); x.lineWidth = 3 + 2 * dep; x.stroke();
    x.strokeStyle = nnRgba(lc, (0.18 + 0.6 * dep + act * 0.1) * grow); x.lineWidth = 0.6 + 0.8 * dep; x.stroke();
    if (dep > 0.45 && !nnReduce) { const u = (t * speed + w) % 1; x.fillStyle = nnRgba([255, 236, 210], (0.7 + act * 0.2) * dep * grow); x.beginPath(); x.arc((1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * mx + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * my + u * u * b[1], 1.3, 0, 7); x.fill(); }
  }
  for (let i = 0; i < G.nodes.length; i++) {
    const p = NP[i], dep = Math.min(1, Math.max(0, (p[3] + 1) / 2)), tw = 0.6 + 0.4 * Math.sin(t * 2 + G.nodes[i].s), col = nnMix(NN_GOLD, NN_PINK, G.nodes[i].c), r = (1 + 2.2 * dep) * tw * (W / 440);
    const gg = x.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 5); gg.addColorStop(0, nnRgba(col, 0.55 * dep * grow)); gg.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gg; x.beginPath(); x.arc(p[0], p[1], r * 5, 0, 7); x.fill();
    x.fillStyle = nnRgba([255, 240, 220], 0.85 * dep * grow); x.beginPath(); x.arc(p[0], p[1], r * 0.7, 0, 7); x.fill();
  }
  const ra = R * 1.32, ag = x.createLinearGradient(CX - ra, CY, CX + ra, CY); ag.addColorStop(0, "rgba(255,184,92,0.85)"); ag.addColorStop(1, "rgba(255,79,163,0.85)");
  x.strokeStyle = ag; x.lineWidth = 1.6; x.beginPath(); x.arc(CX, CY, ra, -1.25 + t * 0.05, -1.25 + t * 0.05 + 5.1 * grow); x.stroke();
  const by = CY + R * 1.5;
  for (let k = 0; k < 5; k++) { const ph = nnReduce ? k / 5 : (t * (0.25 + act * 0.3) + k / 5) % 1, ex = R * 0.3 + ph * R * 1.3; x.strokeStyle = nnRgba(k % 2 ? NN_PINK : NN_GOLD, (1 - ph) * 0.7 * grow); x.lineWidth = 1.3; x.beginPath(); x.ellipse(CX, by, ex, ex * 0.16, 0, 0, 7); x.stroke(); }
  const bg2 = x.createRadialGradient(CX, by, 0, CX, by, R * 0.5); bg2.addColorStop(0, "rgba(255,200,120,0.55)"); bg2.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = bg2; x.beginPath(); x.ellipse(CX, by, R * 0.5, R * 0.1, 0, 0, 7); x.fill();
  const amp = 0.25 + act * 0.75 + (spike || 0) * 0.6, bw = W / 88;
  for (let k = -9; k <= 9; k++) { const hh = (R * 0.03 + R * 0.15 * amp * Math.abs(Math.sin(t * 3 + k * 0.7)) * Math.exp(-k * k / 30)) * grow; x.fillStyle = nnRgba(nnMix(NN_GOLD, NN_PINK, (k + 9) / 18), 0.9); x.fillRect(CX + k * bw * 2.2 - bw / 2, by - R * 0.25 - hh / 2, bw, hh); }
  const AP = G.areas.map((a, i) => proj(rot(a.p.map(v => v * ease((t - 1 - i * 0.05) / 1.2)))));
  nn.AP = AP;
  AP.map((p, i) => [p, i]).sort((a, b) => a[0][3] - b[0][3]).forEach(([p, i]) => {
    const sel = i === SEL, dep = Math.min(1, Math.max(0, (p[3] + 1) / 2)), al = (0.2 + 0.8 * dep) * ease((t - 1.2) / 1);
    const col = sel ? NN_PINK : NN_GOLD, r = (sel ? 6.5 : 4.2) * p[2] * (W / 440);
    const gg = x.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 5); gg.addColorStop(0, nnRgba(col, 0.65 * al)); gg.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gg; x.beginPath(); x.arc(p[0], p[1], r * 5, 0, 7); x.fill();
    x.fillStyle = nnRgba([255, 242, 230], al); x.beginPath(); x.arc(p[0], p[1], r * 0.8, 0, 7); x.fill();
    if (sel) { x.strokeStyle = nnRgba(NN_PINK, al); x.lineWidth = 1.1; x.beginPath(); x.arc(p[0], p[1], r + 9 + (nnReduce ? 0 : Math.sin(t * 4) * 2), 0, 7); x.stroke(); }
    if (dep > 0.55 || sel) {
      x.globalCompositeOperation = "source-over";
      const label = nnLabel(NN_KEYS[i]).toUpperCase(), fs = Math.max(10, Math.round(W / (sel ? 33 : 40)));
      x.font = `${sel ? 500 : 400} ${fs}px Jost, system-ui, sans-serif`;
      const tw2 = x.measureText(label).width; let lx = p[0] + r + 10; x.textAlign = "left";
      if (lx + tw2 > W - 6) { lx = p[0] - r - 10; x.textAlign = "right"; }
      x.lineJoin = "round"; x.lineWidth = 3.5; x.strokeStyle = nnRgba([12, 3, 10], 0.8 * al); x.strokeText(label, lx, p[1] + fs / 3);
      x.fillStyle = sel ? nnRgba([255, 214, 232], al) : nnRgba([246, 226, 210], al * 0.85); x.fillText(label, lx, p[1] + fs / 3);
      x.globalCompositeOperation = "lighter";
    }
  });
  x.globalCompositeOperation = "source-over";
}

/* área ativa: cartão e botões abaixo da esfera */
function nnSelect(i){
  nn.sel = (i + NN_KEYS.length) % NN_KEYS.length; store.set("iris.nnSel", nn.sel); nnRefresh();
}
function nnRefresh(){
  const k = NN_KEYS[nn.sel], nm = $("nnName"), inf = $("nnInfo"), go = $("nnGo"), ch = $("nnChips");
  if (nm) nm.textContent = nnLabel(k);
  if (inf) inf.textContent = nnInfo(k);
  if (go) { go.href = "#" + k; go.setAttribute("aria-label", "Abrir " + nnLabel(k)); }
  setTimeout(hbRefresh, 0);
  if (ch) {
    if (!ch.childElementCount) NN_KEYS.forEach((key, i) => ch.append(h("button", { type:"button", class:"nn-chip", "data-i":String(i), onclick:() => nnSelect(i) }, nnLabel(key))));
    ch.querySelectorAll(".nn-chip").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.i === nn.sel)));
  }
}

/* tamanho da esfera escolhido com os dedos: abaixo de 1 a caixa encolhe; acima de 1 a rede cresce dentro do anel */
const NN_ZMIN = 0.6, NN_ZMAX = 1.25;
let nnZ = (() => { try { const v = parseFloat(localStorage.getItem("iris.nnZoom")); return v >= NN_ZMIN && v <= NN_ZMAX ? v : 1; } catch { return 1; } })();
function nnZoom() { return nnZ; }
function nnSetZoom(z) {
  nnZ = Math.max(NN_ZMIN, Math.min(NN_ZMAX, z || 1)); if (Math.abs(nnZ - 1) < 0.03) nnZ = 1;
  const b = $("core") && $("core").parentElement; if (b) b.style.setProperty("--nnz", Math.min(1, nnZ).toFixed(3));
}
function nnSaveZoom() { try { localStorage.setItem("iris.nnZoom", String(nnZ)); } catch {} }

/* girar com o dedo; tocar num neurônio ativa a área; tocar no centro deixa a ÍRIS falar */
(function nnInput(){
  const core = $("core"), box = core && core.parentElement; if (!core) return;
  const toCanvas = ev => { const r = $("reactor").getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top, r.width]; };
  // pinça com dois dedos (ou Ctrl + roda / pinça no trackpad) aumenta e diminui a esfera
  const pts = new Map(); let pinch = null;
  const gap = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  const other = ev => { const b = ev.target.closest && ev.target.closest("button,a"); return b && b !== core; };
  box.addEventListener("pointerdown", ev => {
    if (other(ev) && !pts.size) return;
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pts.size === 2) { nn.drag = null; nn.suppress = true; pinch = { d: gap(), z: nnZoom() }; return; }
    nn.drag = { x: ev.clientX, y: ev.clientY, ry: nn.ry, rx: nn.rx, id: ev.pointerId }; nn.moved = false;
  });
  box.addEventListener("pointermove", ev => {
    if (pts.has(ev.pointerId)) pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && pts.size === 2) { const want = pinch.z * gap() / pinch.d; nnSetZoom(want); if (want > NN_ZMAX * 1.18) { pinch = null; pts.clear(); nnSaveZoom(); nnDeepEnter(); } return; }
    const d = nn.drag; if (!d || d.id !== ev.pointerId) return;
    const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
    if (!nn.moved && Math.hypot(dx, dy) > 6) { nn.moved = true; try { box.setPointerCapture(ev.pointerId); } catch {} }
    if (nn.moved) { const w = core.getBoundingClientRect().width || 300; nn.ry = d.ry + dx * (3.2 / w); nn.rx = Math.max(-1.2, Math.min(1.2, d.rx + dy * (2.2 / w))); }
  });
  const end = ev => {
    pts.delete(ev.pointerId); if (pinch) { if (pts.size < 2) { pinch = null; nnSaveZoom(); } return; }
    const d = nn.drag; if (!d) return; nn.drag = null;
    if (nn.moved) { nn.suppress = true; let bi = nn.sel, bz = -9; nn.AP.forEach((p, i) => { if (p[3] > bz) { bz = p[3]; bi = i; } }); nnSelect(bi); return; }
    if (ev.type !== "pointerup") return;
    const [px, py, w] = toCanvas(ev); let best = -1, bd = (w || 300) * 0.09;
    nn.AP.forEach((p, i) => { const dd = Math.hypot(p[0] - px, p[1] - py); if (dd < bd && p[3] > -0.2) { bd = dd; best = i; } });
    if (best >= 0 && best !== nn.sel) { nn.suppress = true; nnSelect(best); } // tocar no neurônio já ativo, ou no centro, faz a ÍRIS falar
  };
  box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
  // Safari no iPad/iPhone: o gesto de pinça chega como gesturestart/gesturechange (e impede o zoom da página)
  let gz = 0;
  box.addEventListener("gesturestart", ev => { ev.preventDefault(); gz = nnZoom(); }, { passive: false });
  box.addEventListener("gesturechange", ev => {
    ev.preventDefault(); if (pinch || !gz || nnDeep.on) return; nn.drag = null; nn.suppress = true;
    const want = gz * ev.scale; nnSetZoom(want); if (want > NN_ZMAX * 1.18) { gz = 0; nnSaveZoom(); nnDeepEnter(); }
  }, { passive: false });
  box.addEventListener("gestureend", ev => { ev.preventDefault(); if (gz) nnSaveZoom(); gz = 0; }, { passive: false });
  let wt = 0;
  let over = 0;
  box.addEventListener("wheel", ev => {
    if (!ev.ctrlKey) return; ev.preventDefault();
    const want = nnZoom() * Math.exp(-ev.deltaY * 0.01);
    if (want > NN_ZMAX) { over += want / NN_ZMAX - 1; if (over > 0.25) { over = 0; nnDeepEnter(); } } else over = 0;
    nnSetZoom(want); clearTimeout(wt); wt = setTimeout(() => { nnSaveZoom(); over = 0; }, 300);
  }, { passive: false });
  core.addEventListener("dblclick", ev => { if (nnZoom() !== 1) { ev.preventDefault(); nnSetZoom(1); nnSaveZoom(); } });
  nnSetZoom(nnZoom());
  const ent = $("nnEnter"); if (ent) ent.addEventListener("click", () => nnDeepEnter());
  box.addEventListener("click", ev => { if (nn.suppress) { nn.suppress = false; ev.stopPropagation(); ev.preventDefault(); } }, true);
  core.addEventListener("keydown", ev => { if (ev.key === "ArrowLeft") { ev.preventDefault(); nnSelect(nn.sel - 1); } else if (ev.key === "ArrowRight") { ev.preventDefault(); nnSelect(nn.sel + 1); } });
})();

/* entrar na ÍRIS: abrir a pinça além do máximo leva a câmera para dentro da esfera.
   Lá dentro as áreas ficam em volta de você; arraste para olhar, toque numa área para vê-la e abri-la,
   feche a pinça (ou toque no X, ou Esc) para sair. */
const nnDeep = { on: false, c: 2.4, target: 2.4, ry: 0, rx: 0, drag: null, moved: false, sel: -1, el: null, cv: null, x: null, W: 0, H: 0, last: 0, AP: [] };
function nnDeepFull(){ return nnDeep.on && nnDeep.c < 0.6; }
function nnDeepBuild(){
  if (nnDeep.el) return nnDeep.el;
  const el = h("div", { id: "nnDeep", class: "nn-deep", role: "dialog", "aria-modal": "true", "aria-label": "Dentro da ÍRIS", hidden: "" });
  const cv = h("canvas", { "aria-hidden": "true" });
  const x = h("button", { type: "button", class: "nd-x", "aria-label": "Sair de dentro da ÍRIS", onclick: () => nnDeepExit() }, icon("i-plus"));
  const hint = h("p", { class: "nd-hint" }, "Arraste para olhar · toque numa área ou no microfone · feche a pinça para sair");
  const card = h("div", { class: "nd-card glass", hidden: "" },
    h("span", { class: "nn-k" }, "Área"), h("b", { class: "nd-n" }), h("span", { class: "nd-i" }),
    h("a", { class: "btn nd-go", href: "#" }, "Abrir"));
  const mic = h("button", { type: "button", class: "nd-mic", "aria-label": "Falar com a ÍRIS", onclick: () => nnDeepTalk() }, icon("i-mic"));
  const say = h("div", { class: "nd-say glass", hidden: "", "aria-live": "polite" }, h("span", { class: "nn-k nd-who" }), h("p", { class: "nd-txt" }));
  const type = h("form", { class: "nd-type glass", hidden: "", autocomplete: "off" },
    h("input", { type: "text", class: "nd-in", placeholder: "Escreva para a ÍRIS…", "aria-label": "Escreva para a ÍRIS", enterkeyhint: "send" }),
    h("button", { type: "submit", class: "nd-send", "aria-label": "Enviar" }, icon("i-send")));
  type.addEventListener("submit", ev => { ev.preventDefault(); const i = type.querySelector(".nd-in"), v = i.value.trim(); if (!v) return; i.value = ""; i.blur(); nnDeepAsk(v); });
  card.querySelector(".nd-go").addEventListener("click", () => { nnDeep.on = false; nnDeepHide(); });
  el.append(cv, x, hint, say, card, type, mic); document.body.append(el);
  nnDeep.el = el; nnDeep.cv = cv; nnDeep.x = cv.getContext("2d");
  const pts = new Map(); let pinch = null;
  const gap = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  cv.addEventListener("pointerdown", ev => {
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pts.size === 2) { nnDeep.drag = null; pinch = gap(); return; }
    nnDeep.drag = { x: ev.clientX, y: ev.clientY, ry: nnDeep.ry, rx: nnDeep.rx, id: ev.pointerId }; nnDeep.moved = false;
  });
  cv.addEventListener("pointermove", ev => {
    if (pts.has(ev.pointerId)) pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && pts.size === 2) { if (gap() / pinch < 0.7) { pinch = null; pts.clear(); nnDeepExit(); } return; }
    const d = nnDeep.drag; if (!d || d.id !== ev.pointerId) return;
    const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
    if (!nnDeep.moved && Math.hypot(dx, dy) > 6) { nnDeep.moved = true; try { cv.setPointerCapture(ev.pointerId); } catch {} }
    if (nnDeep.moved) { const k = 2.6 / Math.min(nnDeep.W, nnDeep.H); nnDeep.ry = d.ry - dx * k; nnDeep.rx = Math.max(-1.1, Math.min(1.1, d.rx - dy * k)); }
  });
  const end = ev => {
    pts.delete(ev.pointerId); if (pinch) { if (pts.size < 2) pinch = null; return; }
    const d = nnDeep.drag; if (!d) return; nnDeep.drag = null;
    if (nnDeep.moved || ev.type !== "pointerup") return;
    let best = -1, bd = Math.min(nnDeep.W, nnDeep.H) * 0.12;
    nnDeep.AP.forEach((p, i) => { if (!p) return; const dd = Math.hypot(p[0] - ev.clientX, p[1] - ev.clientY); if (dd < bd) { bd = dd; best = i; } });
    if (best >= 0) nnDeepPick(best);
  };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  el.addEventListener("gesturestart", ev => ev.preventDefault(), { passive: false });
  el.addEventListener("gesturechange", ev => { ev.preventDefault(); if (nnDeep.on && ev.scale < 0.7) nnDeepExit(); }, { passive: false });
  cv.addEventListener("wheel", ev => { if (ev.ctrlKey && ev.deltaY > 4) { ev.preventDefault(); nnDeepExit(); } }, { passive: false });
  addEventListener("keydown", ev => { if (nnDeep.on && ev.key === "Escape") { ev.preventDefault(); nnDeepExit(); } });
  addEventListener("hashchange", () => { if (nnDeep.on) { nnDeep.on = false; nnDeepHide(); } });
  return el;
}
/* conversar lá dentro: ouve, mostra o que ela disse e a resposta, e fala, sem sair do cérebro */
function nnDeepSay(who, txt){
  const say = nnDeep.el && nnDeep.el.querySelector(".nd-say"); if (!say) return;
  if (who == null) { say.hidden = true; return; }
  say.querySelector(".nd-who").textContent = who; const p = say.querySelector(".nd-txt"); p.textContent = txt || ""; p.hidden = !txt;
  say.hidden = false; p.scrollTop = p.scrollHeight; const hn = nnDeep.el.querySelector(".nd-hint"); if (hn) hn.hidden = true;
}
function nnDeepMic(on){ const m = nnDeep.el && nnDeep.el.querySelector(".nd-mic"); if (m) { m.classList.toggle("on", !!on); m.setAttribute("aria-label", on ? "Parar de ouvir" : "Falar com a ÍRIS"); } }
function nnDeepTyping(msg){
  const f = nnDeep.el.querySelector(".nd-type"); f.hidden = false; nnDeep.el.classList.add("typing"); if (msg) nnDeepSay(msg[0], msg[1]);
  setTimeout(() => { try { f.querySelector(".nd-in").focus(); } catch {} }, 60);
}
function nnDeepTalk(){
  const D = nnDeep;
  if (D.rec) { try { D.rec.stop(); } catch {} return; }
  if (busy || coreSpeaking || coreMode === "speak") { try { ctl?.abort(); } catch {} stopSpeaking(); coreSpeaking = false; setCore("idle"); nnDeepSay(null); return; }
  try { unlockAudio(); stopSpeaking(); } catch {}
  const SRc = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SRc) { nnDeepTyping(["Este aparelho não me deixa ouvir aqui", "Escreva embaixo, ou use o microfone do teclado. Eu respondo falando."]); return; }
  let txt = "", r;
  try { r = new SRc(); } catch { nnDeepTyping(["Não consegui ligar o microfone", "Escreva embaixo que eu respondo falando."]); return; }
  r.lang = "pt-BR"; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1; D.rec = r;
  nnDeepMic(true); setCore("listen"); nnDeepSay("Ouvindo…", ""); try { navigator.vibrate && navigator.vibrate(25); } catch {}
  const timer = setTimeout(() => { try { r.stop(); } catch {} }, 15000);
  r.onresult = ev => { txt = Array.from(ev.results).map(x => x[0].transcript).join(" "); nnDeepSay("Você", txt); };
  r.onerror = ev => { const c = ev && ev.error; D.recErr = c;
    if (c === "not-allowed" || c === "service-not-allowed") nnDeepTyping(["Microfone bloqueado", "Libere o microfone para este site nas configurações, ou escreva embaixo."]); };
  r.onend = () => {
    clearTimeout(timer); D.rec = null; nnDeepMic(false); const t = txt.trim(), err = D.recErr; D.recErr = null;
    if (t) { nnDeepAsk(t); return; }
    if (coreMode === "listen") setCore("idle");
    if (err !== "not-allowed" && err !== "service-not-allowed" && err !== "aborted") nnDeepSay("Não ouvi nada", "Toque no microfone e fale logo em seguida.");
  };
  try { r.start(); } catch { D.rec = null; nnDeepMic(false); setCore("idle"); nnDeepTyping(["Não consegui ligar o microfone", "Escreva embaixo que eu respondo falando."]); }
}
function nnDeepAsk(t){
  nnDeepSay("Você", t); setCore("think");
  send(t, { voice: true,
    onText: s => { nnDeepSay("ÍRIS", s); },
    onDone: s => { nnDeepSay("ÍRIS", s); },
    onSpeakStart: () => { coreSpeaking = true; setCore("speak"); },
    onSpeakEnd: () => { coreSpeaking = false; if (coreMode === "speak" || coreMode === "think") setCore("idle"); },
    onFail: m => { setCore("idle"); nnDeepSay("ÍRIS", m); } });
}
function nnDeepPick(i){
  nnDeep.sel = i; nnSelect(i);
  const k = NN_KEYS[i], card = nnDeep.el.querySelector(".nd-card");
  card.querySelector(".nd-n").textContent = nnLabel(k); card.querySelector(".nd-i").textContent = nnInfo(k);
  const go = card.querySelector(".nd-go"); go.href = "#" + k; go.setAttribute("aria-label", "Abrir " + nnLabel(k));
  card.hidden = false; card.classList.remove("in"); void card.offsetWidth; card.classList.add("in");
  const raw = nn.geo.areas[i].phi + Math.PI / 2; nnDeep.turn = raw + Math.round((nnDeep.ry - raw) / (2 * Math.PI)) * 2 * Math.PI;
}
function nnDeepEnter(){
  if (nnDeep.on || !nn.geo) return;
  const el = nnDeepBuild(); nnDeep.on = true; nnDeep.sel = nn.sel; nnDeep.turn = null;
  nnDeep.ry = nn.geo.areas[nn.sel].phi + Math.PI / 2; nnDeep.rx = 0;
  nnDeep.c = nnReduce ? 0 : 2.4; nnDeep.target = 0; nnDeep.el.querySelector(".nd-card").hidden = true; nnDeep.el.querySelector(".nd-type").hidden = true; nnDeep.el.classList.remove("typing"); nnDeepSay(null); { const hn = nnDeep.el.querySelector(".nd-hint"); if (hn) { hn.hidden = false; hn.style.animation = "none"; void hn.offsetWidth; hn.style.animation = ""; } }
  el.hidden = false; el.classList.remove("out"); requestAnimationFrame(() => el.classList.add("in"));
  document.documentElement.classList.add("deep-on");
  const box = $("core") && $("core").parentElement; if (box) box.classList.add("diving");
  nnDeep.last = 0; requestAnimationFrame(nnDeepFrame);
  setTimeout(() => { try { nnDeep.el.querySelector(".nd-x").focus({ preventScroll: true }); } catch {} }, 400);
}
function nnDeepExit(){
  if (!nnDeep.on) return; nnDeep.on = false; nnDeep.target = 2.4;
  if (nnDeep.rec) { try { nnDeep.rec.abort(); } catch {} nnDeep.rec = null; nnDeepMic(false); if (coreMode === "listen") setCore("idle"); }
  nnSetZoom(1); nnSaveZoom();
  if (nnReduce) { nnDeepHide(); return; }
  nnDeep.el.classList.add("out"); nnDeep.el.classList.remove("in");
  const box = $("core") && $("core").parentElement; if (box) box.classList.remove("diving");
  setTimeout(() => { if (!nnDeep.on) nnDeepHide(); }, 650);
}
function nnDeepHide(){
  if (!nnDeep.el) return; nnDeep.el.hidden = true; nnDeep.el.classList.remove("in", "out");
  document.documentElement.classList.remove("deep-on");
  const box = $("core") && $("core").parentElement; if (box) box.classList.remove("diving");
  try { $("core").focus({ preventScroll: true }); } catch {}
}
function nnDeepFrame(ts){
  const D = nnDeep; if (D.el.hidden) return; requestAnimationFrame(nnDeepFrame);
  const now = ts / 1000, dt = Math.min(0.05, D.last ? now - D.last : 0.016); D.last = now;
  const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  if (W !== D.W || H !== D.H) { D.W = W; D.H = H; D.cv.width = W * dpr; D.cv.height = H * dpr; }
  const x = D.x; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  D.c += (D.target - D.c) * Math.min(1, dt * (D.on ? 1.9 : 3.2)); if (Math.abs(D.c - D.target) < 0.002) D.c = D.target;
  if (D.turn != null && !D.drag) { D.ry += (D.turn - D.ry) * Math.min(1, dt * 3); if (Math.abs(D.turn - D.ry) < 0.002) D.turn = null; }
  if (D.on && !D.drag && D.turn == null && !nnReduce) D.ry += dt * 0.025;
  if (!D.drag) D.rx += (0 - D.rx) * Math.min(1, dt * 0.8);
  const G = nn.geo, t = nnReduce ? 10 : now, CX = W / 2, CY = H * 0.46, f = Math.min(W, H) * 0.78;
  if (!D.dust) { let s = 21; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; D.dust = Array.from({ length: 240 }, () => { const u = rnd() * 2 - 1, a = rnd() * 6.283, q = Math.sqrt(1 - u * u), r = 0.18 + Math.pow(rnd(), 0.7) * 0.6; return { p: [Math.cos(a) * q * r, u * r, Math.sin(a) * q * r], c: rnd(), s: rnd() * 6, v: 0.4 + rnd() }; }); }
  const cy = Math.cos(D.ry), sy = Math.sin(D.ry), cr = Math.cos(D.rx), sr = Math.sin(D.rx);
  const rot = p => { const X = p[0] * cy + p[2] * sy, Z = -p[0] * sy + p[2] * cy; return [X, p[1] * cr - Z * sr, p[1] * sr + Z * cr]; };
  // câmera no eixo z, olhando para -z; c = 0 é o centro da esfera
  const proj = v => { const d = D.c - v[2]; if (d < 0.06) return null; return [CX + v[0] / d * f, CY + v[1] / d * f, 1 / d]; };
  const inside = Math.max(0, Math.min(1, 1 - D.c / 1.2));
  x.globalCompositeOperation = "source-over"; x.clearRect(0, 0, W, H);
  const bgA = Math.min(1, 0.25 + inside * 0.75);
  const bg = x.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * 0.75);
  bg.addColorStop(0, `rgba(58,14,44,${bgA})`); bg.addColorStop(0.55, `rgba(22,6,18,${bgA})`); bg.addColorStop(1, `rgba(8,2,6,${bgA})`);
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = "lighter";
  const act = Math.min(1.4, (typeof energy === "number" ? energy : 0.18) + (typeof spike === "number" ? spike * 0.45 : 0));
  const core = x.createRadialGradient(CX, CY, 0, CX, CY, f * 0.5); core.addColorStop(0, `rgba(255,150,120,${0.08 + act * 0.14})`); core.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = core; x.fillRect(0, 0, W, H);
  for (const a of G.arcs) {
    x.beginPath(); let on = false;
    for (let k = 0; k <= 48; k++) { const th = a.a0 + t * 0.15 + a.len * (k / 48); const P = proj(rot([0, 1, 2].map(i => (a.u[i] * Math.cos(th) + a.v[i] * Math.sin(th)) * a.r))); if (!P) { on = false; continue; } if (on) x.lineTo(P[0], P[1]); else { x.moveTo(P[0], P[1]); on = true; } }
    const col = nnMix(NN_GOLD, NN_PINK, a.c); x.strokeStyle = nnRgba(col, 0.1); x.lineWidth = 4; x.stroke(); x.strokeStyle = nnRgba(col, 0.4); x.lineWidth = 1; x.stroke();
  }
  const NP = G.nodes.map(n => proj(rot(n.p)));
  const speed = 0.5 * (1 + act * 1.6);
  for (const q of D.dust) {
    const dr = nnReduce ? 0 : Math.sin(t * 0.3 * q.v + q.s) * 0.04;
    const P = proj(rot([q.p[0] * (1 + dr), q.p[1] + dr, q.p[2] * (1 + dr)])); if (!P) continue;
    const r = Math.min(4, 0.5 + P[2] * 0.9), al = Math.min(0.85, 0.15 + P[2] * 0.25) * (0.6 + 0.4 * Math.sin(t * 1.5 + q.s)) * inside;
    x.fillStyle = nnRgba(nnMix(NN_GOLD, NN_PINK, q.c), al); x.beginPath(); x.arc(P[0], P[1], r, 0, 7); x.fill();
  }
  for (const [i, j, w] of G.links) {
    const a = NP[i], b = NP[j]; if (!a || !b) continue;
    const near = Math.min(1, (a[2] + b[2]) / 2 * 0.9), lc = nnMix(NN_GOLD, NN_PINK, G.nodes[i].c);
    const pa = G.nodes[i].p, pb = G.nodes[j].p, ra = Math.hypot(...pa), rb = Math.hypot(...pb);
    x.beginPath(); let ok = true;
    for (let k = 0; k <= 8; k++) { const u = k / 8, m = [0, 1, 2].map(d => pa[d] + (pb[d] - pa[d]) * u), l = Math.hypot(...m) || 1, rr = (ra + (rb - ra) * u) / l; const P = proj(rot(m.map(v => v * rr))); if (!P) { ok = false; break; } if (k) x.lineTo(P[0], P[1]); else x.moveTo(P[0], P[1]); }
    if (!ok) continue;
    x.strokeStyle = nnRgba(lc, 0.05 + 0.12 * near); x.lineWidth = 2 + 4 * near; x.stroke();
    x.strokeStyle = nnRgba(lc, 0.2 + 0.55 * near + act * 0.1); x.lineWidth = 0.6 + 1.2 * near; x.stroke();
    if (!nnReduce) { const u = (t * speed + w) % 1; x.fillStyle = nnRgba([255, 236, 210], 0.6 + 0.3 * near); x.beginPath(); x.arc(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 1.2 + 1.4 * near, 0, 7); x.fill(); }
  }
  for (let i = 0; i < G.nodes.length; i++) {
    const p = NP[i]; if (!p) continue;
    const tw = 0.6 + 0.4 * Math.sin(t * 2 + G.nodes[i].s), col = nnMix(NN_GOLD, NN_PINK, G.nodes[i].c), r = Math.min(9, (1.2 + 2.6 * p[2]) * tw);
    const gg = x.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 5); gg.addColorStop(0, nnRgba(col, 0.5)); gg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = gg; x.beginPath(); x.arc(p[0], p[1], r * 5, 0, 7); x.fill();
    x.fillStyle = nnRgba([255, 240, 220], 0.9); x.beginPath(); x.arc(p[0], p[1], r * 0.6, 0, 7); x.fill();
  }
  D.AP = G.areas.map(a => proj(rot(a.p)));
  D.AP.forEach((p, i) => {
    if (!p) return; const sel = i === nn.sel, col = sel ? NN_PINK : NN_GOLD, r = Math.min(26, (sel ? 9 : 6.5) * Math.max(0.6, p[2]));
    const gg = x.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 5); gg.addColorStop(0, nnRgba(col, 0.75)); gg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = gg; x.beginPath(); x.arc(p[0], p[1], r * 5, 0, 7); x.fill();
    x.fillStyle = nnRgba([255, 242, 230], 1); x.beginPath(); x.arc(p[0], p[1], r * 0.75, 0, 7); x.fill();
    if (sel) { x.strokeStyle = nnRgba(NN_PINK, 0.9); x.lineWidth = 1.3; x.beginPath(); x.arc(p[0], p[1], r + 12 + (nnReduce ? 0 : Math.sin(t * 4) * 3), 0, 7); x.stroke(); }
    if (inside > 0.3) {
      x.globalCompositeOperation = "source-over";
      const al = Math.min(1, (inside - 0.3) / 0.5), fs = Math.round(Math.max(13, Math.min(20, Math.min(W, H) / 26)) * (sel ? 1.1 : 1));
      x.font = `${sel ? 500 : 400} ${fs}px Jost, system-ui, sans-serif`; x.textAlign = "center"; x.lineJoin = "round";
      const lab = nnLabel(NN_KEYS[i]).toUpperCase(), ly = p[1] + r + fs + 8;
      x.lineWidth = 4; x.strokeStyle = nnRgba([12, 3, 10], 0.85 * al); x.strokeText(lab, p[0], ly);
      x.fillStyle = sel ? nnRgba([255, 214, 232], al) : nnRgba([246, 226, 210], 0.9 * al); x.fillText(lab, p[0], ly);
      x.globalCompositeOperation = "lighter";
    }
  });
  x.globalCompositeOperation = "source-over";
}

/* fundo de todas as telas: poeira de luz e filamentos que ondulam devagar */
(function bgFx(){
  const cv = $("bgfx"); if (!cv) return; const x = cv.getContext("2d");
  let s = 13; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const dust = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd(), r: rnd() * 1.1 + 0.2, tw: rnd() * 6, c: rnd() }));
  const fil = Array.from({ length: 8 }, (_, i) => ({ y0: (i + 0.5) / 8 + (rnd() - 0.5) * 0.06, a: 18 + rnd() * 30, f: 0.004 + rnd() * 0.008, sp: 0.15 + rnd() * 0.3, ph: rnd() * 6, c: rnd() }));
  let W = 0, H = 0;
  const size = () => { const dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); };
  addEventListener("resize", size); size();
  const draw = ms => {
    const t = ms / 1000; x.clearRect(0, 0, W, H); x.globalCompositeOperation = "lighter";
    for (const d of dust) { x.fillStyle = nnRgba(nnMix(NN_GOLD, NN_PINK, d.c), 0.18 + 0.28 * Math.sin(t * 1.2 + d.tw)); x.beginPath(); x.arc(d.x * W, d.y * H, d.r, 0, 7); x.fill(); }
    for (const f of fil) {
      x.beginPath(); const yb = f.y0 * H;
      for (let px = -10; px <= W + 10; px += 10) { const py = yb + Math.sin(px * f.f + t * f.sp + f.ph) * f.a + Math.sin(px * f.f * 2.3 - t * f.sp * 0.7) * f.a * 0.35; if (px < 0) x.moveTo(px, py); else x.lineTo(px, py); }
      const col = nnMix(NN_GOLD, NN_PINK, f.c); x.strokeStyle = nnRgba(col, 0.04); x.lineWidth = 4; x.stroke(); x.strokeStyle = nnRgba(col, 0.14); x.lineWidth = 0.8; x.stroke();
    }
    x.globalCompositeOperation = "source-over";
  };
  if (nnReduce) { draw(0); addEventListener("resize", () => draw(0)); return; }
  const loop = ms => { if (!document.hidden) draw(ms); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
})();

/* tela inicial: Agenda, Metas, Finanças e Mais do dia são botões compactos; tocar abre o painel (um de cada vez) */
function hbRefresh(){
  const set = (id, v) => { const el = $(id); if (el) { el.textContent = v || ""; el.hidden = !v; } };
  try { const n = calEvents.filter(e => e.day === today()).length; set("hbAg", n ? String(n) : ""); } catch {}
  try { const n = items.filter(it => it.kind === "meta" && !it.done).length; set("hbMt", n ? String(n) : ""); } catch {}
  try { const c = finCalc(curYM()); set("hbFn", c.renda ? brl0(c.free) : ""); } catch {}
  try { const t = ($("alN") && $("alN").textContent || "").trim(); set("hbMais", /^\d+$/.test(t) && t !== "0" ? t : ""); } catch {}
}
(function homePanels(){
  const btns = [...document.querySelectorAll(".hbtn")]; if (!btns.length) return;
  const close = () => btns.forEach(b => { b.setAttribute("aria-expanded", "false"); const p = $(b.dataset.p); if (p) p.hidden = true; });
  btns.forEach(b => b.addEventListener("click", () => {
    const open = b.getAttribute("aria-expanded") === "true"; close();
    if (open) return;
    b.setAttribute("aria-expanded", "true"); const p = $(b.dataset.p); if (!p) return;
    p.hidden = false; setTimeout(() => p.scrollIntoView({ behavior: nnReduce ? "auto" : "smooth", block: "nearest" }), 30);
  }));
  addEventListener("keydown", e => { if (e.key === "Escape" && btns.some(b => b.getAttribute("aria-expanded") === "true")) close(); });
  addEventListener("hashchange", close);
})();
