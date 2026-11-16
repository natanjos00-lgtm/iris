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
  const R = W * 0.27, CX = W / 2, CY = W * 0.45, F = W * 1.6, ry = nn.ry, rx = nn.rx, SEL = nn.sel;
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
  if (ch) {
    if (!ch.childElementCount) NN_KEYS.forEach((key, i) => ch.append(h("button", { type:"button", class:"nn-chip", "data-i":String(i), onclick:() => nnSelect(i) }, nnLabel(key))));
    ch.querySelectorAll(".nn-chip").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.i === nn.sel)));
  }
}

/* girar com o dedo; tocar num neurônio ativa a área; tocar no centro deixa a ÍRIS falar */
(function nnInput(){
  const core = $("core"), box = core && core.parentElement; if (!core) return;
  const toCanvas = ev => { const r = $("reactor").getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top, r.width]; };
  core.addEventListener("pointerdown", ev => { nn.drag = { x: ev.clientX, y: ev.clientY, ry: nn.ry, rx: nn.rx, id: ev.pointerId }; nn.moved = false; });
  core.addEventListener("pointermove", ev => {
    const d = nn.drag; if (!d || d.id !== ev.pointerId) return;
    const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
    if (!nn.moved && Math.hypot(dx, dy) > 6) { nn.moved = true; try { core.setPointerCapture(ev.pointerId); } catch {} }
    if (nn.moved) { const w = core.getBoundingClientRect().width || 300; nn.ry = d.ry + dx * (3.2 / w); nn.rx = Math.max(-1.2, Math.min(1.2, d.rx + dy * (2.2 / w))); }
  });
  const end = ev => {
    const d = nn.drag; if (!d) return; nn.drag = null;
    if (nn.moved) { nn.suppress = true; let bi = nn.sel, bz = -9; nn.AP.forEach((p, i) => { if (p[3] > bz) { bz = p[3]; bi = i; } }); nnSelect(bi); return; }
    if (ev.type !== "pointerup") return;
    const [px, py, w] = toCanvas(ev); let best = -1, bd = (w || 300) * 0.09;
    nn.AP.forEach((p, i) => { const dd = Math.hypot(p[0] - px, p[1] - py); if (dd < bd && p[3] > -0.2) { bd = dd; best = i; } });
    if (best >= 0 && best !== nn.sel) { nn.suppress = true; nnSelect(best); } // tocar no neurônio já ativo, ou no centro, faz a ÍRIS falar
  };
  core.addEventListener("pointerup", end); core.addEventListener("pointercancel", end);
  box.addEventListener("click", ev => { if (nn.suppress) { nn.suppress = false; ev.stopPropagation(); ev.preventDefault(); } }, true);
  core.addEventListener("keydown", ev => { if (ev.key === "ArrowLeft") { ev.preventDefault(); nnSelect(nn.sel - 1); } else if (ev.key === "ArrowRight") { ev.preventDefault(); nnSelect(nn.sel + 1); } });
})();

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
