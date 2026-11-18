"use strict";
/* ÍRIS · Garagem: a Honda Lead 110 Rosa Ágata em 3D (gira com o dedo, pinça para zoom) + ficha técnica + manutenção */

const MOTO_SPECS = [
  ["Motor", "108 cc", "monocilíndrico, injeção PGM-FI"],
  ["Potência", "9,2 cv", "a 7.500 rpm"],
  ["Torque", "0,97 kgfm", "a 6.000 rpm"],
  ["Câmbio", "CVT", "automático V-Matic"],
  ["Tanque", "6,5 L", "gasolina"],
  ["Consumo", "~40 km/l", "média de uso urbano"],
  ["Peso seco", "109 kg", ""],
  ["Freios", "Disco + tambor", "com CBS (frenagem combinada)"],
  ["Rodas", "12\" / 10\"", "dianteira / traseira"]
];
let moto = { km: 0, oilKm: 0, oilEvery: 3000, licenca: "" };
try { moto = Object.assign(moto, JSON.parse(localStorage.getItem("iris.moto") || "{}")); } catch {}
function motoRemote(d){ if (!d) return; moto = Object.assign({}, moto, d); try { localStorage.setItem("iris.moto", JSON.stringify(moto)); } catch {} if (current === "moto") motoPanel(); }
async function motoSave(){ try { localStorage.setItem("iris.moto", JSON.stringify(moto)); } catch {} if (typeof finMeta !== "undefined" && finMeta) { try { await finMeta.doc("moto").set(JSON.parse(JSON.stringify(moto))); } catch {} } }

function motoFuelMonth(){
  try { const m = ym(today()); return fintx.filter(t => t.type === "saida" && t.month === m && /gasolin|combust|posto|shell|ipiranga|petrobras|etanol|abasteci/i.test(t.desc || "")).reduce((s, t) => s + (+t.amount || 0), 0); } catch { return 0; }
}

function renderMoto(){
  const v = $("v-moto"); if (!v) return;
  if (!v.dataset.built) {
    v.dataset.built = "1";
    v.innerHTML = `
      <div class="mt-head"><p class="eyebrow">Garagem</p><h1 class="t" id="h-moto">Honda Lead 110</h1><p class="lede">Rosa Ágata · scooter 108 cc</p></div>
      <div class="mt-wrap">
        <div class="mt-stage" id="mtStage">
          <canvas id="mtCanvas" aria-label="Moto em 3D. Arraste para girar e use a pinça para aproximar." role="img"></canvas>
          <div class="mt-hot" id="mtHot" aria-hidden="true"></div>
          <div class="mt-load" id="mtLoad">Montando a moto…</div>
          <div class="mt-ctl" role="group" aria-label="Vista da moto">
            <button class="chip" type="button" data-v="lado">Lado</button><button class="chip" type="button" data-v="frente">Frente</button><button class="chip" type="button" data-v="tras">Traseira</button><button class="chip" type="button" data-v="giro" aria-pressed="true">Girar</button>
          </div>
          <p class="mt-hint">Arraste para girar · pinça para zoom</p>
        </div>
        <div class="mt-side">
          <div class="mt-specs">${MOTO_SPECS.map(s => `<div class="acard mt-spec"><span>${s[0]}</span><b>${s[1]}</b>${s[2] ? `<small>${s[2]}</small>` : ""}</div>`).join("")}</div>
        </div>
      </div>
      <section class="card mt-mine" aria-labelledby="h-mt-mine">
        <h2 class="t" id="h-mt-mine">Minha moto</h2>
        <div id="mtPanel"></div>
        <form class="mt-form" id="mtForm">
          <label><span>Hodômetro (km)</span><input type="number" inputmode="numeric" min="0" id="mtKm"></label>
          <label><span>Km da última troca de óleo</span><input type="number" inputmode="numeric" min="0" id="mtOil"></label>
          <label><span>Trocar o óleo a cada (km)</span><input type="number" inputmode="numeric" min="500" step="100" id="mtEvery"></label>
          <label><span>Licenciamento vence em</span><input type="date" id="mtLic"></label>
          <button class="btn olive" type="submit">Salvar</button>
        </form>
        <p class="small muted">O intervalo de troca de óleo varia com o uso. Confira o recomendado no manual da sua Lead.</p>
      </section>
      <p class="small muted mt-src">Ficha técnica: Honda Lead 110 (108 cc, 9,2 cv, tanque de 6,5 L, 109 kg).</p>`;
    $("mtForm").addEventListener("submit", e => { e.preventDefault(); moto.km = +$("mtKm").value || 0; moto.oilKm = +$("mtOil").value || 0; moto.oilEvery = +$("mtEvery").value || 3000; moto.licenca = $("mtLic").value || ""; motoSave(); motoPanel(); toast("Moto atualizada."); });
    v.querySelectorAll(".mt-ctl .chip").forEach(b => b.addEventListener("click", () => motoView(b.dataset.v, b)));
  }
  $("mtKm").value = moto.km || ""; $("mtOil").value = moto.oilKm || ""; $("mtEvery").value = moto.oilEvery || 3000; $("mtLic").value = moto.licenca || "";
  motoPanel(); moto3dStart();
}
function motoPanel(){
  const p = $("mtPanel"); if (!p) return;
  const every = moto.oilEvery || 3000, ran = moto.km && moto.oilKm ? Math.max(0, moto.km - moto.oilKm) : null, left = ran == null ? null : every - ran;
  const pct = ran == null ? 0 : Math.min(100, Math.round(ran / every * 100));
  const fuel = motoFuelMonth(), auton = Math.round(6.5 * 40);
  let lic = "—"; if (moto.licenca) { const d = Math.round((new Date(moto.licenca + "T12:00:00") - new Date()) / 864e5); lic = d < 0 ? `vencido há ${-d} dia${-d === 1 ? "" : "s"}` : d === 0 ? "vence hoje" : `em ${d} dia${d === 1 ? "" : "s"}`; }
  p.innerHTML = `<div class="mt-kpis">
    <div class="acard mt-k ${left != null && left <= 300 ? "warn" : ""}"><span>Próxima troca de óleo</span><b>${left == null ? "—" : left <= 0 ? "agora" : left.toLocaleString("pt-BR") + " km"}</b><i class="mt-bar" style="--w:${pct}%"></i><small>${ran == null ? "preencha o hodômetro e a última troca" : ran.toLocaleString("pt-BR") + " km rodados desde a troca"}</small></div>
    <div class="acard mt-k"><span>Hodômetro</span><b>${moto.km ? moto.km.toLocaleString("pt-BR") + " km" : "—"}</b><small>atualize quando abastecer</small></div>
    <div class="acard mt-k"><span>Autonomia</span><b>~${auton} km</b><small>tanque cheio a ~40 km/l</small></div>
    <div class="acard mt-k"><span>Combustível no mês</span><b>${brl(fuel)}</b><small>lançamentos de posto e gasolina</small></div>
    <div class="acard mt-k"><span>Licenciamento</span><b>${lic}</b><small>${moto.licenca ? new Date(moto.licenca + "T12:00:00").toLocaleDateString("pt-BR") : "informe a data"}</small></div>
  </div>`;
}

/* ---------- 3D ---------- */
const M3 = { ready: false, loading: false, run: false };
function motoLoad3(){
  return new Promise((res, rej) => {
    if (window.THREE) return res();
    const s = document.createElement("script"); s.src = "js/vendor/three.r128.min.js"; s.onload = () => res(); s.onerror = rej; document.head.appendChild(s);
  });
}
async function moto3dStart(){
  if (M3.ready) { M3.resize(); if (!M3.run) { M3.run = true; requestAnimationFrame(M3.loop); } return; }
  if (M3.loading) return; M3.loading = true;
  try { await motoLoad3(); } catch { const l = $("mtLoad"); if (l) l.textContent = "Sem conexão para carregar o 3D."; M3.loading = false; return; }
  motoBuild(); const l = $("mtLoad"); if (l) l.hidden = true;
}
function motoView(v, btn){
  if (!M3.ready) return;
  if (v === "giro") { M3.auto = !M3.auto; btn.setAttribute("aria-pressed", M3.auto ? "true" : "false"); M3.idle = 99; return; }
  const yaw = { lado: -Math.PI / 2 + 0.0001, frente: 0, tras: Math.PI }[v]; M3.goYaw = yaw; M3.goPitch = 0.22; M3.goDist = 3.6;
}

function motoBuild(){
  const T = THREE, cv = $("mtCanvas"), stage = $("mtStage");
  const R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, 0.05, 50);

  // reflexos: um "estúdio" com painéis de luz, para a pintura metálica brilhar
  const pm = new T.PMREMGenerator(R), env = new T.Scene();
  env.add(new T.Mesh(new T.BoxGeometry(12, 8, 12), new T.MeshBasicMaterial({ color: 0x20262c, side: T.BackSide })));
  [[0, 3.8, 0, 6, .1, 3], [-5.5, 1.5, 0, .1, 2, 6], [5.5, 1.8, 2, .1, 2.5, 3], [0, 1.2, -5.5, 5, 1.2, .1]].forEach(([x, y, z, w, h, d]) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ color: 0xffffff })); m.position.set(x, y, z); env.add(m); });
  scene.environment = pm.fromScene(env, 0.04).texture;

  scene.add(new T.HemisphereLight(0xeaf5ff, 0x1a1f24, 0.55));
  const key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(2.5, 4, 2.2); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -1.6; key.shadow.camera.right = 1.6; key.shadow.camera.top = 1.6; key.shadow.camera.bottom = -1.6; key.shadow.radius = 4; scene.add(key);
  const rim = new T.DirectionalLight(0x9fd4ff, 0.9); rim.position.set(-3, 2, -2.5); scene.add(rim);

  // materiais
  const paint = new T.MeshPhysicalMaterial({ color: 0xe08aa3, metalness: 0.3, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06 });
  const plastic = new T.MeshStandardMaterial({ color: 0x1b1e22, roughness: 0.6, metalness: 0.05, envMapIntensity: 0.4 });
  const black = new T.MeshStandardMaterial({ color: 0x101214, roughness: 0.7, envMapIntensity: 0.4 });
  const seatM = new T.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.62, metalness: 0, envMapIntensity: 0.35 });
  const chrome = new T.MeshStandardMaterial({ color: 0xd9dde2, metalness: 1, roughness: 0.12 });
  const silver = new T.MeshStandardMaterial({ color: 0xb8bec5, metalness: 0.85, roughness: 0.3 });
  const rubber = new T.MeshStandardMaterial({ color: 0x0f1011, roughness: 0.92 });
  const lamp = new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf5ff, emissiveIntensity: 1.4, roughness: 0.1 });
  const tail = new T.MeshStandardMaterial({ color: 0x7a0b12, emissive: 0xff2a2a, emissiveIntensity: 0.8, roughness: 0.2 });
  const amber = new T.MeshStandardMaterial({ color: 0xffb04a, emissive: 0xff8a1a, emissiveIntensity: 0.35, roughness: 0.25 });

  const bike = new T.Group(); scene.add(bike);
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; bike.add(m); return m; };
  // perfil lateral (x, y) extrudado na largura, com bordas arredondadas
  const prof = (pts, depth, bevel, mat, z = 0) => {
    const s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) { const p = pts[i]; if (p.length === 4) s.quadraticCurveTo(p[0], p[1], p[2], p[3]); else s.lineTo(p[0], p[1]); }
    const g = new T.ExtrudeGeometry(s, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 6, curveSegments: 24 });
    g.translate(0, 0, -(depth - bevel * 2) / 2 + z); return add(g, mat);
  };

  // rodas: dianteira 12", traseira 10"
  const wheel = (x, r, front) => {
    const g = new T.Group(); g.position.set(x, r, 0); bike.add(g);
    const tire = new T.Mesh(new T.TorusGeometry(r - 0.055, 0.058, 20, 48), rubber); tire.castShadow = true; g.add(tire);
    const rimD = new T.Mesh(new T.CylinderGeometry(r - 0.075, r - 0.075, 0.075, 40), silver); rimD.rotation.x = Math.PI / 2; g.add(rimD);
    const hub = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 0.12, 20), chrome); hub.rotation.x = Math.PI / 2; g.add(hub);
    for (let k = 0; k < 5; k++) { const sp = new T.Mesh(new T.BoxGeometry(0.03, r - 0.1, 0.085), plastic); sp.position.set(Math.cos(k * 1.2566) * (r - 0.1) / 2, Math.sin(k * 1.2566) * (r - 0.1) / 2, 0); sp.rotation.z = k * 1.2566 - Math.PI / 2; g.add(sp); }
    if (front) { const disc = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.006, 36), chrome); disc.rotation.x = Math.PI / 2; disc.position.z = 0.055; g.add(disc); const cal = new T.Mesh(new T.BoxGeometry(0.06, 0.08, 0.03), black); cal.position.set(-0.08, 0.06, 0.065); g.add(cal); }
    return g;
  };
  const wF = wheel(0.64, 0.235, true), wR = wheel(-0.63, 0.215, false);

  // carenagem traseira (corpo grande da Lead, com o baú sob o assento)
  prof([[-0.08, 0.3], [-0.08, 0.6], [-0.1, 0.7, -0.18, 0.71], [-0.78, 0.73], [-0.93, 0.72, -0.95, 0.62], [-0.94, 0.55, -0.86, 0.52], [-0.74, 0.5], [-0.62, 0.53, -0.48, 0.47], [-0.38, 0.42, -0.33, 0.33], [-0.3, 0.3]], 0.36, 0.05, paint);
  // faixa lateral escura
  prof([[-0.2, 0.47], [-0.82, 0.58], [-0.84, 0.555], [-0.22, 0.44]], 0.375, 0.004, plastic);
  // assoalho
  add(new T.BoxGeometry(0.42, 0.05, 0.3), plastic, 0.1, 0.29, 0);
  add(new T.BoxGeometry(0.42, 0.006, 0.27), black, 0.1, 0.318, 0);
  // escudo dianteiro e frente
  prof([[0.28, 0.28], [0.31, 0.6], [0.36, 0.86, 0.42, 0.93], [0.55, 0.95], [0.66, 0.86, 0.67, 0.66], [0.66, 0.52], [0.6, 0.42, 0.46, 0.34], [0.34, 0.28]], 0.34, 0.05, paint);
  // painel interno do escudo (lado da perna)
  prof([[0.3, 0.33], [0.33, 0.6], [0.37, 0.82], [0.33, 0.82], [0.29, 0.6], [0.27, 0.33]], 0.3, 0.01, plastic);
  // farol e piscas no escudo
  add(new T.SphereGeometry(0.06, 24, 16), lamp, 0.665, 0.74, 0).scale.set(0.35, 0.9, 1.5);
  add(new T.SphereGeometry(0.03, 16, 12), amber, 0.64, 0.86, 0.17).scale.set(0.5, 0.6, 1);
  add(new T.SphereGeometry(0.03, 16, 12), amber, 0.64, 0.86, -0.17).scale.set(0.5, 0.6, 1);
  // garfo e paralama
  [-0.07, 0.07].forEach(z => { const f = add(new T.CylinderGeometry(0.022, 0.022, 0.5, 14), black, 0.615, 0.48, z, 0, 0, 0.2); });
  { const s = new T.Shape(); s.absarc(0, 0, 0.3, 0.25, 2.5, false); s.absarc(0, 0, 0.275, 2.5, 0.25, true); const g = new T.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 32 }); g.translate(0, 0, -0.05); add(g, paint, 0.64, 0.235, 0); }
  // coluna de direção, carenagem do guidão, guidão, retrovisores
  add(new T.CylinderGeometry(0.035, 0.035, 0.24, 14), black, 0.5, 1.0, 0, 0, 0, 0.35);
  prof([[0.36, 1.05], [0.4, 1.12, 0.5, 1.13], [0.6, 1.11, 0.63, 1.06], [0.6, 1.02], [0.38, 1.01]], 0.32, 0.03, paint);
  add(new T.BoxGeometry(0.12, 0.02, 0.14), black, 0.47, 1.135, 0, 0, 0, -0.1);
  add(new T.CylinderGeometry(0.014, 0.014, 0.66, 12), chrome, 0.46, 1.08, 0, Math.PI / 2);
  [-1, 1].forEach(sd => {
    add(new T.CylinderGeometry(0.02, 0.02, 0.12, 14), black, 0.46, 1.08, sd * 0.29, Math.PI / 2);
    add(new T.BoxGeometry(0.1, 0.01, 0.02), silver, 0.52, 1.09, sd * 0.25, 0, sd * 0.2, 0);
    const st = add(new T.CylinderGeometry(0.008, 0.008, 0.22, 8), black, 0.44, 1.2, sd * 0.22, sd * 0.35, 0, 0);
    const mi = add(new T.SphereGeometry(0.05, 20, 12), black, 0.44, 1.31, sd * 0.26); mi.scale.set(0.25, 0.7, 1.15);
  });
  // assento
  prof([[-0.15, 0.72], [-0.2, 0.8, -0.3, 0.81], [-0.46, 0.8], [-0.52, 0.86, -0.6, 0.865], [-0.78, 0.86], [-0.88, 0.85, -0.86, 0.75], [-0.8, 0.73], [-0.15, 0.71]], 0.31, 0.035, seatM);
  // alça traseira, lanterna
  const rail = new T.CatmullRomCurve3([new T.Vector3(-0.66, 0.76, 0.17), new T.Vector3(-0.86, 0.79, 0.19), new T.Vector3(-0.96, 0.78, 0), new T.Vector3(-0.86, 0.79, -0.19), new T.Vector3(-0.66, 0.76, -0.17)]);
  add(new T.TubeGeometry(rail, 40, 0.014, 10, false), silver);
  add(new T.SphereGeometry(0.06, 20, 12), tail, -0.955, 0.64, 0).scale.set(0.35, 0.55, 1.6);
  // motor, balança e escapamento
  add(new T.BoxGeometry(0.4, 0.17, 0.16), plastic, -0.46, 0.25, -0.05, 0, 0, -0.1);
  add(new T.BoxGeometry(0.3, 0.08, 0.06), silver, -0.5, 0.2, -0.11);
  add(new T.CylinderGeometry(0.055, 0.05, 0.36, 22), chrome, -0.68, 0.27, 0.17, 0, 0, Math.PI / 2 - 0.12);
  add(new T.BoxGeometry(0.28, 0.07, 0.02), black, -0.66, 0.31, 0.225, 0, 0, -0.12);
  // descanso lateral

  // plataforma iluminada
  const floor = new T.Mesh(new T.CircleGeometry(1.5, 64), new T.ShadowMaterial({ opacity: 0.32 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const ringC = getComputedStyle(document.documentElement).getPropertyValue("--hud1").trim() || "#BFE3FF";
  const ring = new T.Mesh(new T.RingGeometry(1.12, 1.135, 96), new T.MeshBasicMaterial({ color: new T.Color(ringC), transparent: true, opacity: 0.9 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; scene.add(ring);
  const glow = new T.Mesh(new T.RingGeometry(0.95, 1.3, 96), new T.MeshBasicMaterial({ color: new T.Color(ringC), transparent: true, opacity: 0.08, blending: T.AdditiveBlending, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.003; scene.add(glow);
  const ticks = new T.Group(); for (let i = 0; i < 72; i++) { const t = new T.Mesh(new T.PlaneGeometry(0.008, i % 6 ? 0.04 : 0.08), ring.material); const a = i / 72 * Math.PI * 2; t.position.set(Math.cos(a) * 1.2, 0.003, Math.sin(a) * 1.2); t.rotation.set(-Math.PI / 2, 0, -a + Math.PI / 2); ticks.add(t); } scene.add(ticks);
  bike.position.y = 0.006;

  // pontos de destaque
  const HOT = [
    { p: [0.64, 0.24, 0.12], n: [0.2, 0, 1], t: "Freio a disco", s: "dianteiro, com CBS" },
    { p: [-0.45, 0.3, 0.1], n: [0, 0, 1], t: "Motor 108 cc", s: "injeção eletrônica" },
    { p: [-0.5, 0.86, 0], n: [0, 1, 0], t: "Baú", s: "sob o assento" },
    { p: [0.68, 0.74, 0], n: [1, 0, 0], t: "Farol", s: "no escudo frontal" }
  ];
  const hotL = $("mtHot"); hotL.innerHTML = HOT.map((h, i) => `<div class="mt-pin" data-i="${i}"><i></i><span><b>${h.t}</b>${h.s}</span></div>`).join("");
  const pins = [...hotL.children];

  // câmera orbitando: arrastar gira, pinça aproxima
  Object.assign(M3, { yaw: -0.9, pitch: 0.24, dist: 3.7, vy: 0, auto: true, idle: 0, goYaw: null, goPitch: null, goDist: null });
  const ptrs = new Map(); let lastTap = 0, pinch0 = 0, dist0 = 0;
  cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); M3.idle = 0; M3.goYaw = M3.goPitch = M3.goDist = null; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = M3.dist; } const n = performance.now(); if (n - lastTap < 300 && ptrs.size === 1) { M3.goYaw = -0.9; M3.goPitch = 0.24; M3.goDist = 3.7; } lastTap = n; });
  cv.addEventListener("pointermove", e => {
    if (!ptrs.has(e.pointerId)) return; const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 1) { const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; M3.vy = dx * 0.008; M3.yaw += M3.vy; M3.pitch = Math.max(0.02, Math.min(1.1, M3.pitch + dy * 0.005)); }
    else if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); M3.dist = Math.max(1.8, Math.min(6, dist0 * pinch0 / d)); }
    M3.idle = 0;
  });
  const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("wheel", e => { e.preventDefault(); M3.dist = Math.max(1.8, Math.min(6, M3.dist * (1 + e.deltaY * 0.001))); M3.idle = 0; }, { passive: false });

  M3.resize = () => { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  addEventListener("resize", M3.resize); M3.resize();

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, tgt = new T.Vector3(0, 0.6, 0), v3 = new T.Vector3(), nv = new T.Vector3(), camDir = new T.Vector3();
  let last = performance.now();
  M3.loop = now => {
    if (current !== "moto" || document.hidden) { M3.run = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; M3.idle += dt;
    if (M3.goYaw != null) { let d = M3.goYaw - M3.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); M3.yaw += d * Math.min(1, dt * 5); M3.pitch += (M3.goPitch - M3.pitch) * Math.min(1, dt * 5); M3.dist += (M3.goDist - M3.dist) * Math.min(1, dt * 5); if (Math.abs(d) < 0.002) M3.goYaw = null; }
    else if (!ptrs.size) { M3.vy *= 0.92; M3.yaw += M3.vy; if (M3.auto && !reduce && M3.idle > 3) M3.yaw += dt * 0.25; }
    const D = M3.dist * Math.max(1, 0.95 / cam.aspect); cam.position.set(Math.sin(M3.yaw) * Math.cos(M3.pitch) * D, tgt.y + Math.sin(M3.pitch) * D, Math.cos(M3.yaw) * Math.cos(M3.pitch) * D); cam.lookAt(tgt);
    ticks.rotation.y += reduce ? 0 : dt * 0.08; glow.material.opacity = 0.07 + 0.03 * Math.sin(now / 700);
    R.render(scene, cam);
    const w = stage.clientWidth, h = stage.clientHeight; cam.getWorldDirection(camDir);
    HOT.forEach((hs, i) => { v3.set(...hs.p).add(bike.position); nv.set(...hs.n).normalize(); const vis = nv.dot(camDir) < -0.15; v3.project(cam); const el = pins[i]; const px = (v3.x * 0.5 + 0.5) * w; el.style.transform = `translate(${px}px,${(-v3.y * 0.5 + 0.5) * h}px)`; el.classList.toggle("off", !vis); el.classList.toggle("l", px > w * 0.58); });
    requestAnimationFrame(M3.loop);
  };
  M3.ready = true; M3.run = true; requestAnimationFrame(M3.loop);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && current === "moto" && !M3.run) { M3.run = true; last = performance.now(); requestAnimationFrame(M3.loop); } });
}
