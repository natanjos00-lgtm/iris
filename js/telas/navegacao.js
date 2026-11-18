"use strict";
/* ÍRIS · Interface: rotas, tema, painel v2, app instalável. */

/* ---------- rotas ---------- */
const ROUTES = ["inicio","pessoal","trabalho","faculdade","casa","metas","projetos","biblioteca","financeiro","moto","iris","aprovacoes","entrada"];
function route(){
  let r = (location.hash || "#inicio").slice(1); if (!ROUTES.includes(r)) r = "inicio";
  for (const k of ROUTES) $("v-"+k).hidden = k !== r;
  document.querySelectorAll("[data-r]").forEach(a => { if (a.dataset.r === r) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
  current = r; document.body.dataset.route = r; document.body.classList.remove("menu"); renderView(); scrollTo(0,0);
}
let current = "inicio";
function renderView(){ if (current === "inicio") renderHome(); else if (current === "financeiro") renderFin(); else if (current === "moto") renderMoto(); else if (current === "aprovacoes") renderApprovals(); else if (current === "entrada") renderEntrada(); else if (AREAS[current]) renderArea(current); }
function renderAll(){
  // não redesenhar a área enquanto alguém digita nela
  const a = document.activeElement;
  if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA") && current !== "inicio" && a.closest("#v-"+current) && a.value) { pendingRender = true; return; }
  renderView();
}
let pendingRender = false;
document.addEventListener("focusout", () => { if (pendingRender) { pendingRender = false; setTimeout(() => { const a = document.activeElement; if (a && a !== document.body && (a.tagName === "INPUT" || a.tagName === "SELECT" || a.tagName === "TEXTAREA")) { pendingRender = true; return; } renderView(); }, 0); } });
addEventListener("hashchange", route);


/* ---------- tema claro/escuro (salvo neste aparelho) ---------- */
const THEME_KEY = "iris.theme";
function themeMode(){ try { return localStorage.getItem(THEME_KEY) || "auto"; } catch { return "auto"; } }
function themeApply(){
  const m = themeMode(); const dark = m === "dark" || (m === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  const r = document.documentElement; r.setAttribute("data-theme", dark ? "dark" : "light"); r.setAttribute("data-theme-mode", m);
  // no claro a esfera é desenhada e depois invertida: este tom vira ameixa depois da inversão
  try { const g = dark ? [255,236,210] : [255,236,210]; NN_GOLD[0] = g[0]; NN_GOLD[1] = g[1]; NN_GOLD[2] = g[2]; } catch {}
  const tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.content = dark ? "#0F0B08" : "#F4ECE2";
  const ts = $("themeSide"); if (ts) { ts.querySelector("use").setAttribute("href", dark ? "#i-sun" : "#i-moon"); ts.querySelector("span").textContent = dark ? "Modo claro" : "Modo escuro"; ts.title = ts.querySelector("span").textContent; }
  const tb = $("themeBtn"); if (tb) { tb.querySelector("use").setAttribute("href", dark ? "#i-sun" : "#i-moon"); tb.setAttribute("aria-label", dark ? "Mudar para o tema claro" : "Mudar para o tema escuro"); }
}
function themeSet(m){ try { localStorage.setItem(THEME_KEY, m); } catch {} themeApply(); }
try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (themeMode() === "auto") themeApply(); }); } catch {}
function sideApply(min){ document.documentElement.classList.toggle("side-min", min); const b = $("sideToggle"); if (b) { b.setAttribute("aria-expanded", String(!min)); const t = min ? "Expandir menu" : "Recolher menu"; b.title = t; b.setAttribute("aria-label", t); b.querySelector("span").textContent = t; } }
sideApply(document.documentElement.classList.contains("side-min"));
$("sideToggle").onclick = () => { const min = !document.documentElement.classList.contains("side-min"); try { localStorage.setItem("iris.side2", min ? "min" : "open"); } catch {} sideApply(min); setTimeout(() => { try { dispatchEvent(new Event("resize")); } catch {} }, 300); };
$("themeBtn").onclick = () => themeSet(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
$("themeSide").onclick = () => themeSet(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
themeApply();

/* ---------- painel v2: só apresentação (atalhos, marca, sino, menu) ---------- */
function v2Extras(){
  const t = today();
  const hasToday = calEvents.some(e => e.day === t) || items.some(it => !it.done && it.date === t && it.kind !== "ritual");
  ["dotB","dotM"].forEach(i => { const e = $(i); if (e) e.hidden = !hasToday; });
  const wf = $("weekFocus"); if (wf) {
    const g = items.filter(it => ["meta","objetivo","projeto"].includes(it.kind) && !it.done).sort((a,b) => (b.focus - a.focus) || (stepsPct(b) - stepsPct(a))).slice(0,2).map(x => x.title);
    const f = items.filter(it => it.focus && !it.done && it.kind !== "ritual").slice(0,2).map(x => x.title);
    const list = g.length ? g : f;
    wf.textContent = list.length ? list.join(" e ") + "." : "Escolha o que mais importa e a ÍRIS acompanha com você.";
  }
}
function goFocus(hash, sel){ location.hash = hash; setTimeout(() => { const e = document.querySelector(sel); if (e) { e.scrollIntoView({ block:"center", behavior:"smooth" }); e.focus({ preventScroll:true }); } }, 250); }
document.querySelectorAll(".sc").forEach(b => b.onclick = () => {
  const k = b.dataset.go;
  if (k === "trabalho") goFocus("#trabalho", "#v-trabalho input[type=text]");
  else if (k === "gasto") goFocus("#financeiro", "#fVal");
  else if (k === "ideia") openMind();
  else if (k === "plano") { location.hash = "#iris"; setTimeout(() => send("Quero criar um plano. Me ajude a começar com duas ou três perguntas curtas."), 120); }
  else if (k === "meta") goFocus("#metas", "#v-metas input[type=text]");
});
const toAgenda = () => { if (current !== "inicio") location.hash = "#inicio"; setTimeout(() => { const b = document.querySelector('.hbtn[data-p="dkComp"]'); if (b && b.getAttribute("aria-expanded") !== "true") b.click(); else { const e = $("dkComp"); if (e) e.scrollIntoView({ block:"center", behavior:"smooth" }); } }, 150); };
// o sino abre os avisos (ativar no celular, testar) com atalho para os compromissos de hoje
$("tBell").onclick = () => openNotif(); $("bellM").onclick = () => openNotif();
$("tSearch").onclick = () => { if (current !== "inicio") location.hash = "#inicio"; setTimeout(() => $("askIn").focus(), 150); };
$("tUser").onclick = () => openPrefs();
$("menuBtn").onclick = () => document.body.classList.toggle("menu");
$("tabMenu").onclick = () => document.body.classList.toggle("menu");
$("scrim").onclick = () => document.body.classList.remove("menu");
$("nav").addEventListener("click", () => document.body.classList.remove("menu"));
$("tabMic").onclick = () => toggleListen();
$("orbMic").onclick = () => toggleListen();
$("tabAgenda").onclick = () => { if (current !== "inicio") location.hash = "#inicio"; setTimeout(() => { const e = $("dkComp"); if (e) e.scrollIntoView({ block:"start", behavior:"smooth" }); }, 200); };
document.body.dataset.route = "inicio";



/* ---------- app instalável ---------- */
let installEv = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEv = e; const b = $("installBtn"); if (b) b.hidden = false; });
addEventListener("appinstalled", () => { installEv = null; const b = $("installBtn"); if (b) b.hidden = true; toast("App instalado."); });
$("installBtn").onclick = async () => { if (!installEv) return; installEv.prompt(); try { await installEv.userChoice; } catch {} installEv = null; $("installBtn").hidden = true; };
if ("serviceWorker" in navigator) addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
