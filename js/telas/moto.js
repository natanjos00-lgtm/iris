"use strict";
/* ÍRIS · Garagem: Honda Lead 110 Rosa Ágata em 3D.
   Silhueta traçada a partir da foto lateral (proporções reais: 1.838 mm, entre-eixos 1.274 mm, rodas 12"/10").
   Aproximar ou ligar o Raio-X deixa a carenagem translúcida e mostra o que tem dentro.
   Dados do manual do proprietário Lead 110. */

const MOTO_SPECS = [
  ["Motor", "108 cc", "4 tempos, OHC, 2 válvulas, injeção PGM-FI"],
  ["Potência", "9,2 cv", "a 7.500 rpm"],
  ["Torque", "0,97 kgfm", "a 6.000 rpm"],
  ["Cilindro", "50 × 55 mm", "diâmetro × curso · compressão 11:1"],
  ["Arrefecimento", "Líquido", "0,41 L de líquido"],
  ["Câmbio", "CVT", "automático por correia"],
  ["Tanque", "6,5 L", "reserva ~1,8 L · sob o assoalho"],
  ["Peso seco", "109 kg", "altura do assento 740 mm"],
  ["Freios", "Disco + tambor", "com CBS (frenagem combinada)"]
];
const MOTO_PLAN = [
  ["Óleo do motor", "a cada 4.000 km ou 1 ano", "SAE 10W-30 · 0,7 L"],
  ["Vela de ignição", "a cada 8.000 km", "NGK CR7EH-9 · folga 0,8–0,9 mm"],
  ["Correia do CVT", "revisar 8.000 km · trocar 20.000 km", ""],
  ["Filtro de ar", "a cada 16.000 km", "tipo viscoso, não lavar"],
  ["Óleo da transmissão final", "a cada 2 anos", "0,10 L"],
  ["Pneus (frios)", "dianteiro 25 psi · traseiro 29 psi", "33 psi atrás com garupa"]
];
const TANK = 6.5;
let moto = { km: 0, oilKm: 0, oilEvery: 4000, licenca: "", fuel: [] };
try { moto = Object.assign(moto, JSON.parse(localStorage.getItem("iris.moto") || "{}")); } catch {}
if (!Array.isArray(moto.fuel)) moto.fuel = [];
function motoRemote(d){ if (!d) return; moto = Object.assign({}, moto, d); if (!Array.isArray(moto.fuel)) moto.fuel = []; try { localStorage.setItem("iris.moto", JSON.stringify(moto)); } catch {} if (current === "moto") { motoPanel(); motoFuelPanel(); } }
async function motoSave(){ try { localStorage.setItem("iris.moto", JSON.stringify(moto)); } catch {} if (typeof finMeta !== "undefined" && finMeta) { try { await finMeta.doc("moto").set(JSON.parse(JSON.stringify(moto))); } catch {} } }
const mtEsc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const mtN = (v, d = 0) => (+v || 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

/* ---------- gasolina ---------- */
function motoFuel(){
  const f = moto.fuel.slice().sort((a, b) => (a.km || 0) - (b.km || 0) || String(a.d).localeCompare(String(b.d)));
  const rates = []; let lastFull = null, acc = 0;
  for (const x of f) { if (lastFull) acc += +x.l || 0; if (x.full) { if (lastFull && x.km > lastFull.km && acc > 0) rates.push((x.km - lastFull.km) / acc); lastFull = x; acc = 0; } }
  const cons = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null, use = cons || 40;
  let level = null, F = null; for (let i = f.length - 1; i >= 0; i--) if (f[i].full) { F = f[i]; break; }
  if (F) { const after = f.filter(x => x !== F && (x.km || 0) >= (F.km || 0) && !x.full).reduce((s, x) => s + (+x.l || 0), 0); const km = Math.max(moto.km || 0, F.km || 0); level = Math.max(0, Math.min(TANK, TANK + after - (km - F.km) / use)); }
  const liters = f.reduce((s, x) => s + (+x.l || 0), 0), spent = f.reduce((s, x) => s + (+x.v || 0), 0);
  const m = ym(today()), month = f.filter(x => ym(x.d) === m).reduce((s, x) => s + (+x.v || 0), 0);
  return { list: f, cons, use, level, ppl: liters ? spent / liters : null, month, range: level == null ? null : Math.round(level * use) };
}
function motoCluster(level){
  const pct = level == null ? 0.5 : level / TANK, fa = -50 + pct * 100; // ponteiro: -50° (vazio) a +50° (cheio)
  const ticks = []; for (let i = 0; i <= 50; i++) { const a = (-225 + i * 5.4) * Math.PI / 180, big = i % 5 === 0, r1 = 66, r2 = big ? 56 : 61; ticks.push(`<line x1="${(150 + Math.cos(a) * r1).toFixed(1)}" y1="${(92 + Math.sin(a) * r1).toFixed(1)}" x2="${(150 + Math.cos(a) * r2).toFixed(1)}" y2="${(92 + Math.sin(a) * r2).toFixed(1)}" stroke="${i > 42 ? "#FF4A2A" : "#F2F2F2"}" stroke-width="${big ? 1.6 : .8}"/>`); }
  const nums = [0, 20, 40, 60, 80, 100].map((n, i) => { const a = (-225 + i * 54) * Math.PI / 180; return `<text x="${(150 + Math.cos(a) * 45).toFixed(1)}" y="${(95 + Math.sin(a) * 45).toFixed(1)}" text-anchor="middle" font-size="9" fill="#F2F2F2" font-style="italic">${n}</text>`; }).join("");
  const side = (cx, a0, n, red) => { let s = ""; for (let i = 0; i <= n; i++) { const a = (a0 + i * (100 / n)) * Math.PI / 180; s += `<line x1="${(cx + Math.cos(a) * 30).toFixed(1)}" y1="${(98 + Math.sin(a) * 30).toFixed(1)}" x2="${(cx + Math.cos(a) * 24).toFixed(1)}" y2="${(98 + Math.sin(a) * 24).toFixed(1)}" stroke="${red(i) ? "#FF4A2A" : "#F2F2F2"}" stroke-width="1.3"/>`; } return s; };
  const fr = (fa - 90 + 180) * Math.PI / 180, odo = String(Math.round(moto.km || 0)).padStart(6, "0");
  return `<svg class="mt-cluster" viewBox="0 0 300 175" role="img" aria-label="Painel: combustível ${level == null ? "desconhecido" : Math.round(pct * 100) + "%"}, hodômetro ${mtN(moto.km)} km">
    <defs><linearGradient id="mcG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A3F45"/><stop offset="1" stop-color="#16181B"/></linearGradient><radialGradient id="mcD" r=".5"><stop offset=".7" stop-color="#0B0C0E"/><stop offset="1" stop-color="#1D2024"/></radialGradient></defs>
    <path d="M30 40 Q34 18 60 16 L240 16 Q266 18 270 40 L286 120 Q290 160 250 164 L50 164 Q10 160 14 120 Z" fill="url(#mcG)" stroke="#5A6068" stroke-width="2"/>
    <path d="M42 46 Q46 28 66 27 L234 27 Q254 28 258 46 L272 118 Q275 150 244 153 L56 153 Q25 150 28 118 Z" fill="#0D0E10"/>
    <circle cx="150" cy="92" r="72" fill="url(#mcD)" stroke="#9AA1A8" stroke-width="4"/>
    ${ticks.join("")}${nums}
    
    
    <line x1="150" y1="92" x2="${(150 + Math.cos(-225 * Math.PI / 180) * 58).toFixed(1)}" y2="${(92 + Math.sin(-225 * Math.PI / 180) * 58).toFixed(1)}" stroke="#FF4A2A" stroke-width="3" stroke-linecap="round"/><circle cx="150" cy="92" r="6" fill="#1A1C1F" stroke="#555" /><rect x="124" y="112" width="52" height="15" rx="2" fill="#B9C4B0"/><text x="150" y="123.5" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#1A1C18" letter-spacing="1">${odo}</text><text x="150" y="140" text-anchor="middle" font-size="7.5" fill="#F2F2F2" font-style="italic">km/h</text>
    ${side(62, 130, 6, i => i === 6)}<text x="47" y="80" font-size="8" fill="#F2F2F2">H</text><text x="47" y="126" font-size="8" fill="#F2F2F2">C</text>
    <line x1="62" y1="98" x2="${(62 + Math.cos(160 * Math.PI / 180) * 22).toFixed(1)}" y2="${(98 + Math.sin(160 * Math.PI / 180) * 22).toFixed(1)}" stroke="#FF4A2A" stroke-width="2.2" stroke-linecap="round"/>
    ${side(238, -50, 6, i => i === 6)}<text x="248" y="80" font-size="8" fill="#F2F2F2">F</text><text x="248" y="126" font-size="8" fill="#F2F2F2">E</text>
    <line x1="238" y1="98" x2="${(238 + Math.cos((fa) * Math.PI / 180 * -1 + 0) * 22).toFixed(1)}" y2="${(98 + Math.sin(-fa * Math.PI / 180) * 22).toFixed(1)}" stroke="#FF4A2A" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="62" cy="98" r="3" fill="#333"/><circle cx="238" cy="98" r="3" fill="#333"/>
    <rect x="72" y="36" width="16" height="11" rx="2" fill="#1E5F3A"/><rect x="212" y="36" width="16" height="11" rx="2" fill="#7A4A10"/>
  </svg>`;
}
function motoFuelPanel(){
  const el = $("mtFuel"); if (!el) return; const F = motoFuel();
  const lv = F.level, pct = lv == null ? null : Math.round(lv / TANK * 100);
  el.innerHTML = `<div class="mt-fuel">
      <div class="mt-dash">${motoCluster(lv)}</div>
      <div class="mt-kpis">
        <div class="acard mt-k ${lv != null && lv <= 1.8 ? "warn" : ""}"><span>Nível estimado</span><b>${lv == null ? "—" : mtN(lv, 1) + " L"}</b><i class="mt-bar" style="--w:${pct || 0}%"></i><small>${lv == null ? "registre um abastecimento com tanque cheio" : pct + "% do tanque" + (lv <= 1.8 ? " · na reserva" : "")}</small></div>
        <div class="acard mt-k"><span>Autonomia agora</span><b>${F.range == null ? "—" : "~" + F.range + " km"}</b><small>a ${mtN(F.use, 1)} km/l</small></div>
        <div class="acard mt-k"><span>Consumo real</span><b>${F.cons ? mtN(F.cons, 1) + " km/l" : "—"}</b><small>${F.cons ? "média entre tanques cheios" : "precisa de 2 tanques cheios"}</small></div>
        <div class="acard mt-k"><span>Preço médio</span><b>${F.ppl ? brl(F.ppl) + "/L" : "—"}</b><small>${F.ppl && F.cons ? brl(F.ppl / F.cons) + " por km" : "dos seus abastecimentos"}</small></div>
        <div class="acard mt-k"><span>Gasolina no mês</span><b>${brl(F.month)}</b><small>abastecimentos registrados aqui</small></div>
      </div>
    </div>
    ${F.list.length ? `<ul class="mt-fills">${F.list.slice(-6).reverse().map(x => `<li><span>${new Date(x.d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span><span>${mtN(x.l, 1)} L${x.full ? " ✓" : ""}</span><span>${brl(x.v)}</span><span>${mtN(x.km)} km</span><button type="button" class="mt-del" data-id="${mtEsc(x.id)}" aria-label="Apagar abastecimento de ${new Date(x.d + "T12:00:00").toLocaleDateString("pt-BR")}">×</button></li>`).join("")}</ul>` : ""}`;
  el.querySelectorAll(".mt-del").forEach(b => b.addEventListener("click", () => { moto.fuel = moto.fuel.filter(x => x.id !== b.dataset.id); motoSave(); motoFuelPanel(); motoTankLevel(); }));
}
async function motoAddFuel(e){
  e.preventDefault();
  const d = $("mfD").value || today(), v = +String($("mfV").value).replace(",", ".") || 0, l = +String($("mfL").value).replace(",", ".") || 0, km = +$("mfK").value || moto.km || 0, full = $("mfFull").checked, fin = $("mfFin").checked;
  if (!l && !v) { toast("Informe os litros ou o valor."); return; }
  const id = "f" + Date.now().toString(36);
  moto.fuel.push({ id, d, v, l: l || (v && motoFuel().ppl ? v / motoFuel().ppl : 0), km, full });
  if (km > (moto.km || 0)) moto.km = km;
  await motoSave();
  if (fin && v && typeof txAdd === "function") { try { await txAdd({ type: "saida", amount: v, desc: "Gasolina · moto", cat: "Transporte", date: d }); } catch {} }
  $("mfV").value = ""; $("mfL").value = ""; $("mfK").value = "";
  motoFuelPanel(); motoPanel(); motoTankLevel(); toast(fin && v ? "Abastecimento salvo e lançado em Finanças." : "Abastecimento salvo.");
}

function renderMoto(){
  const v = $("v-moto"); if (!v) return;
  if (!v.dataset.built) {
    v.dataset.built = "1";
    v.innerHTML = `
      <div class="mt-head"><p class="eyebrow">Garagem</p><h1 class="t" id="h-moto">Honda Lead 110</h1><p class="lede">Rosa Ágata · scooter 108 cc</p></div>
      <div class="mt-wrap">
        <div class="mt-stage" id="mtStage">
          <canvas id="mtCanvas" aria-label="Moto em 3D. Arraste para girar, use a pinça para aproximar; de perto ela mostra as peças internas." role="img"></canvas>
          <div class="mt-hot" id="mtHot" aria-hidden="true"></div>
          <div class="mt-load" id="mtLoad">Montando a moto…</div>
          <div class="mt-ctl" role="group" aria-label="Vista da moto">
            <button class="chip" type="button" data-v="lado">Lado</button><button class="chip" type="button" data-v="frente">Frente</button><button class="chip" type="button" data-v="tras">Traseira</button>
            <button class="chip" type="button" data-v="xray" aria-pressed="false">Raio-X</button><button class="chip" type="button" data-v="giro" aria-pressed="true">Girar</button>
          </div>
          <p class="mt-hint" id="mtHint">Arraste para girar · aproxime para ver por dentro</p>
        </div>
        <div class="mt-side">
          <div class="mt-specs">${MOTO_SPECS.map(s => `<div class="acard mt-spec"><span>${s[0]}</span><b>${s[1]}</b>${s[2] ? `<small>${s[2]}</small>` : ""}</div>`).join("")}</div>
        </div>
      </div>
      <section class="card mt-mine" aria-labelledby="h-mt-fuel">
        <h2 class="t" id="h-mt-fuel">Gasolina</h2>
        <div id="mtFuel"></div>
        <form class="mt-form" id="mfForm">
          <label><span>Data</span><input type="date" id="mfD"></label>
          <label><span>Valor (R$)</span><input type="text" inputmode="decimal" id="mfV" placeholder="0,00"></label>
          <label><span>Litros</span><input type="text" inputmode="decimal" id="mfL" placeholder="0,00"></label>
          <label><span>Hodômetro (km)</span><input type="number" inputmode="numeric" min="0" id="mfK"></label>
          <label class="mt-chk"><input type="checkbox" id="mfFull" checked><span>Completei o tanque</span></label>
          <label class="mt-chk"><input type="checkbox" id="mfFin" checked><span>Lançar em Finanças (Transporte)</span></label>
          <button class="btn olive" type="submit">Registrar abastecimento</button>
        </form>
      </section>
      <section class="card mt-mine" aria-labelledby="h-mt-mine">
        <h2 class="t" id="h-mt-mine">Manutenção</h2>
        <div id="mtPanel"></div>
        <form class="mt-form" id="mtForm">
          <label><span>Hodômetro (km)</span><input type="number" inputmode="numeric" min="0" id="mtKm"></label>
          <label><span>Km da última troca de óleo</span><input type="number" inputmode="numeric" min="0" id="mtOil"></label>
          <label><span>Trocar o óleo a cada (km)</span><input type="number" inputmode="numeric" min="500" step="100" id="mtEvery"></label>
          <label><span>Licenciamento vence em</span><input type="date" id="mtLic"></label>
          <button class="btn olive" type="submit">Salvar</button>
        </form>
        <h3 class="mt-h3">Plano do manual</h3>
        <ul class="mt-plan">${MOTO_PLAN.map(p => `<li><b>${p[0]}</b><span>${p[1]}</span>${p[2] ? `<small>${p[2]}</small>` : ""}</li>`).join("")}</ul>
      </section>
      <p class="small muted mt-src">Dados do manual do proprietário Honda Lead 110.</p>`;
    $("mtForm").addEventListener("submit", e => { e.preventDefault(); moto.km = +$("mtKm").value || 0; moto.oilKm = +$("mtOil").value || 0; moto.oilEvery = +$("mtEvery").value || 4000; moto.licenca = $("mtLic").value || ""; motoSave(); motoPanel(); motoFuelPanel(); motoTankLevel(); toast("Moto atualizada."); });
    $("mfForm").addEventListener("submit", motoAddFuel);
    v.querySelectorAll(".mt-ctl .chip").forEach(b => b.addEventListener("click", () => motoView(b.dataset.v, b)));
  }
  $("mtKm").value = moto.km || ""; $("mtOil").value = moto.oilKm || ""; $("mtEvery").value = moto.oilEvery || 4000; $("mtLic").value = moto.licenca || "";
  if (!$("mfD").value) $("mfD").value = today();
  motoPanel(); motoFuelPanel(); moto3dStart();
}
function motoPanel(){
  const p = $("mtPanel"); if (!p) return;
  const every = moto.oilEvery || 4000, ran = moto.km && moto.oilKm ? Math.max(0, moto.km - moto.oilKm) : null, left = ran == null ? null : every - ran;
  const pct = ran == null ? 0 : Math.min(100, Math.round(ran / every * 100));
  let lic = "—"; if (moto.licenca) { const d = Math.round((new Date(moto.licenca + "T12:00:00") - new Date()) / 864e5); lic = d < 0 ? `vencido há ${-d} dia${-d === 1 ? "" : "s"}` : d === 0 ? "vence hoje" : `em ${d} dia${d === 1 ? "" : "s"}`; }
  p.innerHTML = `<div class="mt-kpis">
    <div class="acard mt-k ${left != null && left <= 300 ? "warn" : ""}"><span>Próxima troca de óleo</span><b>${left == null ? "—" : left <= 0 ? "agora" : mtN(left) + " km"}</b><i class="mt-bar" style="--w:${pct}%"></i><small>${ran == null ? "preencha o hodômetro e a última troca" : mtN(ran) + " km desde a troca"}</small></div>
    <div class="acard mt-k"><span>Hodômetro</span><b>${moto.km ? mtN(moto.km) + " km" : "—"}</b><small>atualiza sozinho ao abastecer</small></div>
    <div class="acard mt-k"><span>Licenciamento</span><b>${lic}</b><small>${moto.licenca ? new Date(moto.licenca + "T12:00:00").toLocaleDateString("pt-BR") : "informe a data"}</small></div>
  </div>`;
}

/* ---------- 3D ---------- */
const M3 = { ready: false, loading: false, run: false };
function motoLoad3(){
  return new Promise((res, rej) => { if (window.THREE) return res(); const s = document.createElement("script"); s.src = "js/vendor/three.r128.min.js"; s.onload = () => res(); s.onerror = rej; document.head.appendChild(s); });
}
async function moto3dStart(){
  if (M3.ready) { M3.resize(); if (!M3.run) { M3.run = true; M3.last = performance.now(); requestAnimationFrame(M3.loop); } return; }
  if (M3.loading) return; M3.loading = true;
  try { await motoLoad3(); } catch { const l = $("mtLoad"); if (l) l.textContent = "Não consegui carregar o 3D."; M3.loading = false; return; }
  motoBuild(); const l = $("mtLoad"); if (l) l.hidden = true;
}
function motoTankLevel(){ if (M3.ready && M3.setFuel) M3.setFuel(motoFuel().level); }
function motoView(v, btn){
  if (!M3.ready) return;
  if (v === "giro") { M3.auto = !M3.auto; btn.setAttribute("aria-pressed", M3.auto ? "true" : "false"); M3.idle = 99; return; }
  if (v === "xray") { M3.xrayForced = !M3.xray; M3.setXray(!M3.xray); if (M3.xray && M3.dist > 3.2) { M3.goDist = 2.9; M3.goYaw = M3.yaw; M3.goPitch = M3.pitch; } return; }
  M3.xrayForced = false;
  const yaw = { lado: 0, frente: Math.PI / 2, tras: -Math.PI / 2 }[v]; M3.goYaw = yaw; M3.goPitch = 0.16; M3.goDist = 3.9;
}

function motoBuild(){
  const T = THREE, cv = $("mtCanvas"), stage = $("mtStage");
  const lin = h => new T.Color(h).convertSRGBToLinear();
  const R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
  R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap; R.localClippingEnabled = true;
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(28, 1, 0.05, 50);

  // estúdio para os reflexos da pintura
  const pm = new T.PMREMGenerator(R), env = new T.Scene();
  env.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ color: 0x2a2c30, side: T.BackSide })));
  [[0, 5, 0, 7, .1, 4, 1.6], [-6, 2, 1, .1, 3, 6, 1.0], [6, 2.4, -1, .1, 3, 4, 1.2], [0, 1.5, -6, 6, 1.5, .1, .7], [0, 1.2, 6, 6, 1, .1, .5]].forEach(([x, y, z, w, h, d, k]) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ color: new T.Color(k, k, k) })); m.position.set(x, y, z); env.add(m); });
  scene.environment = pm.fromScene(env, 0.02).texture;
  scene.add(new T.HemisphereLight(0xfff4ea, 0x202226, 0.5));
  const key = new T.DirectionalLight(0xffffff, 1.5); key.position.set(1.6, 4, 2.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4 }); key.shadow.bias = -0.0005; key.shadow.radius = 5; scene.add(key);
  const rim = new T.DirectionalLight(0xffe2c4, 0.7); rim.position.set(-3, 2, -2.5); scene.add(rim);

  // materiais (cor amostrada das fotos: rosa ágata perolado)
  const paint = new T.MeshPhysicalMaterial({ color: lin(0xd2a7bb), metalness: 0.22, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0 });
  const plastic = new T.MeshStandardMaterial({ color: lin(0x17191c), roughness: 0.62, metalness: 0.02, envMapIntensity: 0.5 });
  const texPl = new T.MeshStandardMaterial({ color: lin(0x232528), roughness: 0.85, envMapIntensity: 0.3 });
  const seatM = new T.MeshStandardMaterial({ color: lin(0x101113), roughness: 0.55, envMapIntensity: 0.45 });
  const chrome = new T.MeshStandardMaterial({ color: lin(0xe1e4e8), metalness: 1, roughness: 0.1 });
  const alu = new T.MeshStandardMaterial({ color: lin(0xc4c8cd), metalness: 0.9, roughness: 0.28 });
  const rackM = new T.MeshStandardMaterial({ color: lin(0xe8e8e6), metalness: 0.15, roughness: 0.35 });
  const rubber = new T.MeshStandardMaterial({ color: lin(0x0e0f10), roughness: 0.9 });
  const glass = new T.MeshPhysicalMaterial({ color: lin(0xffffff), metalness: 0, roughness: 0.02, transmission: 0, transparent: true, opacity: 0.35, clearcoat: 1 });
  const lampM = new T.MeshStandardMaterial({ color: lin(0xffffff), emissive: lin(0xfff4e0), emissiveIntensity: 1.2 });
  const tailM = new T.MeshPhysicalMaterial({ color: lin(0x8a0d12), emissive: lin(0x5a0000), roughness: 0.15, clearcoat: 1 });
  const amberM = new T.MeshPhysicalMaterial({ color: lin(0xffa64a), emissive: lin(0x7a3a00), roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.9 });

  const bike = new T.Group(); scene.add(bike);
  const shell = [], inner = new T.Group(); bike.add(inner); inner.visible = false;
  const S = 0.0019, P = (px, py) => new T.Vector2((px - 522) * S, (690 - py) * S);
  function mergeSmooth(g){
    const pos = g.attributes.position, map = new Map(), idx = [], verts = [];
    for (let i = 0; i < pos.count; i++) { const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`; let j = map.get(k); if (j == null) { j = verts.length / 3; map.set(k, j); verts.push(pos.getX(i), pos.getY(i), pos.getZ(i)); } idx.push(j); }
    const n = new T.BufferGeometry(); n.setAttribute("position", new T.Float32BufferAttribute(verts, 3)); n.setIndex(idx); n.computeVertexNormals(); return n;
  }
  // painel moldado: contorno suave traçado da foto, extrudado com bordas arredondadas e largura que varia
  function panel(px, hw, mat, { round = 0.85, inset = 0.045, z = 0, taper = null, isShell = true, seg = 7 } = {}){
    const pts = px.map(p => P(p[0], p[1])), sh = new T.Shape(); sh.moveTo(pts[0].x, pts[0].y); sh.splineThru(pts.slice(1).concat([pts[0].clone()]));
    const bt = Math.min(hw * round, 0.16), depth = Math.max(0.002, 2 * hw - 2 * bt);
    let g = new T.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bt, bevelSize: inset, bevelOffset: -inset, bevelSegments: seg, curveSegments: 10 });
    g.translate(0, 0, -depth / 2);
    if (taper) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * taper(p.getX(i), p.getY(i))); }
    g = mergeSmooth(g);
    const m = new T.Mesh(g, mat); m.position.z = z; m.castShadow = m.receiveShadow = true; bike.add(m); if (isShell) shell.push(m); return m;
  }
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, parent = bike) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const clamp01 = v => Math.max(0, Math.min(1, v)), sm = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  // ---- carenagem (traçada da foto lateral) ----
  panel([[668,207],[705,203],[745,224],[792,264],[826,310],[843,352],[846,378],[822,396],[792,407],[772,440],[760,482],[753,530],[746,566],[734,598],[700,607],[600,607],[520,605],[452,598],[412,582],[396,560],[406,541],[462,533],[560,531],[650,537],[700,541],[719,514],[729,470],[735,420],[731,368],[714,310],[690,252],[670,224]], 0.2, paint,
    { round: 0.8, inset: 0.06, taper: (x, y) => (0.62 + 0.38 * (1 - sm(0.5, 0.66, x))) * (0.78 + 0.22 * sm(0.12, 0.4, y)) });
  panel([[612,192],[668,203],[690,252],[714,312],[730,370],[733,440],[724,500],[710,538],[688,546],[660,543],[640,520],[626,452],[616,352],[610,262]], 0.165, texPl, { round: 0.3 });
  panel([[70,337],[150,323],[250,336],[330,351],[400,373],[440,396],[461,425],[451,441],[401,453],[331,473],[281,489],[221,491],[151,471],[101,443],[80,411],[67,376]], 0.205, paint,
    { round: 0.85, inset: 0.06, taper: (x, y) => (0.6 + 0.4 * sm(-0.95, -0.5, x)) * (0.8 + 0.2 * sm(0.3, 0.5, y)) });
  panel([[280,489],[332,472],[402,453],[452,441],[472,421],[500,410],[530,430],[546,470],[546,516],[500,522],[420,531],[350,513],[300,501]], 0.17, plastic, { round: 0.35 });
  panel([[150,268],[250,281],[350,296],[430,299],[482,302],[522,322],[541,362],[536,401],[510,421],[480,401],[440,376],[380,351],[300,331],[200,319],[150,301]], 0.16, seatM, { round: 0.7, inset: 0.05,
    taper: (x, y) => 0.86 + 0.14 * sm(-0.6, -0.2, x) });
  panel([[22,256],[130,262],[152,276],[202,300],[270,326],[262,337],[200,317],[140,297],[100,287],[30,273]], 0.125, rackM, { round: 0.25, inset: 0.008 });
  panel([[606,160],[640,148],[680,106],[702,99],[732,108],[748,150],[738,186],[702,201],[662,201],[622,191]], 0.165, paint, { round: 0.55 });
  panel([[722,108],[738,116],[748,150],[742,186],[728,192],[719,150]], 0.11, glass, { round: 0.6, inset: 0.01 });
  add(new T.SphereGeometry(0.035, 20, 14), lampM, (735 - 522) * S, (690 - 148) * S, 0).scale.set(0.5, 1, 1.4);
  panel([[790,412],[832,396],[882,402],[932,422],[962,446],[942,457],[882,447],[832,441],[800,452]], 0.068, paint, { round: 0.6, inset: 0.01 });
  panel([[45,432],[100,441],[121,481],[82,522],[42,562],[34,544],[60,500]], 0.055, plastic, { round: 0.5 });
  panel([[64,330],[102,335],[100,352],[66,350]], 0.15, tailM, { round: 0.5, inset: 0.005 });
  panel([[830,362],[848,372],[846,390],[832,388]], 0.12, amberM, { round: 0.5, inset: 0.004 });
  panel([[380,600],[740,604],[736,622],[600,628],[440,624]], 0.13, plastic, { round: 0.3 });
  add(new T.BoxGeometry(0.29, 0.012, 0.27), texPl, (622 - 522) * S, (690 - 520) * S, 0); // assoalho emborrachado
  panel([[250,560],[300,522],[380,506],[452,521],[472,561],[442,611],[330,621],[262,606]], 0.075, plastic, { round: 0.5, z: 0.05 });
  const muff = panel([[80,537],[150,521],[262,541],[302,562],[292,602],[200,612],[110,602],[86,577]], 0.06, plastic, { round: 0.6, z: 0.14 });
  // rodas
  const wheel = (cx, r, front) => {
    const g = new T.Group(); g.position.set(cx, r, 0); bike.add(g);
    const tire = new T.Mesh(new T.TorusGeometry(r - 0.05, 0.05, 24, 64), rubber); tire.scale.z = 1.25; tire.castShadow = true; g.add(tire);
    const rim = new T.Mesh(new T.TorusGeometry(r - 0.085, 0.012, 12, 64), alu); g.add(rim);
    const hub = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.11, 24), alu); hub.rotation.x = Math.PI / 2; g.add(hub);
    for (let k = 0; k < 5; k++) { const a = k * 1.2566; [-.12, .12].forEach(o => { const sp = new T.Mesh(new T.BoxGeometry(0.018, r - 0.11, 0.022), alu); sp.position.set(Math.cos(a + o) * (r - 0.06) / 2, Math.sin(a + o) * (r - 0.06) / 2, 0.01); sp.rotation.z = a + o - Math.PI / 2; g.add(sp); }); }
    if (front) { const disc = new T.Mesh(new T.CylinderGeometry(0.095, 0.095, 0.005, 40), chrome); disc.rotation.x = Math.PI / 2; disc.position.z = -0.05; g.add(disc); const cal = new T.Mesh(new T.BoxGeometry(0.05, 0.075, 0.03), plastic); cal.position.set(-0.07, 0.05, -0.06); g.add(cal); }
    return g;
  };
  const wF = wheel((856 - 522) * S, 0.226, true), wR = wheel((188 - 522) * S, 0.2, false);
  const fTop = P(803, 430), fBot = new T.Vector2(wF.position.x, wF.position.y), fl = fTop.distanceTo(fBot), fang = Math.atan2(fTop.x - fBot.x, fTop.y - fBot.y);
  [-0.065, 0.065].forEach(z => { add(new T.CylinderGeometry(0.02, 0.02, fl, 16), chrome, (fTop.x + fBot.x) / 2, (fTop.y + fBot.y) / 2, z, 0, 0, -fang); add(new T.CylinderGeometry(0.026, 0.026, fl * 0.45, 16), alu, fBot.x + (fTop.x - fBot.x) * 0.22, fBot.y + (fTop.y - fBot.y) * 0.22, z, 0, 0, -fang); });
  // guidão, manoplas, retrovisores
  const hb = P(600, 176);
  add(new T.CylinderGeometry(0.012, 0.012, 0.6, 12), plastic, hb.x, hb.y, 0, Math.PI / 2);
  [-1, 1].forEach(sd => {
    add(new T.CylinderGeometry(0.018, 0.018, 0.11, 16), rubber, hb.x, hb.y, sd * 0.29, Math.PI / 2);
    add(new T.BoxGeometry(0.11, 0.008, 0.018), alu, hb.x + 0.05, hb.y + 0.01, sd * 0.25, 0, sd * 0.25, 0.05);
    const st = P(640, 150), mt = P(628, 70);
    add(new T.CylinderGeometry(0.007, 0.007, st.distanceTo(mt), 8), plastic, (st.x + mt.x) / 2, (st.y + mt.y) / 2, sd * 0.2, sd * 0.12, 0, Math.atan2(st.x - mt.x, mt.y - st.y));
    const mi = add(new T.SphereGeometry(0.05, 24, 14), plastic, mt.x, mt.y + 0.02, sd * 0.215); mi.scale.set(0.22, 0.85, 0.65);
  });

  // ---- por dentro ----
  const ghost = new T.MeshStandardMaterial({ color: lin(0xffffff), roughness: 0.4 });
  const steel = new T.MeshStandardMaterial({ color: lin(0x9aa0a6), metalness: 0.85, roughness: 0.35 });
  const castAl = new T.MeshStandardMaterial({ color: lin(0xb7b2a8), metalness: 0.6, roughness: 0.5 });
  const darkM = new T.MeshStandardMaterial({ color: lin(0x2b2e33), metalness: 0.3, roughness: 0.5 });
  const copper = new T.MeshStandardMaterial({ color: lin(0xc87533), metalness: 0.8, roughness: 0.35 });
  const fuelM = new T.MeshPhysicalMaterial({ color: lin(0xffb547), emissive: lin(0x6a3a00), transparent: true, opacity: 0.85, roughness: 0.1 });
  const coolM = new T.MeshPhysicalMaterial({ color: lin(0x1b2a6b), transparent: true, opacity: 0.85, roughness: 0.1 });
  const tankM = new T.MeshPhysicalMaterial({ color: lin(0xffffff), transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false });
  const ia = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => add(geo, mat, x, y, z, rx, ry, rz, inner);
  // motor: cárter + cilindro inclinado para frente + cabeçote + vela
  const C = new T.Vector3(-0.27, 0.27, 0), ax = 0.21, dir = new T.Vector3(Math.cos(ax), Math.sin(ax), 0);
  ia(new T.CylinderGeometry(0.085, 0.085, 0.13, 32), castAl, C.x, C.y, C.z, Math.PI / 2);
  const along = (d, z = 0) => new T.Vector3(C.x + dir.x * d, C.y + dir.y * d, z);
  const cyl = new T.Group(); cyl.position.copy(C); cyl.rotation.z = ax - Math.PI / 2; inner.add(cyl);
  const cg = (geo, mat, y, rx = 0) => { const m = new T.Mesh(geo, mat); m.position.y = y; m.rotation.x = rx; m.castShadow = true; cyl.add(m); return m; };
  const sleeve = cg(new T.CylinderGeometry(0.048, 0.048, 0.11, 32, 1, true), new T.MeshStandardMaterial({ color: lin(0xb7b2a8), metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.45, side: T.DoubleSide }), 0.13);
  for (let i = 0; i < 3; i++) cg(new T.BoxGeometry(0.11, 0.006, 0.11), castAl, 0.09 + i * 0.03);
  cg(new T.BoxGeometry(0.115, 0.06, 0.115), castAl, 0.215);
  cg(new T.BoxGeometry(0.1, 0.035, 0.1), darkM, 0.262);
  const plug = cg(new T.CylinderGeometry(0.008, 0.008, 0.06, 10), new T.MeshStandardMaterial({ color: lin(0xf2f2f2), roughness: 0.3 }), 0.3);
  const piston = cg(new T.CylinderGeometry(0.044, 0.044, 0.045, 32), new T.MeshStandardMaterial({ color: lin(0xd5d8dc), metalness: 0.9, roughness: 0.25 }), 0.12);
  const rod = new T.Mesh(new T.BoxGeometry(0.014, 0.1, 0.012), steel); cyl.add(rod);
  const crank = ia(new T.CylinderGeometry(0.06, 0.06, 0.03, 28), steel, C.x, C.y, 0.0, Math.PI / 2);
  // transmissão CVT do lado esquerdo: polia motora, polia movida e correia
  const pF = new T.Vector2(C.x, C.y), pR = new T.Vector2(wR.position.x, wR.position.y), rF = 0.05, rR = 0.075, zC = 0.105;
  const pulF = ia(new T.CylinderGeometry(rF, rF, 0.03, 32), steel, pF.x, pF.y, zC, Math.PI / 2);
  const pulR = ia(new T.CylinderGeometry(rR, rR, 0.03, 32), steel, pR.x, pR.y, zC, Math.PI / 2);
  [pulF, pulR].forEach(p => { for (let k = 0; k < 6; k++) { const b = new T.Mesh(new T.BoxGeometry(0.008, 0.032, p.geometry.parameters.radiusTop * 1.6), darkM); b.rotation.y = k * Math.PI / 6; p.add(b); } });
  const beltPts = []; const ang = Math.atan2(pF.y - pR.y, pF.x - pR.x);
  for (let i = 0; i <= 24; i++) { const a = ang + Math.PI / 2 - i / 24 * Math.PI; beltPts.push(new T.Vector3(pF.x + Math.cos(a) * (rF + 0.006), pF.y + Math.sin(a) * (rF + 0.006), zC)); }
  for (let i = 0; i <= 24; i++) { const a = ang - Math.PI / 2 - i / 24 * Math.PI; beltPts.push(new T.Vector3(pR.x + Math.cos(a) * (rR + 0.006), pR.y + Math.sin(a) * (rR + 0.006), zC)); }
  ia(new T.TubeGeometry(new T.CatmullRomCurve3(beltPts, true), 120, 0.007, 8, true), new T.MeshStandardMaterial({ color: lin(0x1a1a1a), roughness: 0.8 }), 0, 0, 0).scale.z = 1;
  // escapamento: coletor saindo do cabeçote até o silencioso
  const exS = along(0.2, 0), exPts = [exS, new T.Vector3(exS.x + 0.02, exS.y - 0.12, 0.02), new T.Vector3(exS.x - 0.08, 0.11, 0.08), new T.Vector3(-0.42, 0.12, 0.13), new T.Vector3(-0.55, 0.17, 0.14)];
  ia(new T.TubeGeometry(new T.CatmullRomCurve3(exPts), 60, 0.015, 12, false), copper, 0, 0, 0);
  // tanque sob o assoalho, com nível de gasolina
  const tk = { x0: -0.02, x1: 0.32, y0: 0.13, y1: 0.29, z: 0.13 };
  const tank = ia(new T.BoxGeometry(tk.x1 - tk.x0, tk.y1 - tk.y0, tk.z * 2), tankM, (tk.x0 + tk.x1) / 2, (tk.y0 + tk.y1) / 2, 0); tank.castShadow = false;
  const tankE = new T.LineSegments(new T.EdgesGeometry(tank.geometry), new T.LineBasicMaterial({ color: lin(0xffd08a), transparent: true, opacity: 0.8 })); tank.add(tankE);
  const fuel = ia(new T.BoxGeometry(tk.x1 - tk.x0 - 0.01, 1, tk.z * 2 - 0.01), fuelM, (tk.x0 + tk.x1) / 2, tk.y0, 0); fuel.castShadow = false;
  ia(new T.CylinderGeometry(0.018, 0.018, 0.2, 14), darkM, 0.33, 0.37, 0, 0, 0, -0.5);
  M3.setFuel = lv => { const f = lv == null ? 0.5 : Math.max(0.02, lv / TANK), h = (tk.y1 - tk.y0 - 0.01) * f; fuel.scale.y = h; fuel.position.y = tk.y0 + 0.005 + h / 2; };
  // baú sob o assento, com capacete para dar a escala
  const trunk = ia(new T.BoxGeometry(0.5, 0.26, 0.27), new T.MeshPhysicalMaterial({ color: lin(0xffffff), transparent: true, opacity: 0.08, depthWrite: false }), -0.47, 0.57, 0); trunk.castShadow = false;
  trunk.add(new T.LineSegments(new T.EdgesGeometry(trunk.geometry), new T.LineBasicMaterial({ color: lin(0xffe2b0), transparent: true, opacity: 0.9 })));
  const helmet = ia(new T.SphereGeometry(0.115, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), new T.MeshPhysicalMaterial({ color: lin(0xf2efe9), roughness: 0.2, clearcoat: 1 }), -0.5, 0.47, 0);
  ia(new T.BoxGeometry(0.01, 0.06, 0.16), new T.MeshStandardMaterial({ color: 0x222, roughness: 0.2 }), -0.395, 0.52, 0);
  // bateria sob o escudo, radiador, reservatório do líquido, filtro de ar, amortecedor
  const bat = ia(new T.BoxGeometry(0.11, 0.08, 0.07), new T.MeshStandardMaterial({ color: lin(0x1c1d20), roughness: 0.6 }), 0.5, 0.52, 0);
  ia(new T.CylinderGeometry(0.008, 0.008, 0.015, 10), new T.MeshStandardMaterial({ color: lin(0xc8202a) }), 0.47, 0.565, 0.02); ia(new T.CylinderGeometry(0.008, 0.008, 0.015, 10), darkM, 0.53, 0.565, 0.02);
  const rad = ia(new T.BoxGeometry(0.14, 0.12, 0.025), darkM, -0.1, 0.3, -0.13);
  for (let i = 0; i < 9; i++) ia(new T.BoxGeometry(0.004, 0.11, 0.028), steel, -0.165 + i * 0.016, 0.3, -0.13);
  const res = ia(new T.CylinderGeometry(0.025, 0.025, 0.07, 18), new T.MeshPhysicalMaterial({ color: lin(0xffffff), transparent: true, opacity: 0.35 }), -0.13, 0.46, -0.06);
  ia(new T.CylinderGeometry(0.022, 0.022, 0.04, 18), coolM, -0.13, 0.448, -0.06);
  const air = ia(new T.BoxGeometry(0.2, 0.09, 0.08), darkM, -0.56, 0.42, 0.1, 0, 0, -0.15);
  const shk = []; for (let i = 0; i <= 80; i++) { const t = i / 80, a = t * Math.PI * 2 * 7; shk.push(new T.Vector3(-0.78 + t * 0.06 + Math.cos(a) * 0.022, 0.24 + t * 0.24, 0.12 + Math.sin(a) * 0.022)); }
  ia(new T.TubeGeometry(new T.CatmullRomCurve3(shk), 200, 0.005, 6, false), new T.MeshStandardMaterial({ color: lin(0xd6352a), metalness: 0.4, roughness: 0.4 }), 0, 0, 0);
  ia(new T.CylinderGeometry(0.012, 0.012, 0.3, 10), chrome, -0.75, 0.36, 0.12, 0, 0, -0.24);

  // ---- raio-X: carenagem vira holograma ----
  const hudC = new T.Color((getComputedStyle(document.documentElement).getPropertyValue("--hud1").trim()) || "#FFC27A");
  const ghostM = new T.MeshPhysicalMaterial({ color: hudC, transparent: true, opacity: 0.1, roughness: 0.2, depthWrite: false, side: T.DoubleSide, emissive: hudC, emissiveIntensity: 0.15 });
  const edgeM = new T.LineBasicMaterial({ color: hudC, transparent: true, opacity: 0.45 });
  shell.forEach(m => { m.userData.solid = m.material; const e = new T.LineSegments(new T.EdgesGeometry(m.geometry, 28), edgeM); e.visible = false; m.add(e); m.userData.edge = e; });
  M3.xray = false;
  M3.setXray = on => {
    M3.xray = on; inner.visible = on;
    shell.forEach(m => { m.material = on ? ghostM : m.userData.solid; m.castShadow = !on; m.userData.edge.visible = on; });
    const b = document.querySelector('.mt-ctl [data-v="xray"]'); if (b) b.setAttribute("aria-pressed", on ? "true" : "false");
    const h = $("mtHint"); if (h) h.textContent = on ? "Raio-X ligado · afaste para voltar à pintura" : "Arraste para girar · aproxime para ver por dentro";
    pins.forEach(p => p.classList.toggle("in", p.dataset.k === (on ? "in" : "out")));
  };

  // plataforma
  const floor = new T.Mesh(new T.CircleGeometry(1.6, 64), new T.ShadowMaterial({ opacity: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const ring = new T.Mesh(new T.RingGeometry(1.18, 1.195, 128), new T.MeshBasicMaterial({ color: hudC, transparent: true, opacity: 0.9 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; scene.add(ring);
  const glow = new T.Mesh(new T.RingGeometry(1.0, 1.4, 128), new T.MeshBasicMaterial({ color: hudC, transparent: true, opacity: 0.08, blending: T.AdditiveBlending, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.003; scene.add(glow);
  const ticks = new T.Group(); for (let i = 0; i < 90; i++) { const t = new T.Mesh(new T.PlaneGeometry(0.007, i % 6 ? 0.035 : 0.075), ring.material); const a = i / 90 * Math.PI * 2; t.position.set(Math.cos(a) * 1.27, 0.003, Math.sin(a) * 1.27); t.rotation.set(-Math.PI / 2, 0, -a + Math.PI / 2); ticks.add(t); } scene.add(ticks);

  // marcadores: por fora e por dentro
  const HOT = [
    { k: "out", p: [0.64, 0.24, -0.08], n: [0.1, 0, -1], t: "Freio a disco", s: "dianteiro, com CBS" },
    { k: "out", p: [-0.42, 0.75, 0], n: [0, 1, 0], t: "Baú", s: "sob o assento · até 10 kg" },
    { k: "out", p: [0.41, 1.03, 0], n: [1, 0.2, 0], t: "Farol", s: "no guidão" },
    { k: "out", p: [0.2, 0.33, 0.14], n: [0, 0.4, 1], t: "Tanque", s: "6,5 L sob o assoalho" },
    { k: "in", p: along(0.24).toArray(), n: null, t: "Cabeçote e vela", s: "vela: trocar a cada 8.000 km" },
    { k: "in", p: along(0.12).toArray(), n: null, t: "Pistão", s: "50 × 55 mm · compressão 11:1" },
    { k: "in", p: [C.x, C.y - 0.06, 0.12], n: null, t: "Transmissão CVT", s: "correia: trocar a cada 20.000 km" },
    { k: "in", p: [0.15, 0.27, 0.13], n: null, t: "Tanque", s: "", fuel: true },
    { k: "in", p: [-0.47, 0.7, 0.13], n: null, t: "Baú", s: "cabe um capacete · até 10 kg" },
    { k: "in", p: [0.5, 0.57, 0.04], n: null, t: "Bateria", s: "selada, atrás do escudo" },
    { k: "in", p: [-0.1, 0.36, -0.14], n: null, t: "Radiador", s: "arrefecimento líquido · 0,41 L" },
    { k: "in", p: [-0.56, 0.47, 0.14], n: null, t: "Filtro de ar", s: "trocar a cada 16.000 km" },
    { k: "in", p: [-0.75, 0.48, 0.13], n: null, t: "Amortecedor", s: "traseiro" }
  ];
  const hotL = $("mtHot"); hotL.innerHTML = HOT.map((h, i) => `<div class="mt-pin${h.k === "out" ? " in" : ""}" data-k="${h.k}" data-i="${i}"><i></i><span><b>${h.t}</b><em>${h.s}</em></span></div>`).join("");
  const pins = [...hotL.children];
  pins.forEach((el, i) => el.addEventListener("click", () => { M3.sel = M3.sel === i ? null : i; el._w = 0; }));
  const fuelPin = () => { const F = motoFuel(), i = HOT.findIndex(h => h.fuel), e = pins[i] && pins[i].querySelector("em"); if (e) e.textContent = F.level == null ? "6,5 L · nível ainda desconhecido" : `${mtN(F.level, 1)} L de 6,5 L`; };
  fuelPin(); const _set = M3.setFuel; M3.setFuel = lv => { _set(lv); fuelPin(); }; M3.setFuel(motoFuel().level);

  // câmera: arrastar gira, pinça aproxima; de perto liga o raio-X
  Object.assign(M3, { yaw: 0.75, pitch: 0.2, dist: 4.1, vy: 0, auto: true, idle: 0, goYaw: null, goPitch: null, goDist: null, xrayForced: false });
  const ptrs = new Map(); let lastTap = 0, pinch0 = 0, dist0 = 0;
  cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); M3.idle = 0; M3.goYaw = M3.goPitch = M3.goDist = null; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = M3.dist; } const n = performance.now(); if (n - lastTap < 300 && ptrs.size === 1) { M3.goYaw = 0.75; M3.goPitch = 0.2; M3.goDist = 4.1; M3.xrayForced = false; } lastTap = n; });
  cv.addEventListener("pointermove", e => {
    if (!ptrs.has(e.pointerId)) return; const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 1) { const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; M3.vy = -dx * 0.008; M3.yaw += M3.vy; M3.pitch = Math.max(0.02, Math.min(1.2, M3.pitch + dy * 0.005)); }
    else if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; M3.dist = Math.max(1.3, Math.min(6, dist0 * pinch0 / Math.hypot(a[0] - b[0], a[1] - b[1]))); }
    M3.idle = 0;
  });
  const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("wheel", e => { e.preventDefault(); M3.dist = Math.max(1.3, Math.min(6, M3.dist * (1 + e.deltaY * 0.001))); M3.idle = 0; }, { passive: false });

  M3.resize = () => { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  addEventListener("resize", M3.resize); M3.resize();

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, tgt = new T.Vector3(0, 0.52, 0), v3 = new T.Vector3(), nv = new T.Vector3(), camDir = new T.Vector3();
  M3.last = performance.now(); let crankA = 0; const SPARK = lin(0x66aaff), NOSPARK = new T.Color(0);
  M3.loop = now => {
    if (current !== "moto" || document.hidden) { M3.run = false; return; }
    const dt = Math.min(0.05, (now - M3.last) / 1000); M3.last = now; M3.idle += dt;
    if (M3.goYaw != null) { let d = M3.goYaw - M3.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); const k = Math.min(1, dt * 5); M3.yaw += d * k; M3.pitch += (M3.goPitch - M3.pitch) * k; M3.dist += (M3.goDist - M3.dist) * k; if (Math.abs(d) < 0.002 && Math.abs(M3.goDist - M3.dist) < 0.01) M3.goYaw = null; }
    else if (!ptrs.size) { M3.vy *= 0.92; M3.yaw += M3.vy; if (M3.auto && !reduce && M3.idle > 3 && !M3.xray) M3.yaw += dt * 0.22; }
    const D = M3.dist * Math.max(1, 1.05 / cam.aspect);
    const near = M3.dist < 2.75; if (!M3.xrayForced && near !== M3.xray) M3.setXray(near);
    tgt.y = M3.xray ? 0.42 : 0.52;
    cam.position.set(Math.sin(M3.yaw) * Math.cos(M3.pitch) * D, tgt.y + Math.sin(M3.pitch) * D, Math.cos(M3.yaw) * Math.cos(M3.pitch) * D); cam.lookAt(tgt);
    // motor girando no raio-X: virabrequim, biela, pistão, polias
    if (M3.xray && !reduce) {
      crankA += dt * 5; const r = 0.0275, L = 0.1, sy = r * Math.cos(crankA) + Math.sqrt(L * L - Math.pow(r * Math.sin(crankA), 2));
      piston.position.y = 0.035 + sy; rod.position.set(r * Math.sin(crankA) / 2, (r * Math.cos(crankA) + piston.position.y) / 2, 0); rod.rotation.z = -Math.atan2(r * Math.sin(crankA), piston.position.y - r * Math.cos(crankA)); rod.scale.y = Math.hypot(r * Math.sin(crankA), piston.position.y - r * Math.cos(crankA)) / 0.1;
      crank.rotation.y = crankA; pulF.rotation.y = crankA; pulR.rotation.y = crankA * rF / rR; plug.material.emissive.copy(Math.cos(crankA) > 0.98 ? SPARK : NOSPARK);
    }
    ticks.rotation.y += reduce ? 0 : dt * 0.06; glow.material.opacity = 0.06 + 0.03 * Math.sin(now / 700);
    R.render(scene, cam);
    const w = stage.clientWidth, h = stage.clientHeight; cam.getWorldDirection(camDir);
    const placed = [];
    HOT.forEach((hs, i) => {
      const el = pins[i]; if ((hs.k === "in") !== M3.xray) return;
      v3.set(...hs.p).add(bike.position); let vis = true; if (hs.n) { nv.set(...hs.n).normalize(); vis = nv.dot(camDir) < -0.1; }
      v3.project(cam); const px = (v3.x * 0.5 + 0.5) * w, py = (-v3.y * 0.5 + 0.5) * h;
      if (px < 8 || px > w - 8 || py < 50 || py > h - 30) vis = false;
      el.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px)`; el.classList.toggle("off", !vis); const left = px > w * 0.56; el.classList.toggle("l", left);
      if (vis) { const lw = el._w || (el._w = (el.querySelector("span").offsetWidth || 150)), x0 = left ? px - 16 - lw : px + 10, r = [x0, py - 18, x0 + lw, py + 18]; const hit = placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]); const show = !hit || M3.sel === i; el.classList.toggle("dot", !show); if (show) placed.push(r); }
    });
    requestAnimationFrame(M3.loop);
  };
  M3.ready = true; M3.run = true; requestAnimationFrame(M3.loop);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && current === "moto" && !M3.run) { M3.run = true; M3.last = performance.now(); requestAnimationFrame(M3.loop); } });
}
