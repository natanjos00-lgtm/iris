"use strict";
/* ÍRIS · Inicialização. */

/* ---------- inicialização ---------- */
route();
renderTimers();
setInterval(() => { if (current === "inicio") renderHome(); }, 60000);
(async () => {
  sizeCore();
  if (!window.claude || !window.claude.use) { local.load(); finLocal.load(); loaded = true; calState = "error"; calMsg = "A agenda aparece quando a página é aberta no claude.ai."; mailState = "error"; mailMsg = "Os e-mails aparecem quando a página é aberta no claude.ai."; renderInbox(); renderView(); return; }
  const fallback = setTimeout(() => { if (!loaded) { local.load(); finLocal.load(); loaded = true; renderView(); } }, 10000);
  const [db, u, s, m] = await Promise.all([claude.use("db"), claude.use("user"), claude.use("sample"), claude.use("mcp")]);
  sample = s; mcp = m;

  let uid = null; if (u) { try { uid = await u.id(); } catch {} }
  if (db && uid) {
    const base = "data/users/" + uid + "/iris";
    col = db.collection(base + "/items"); finCol = db.collection(base + "/fintx"); finMeta = db.collection(base + "/fin");
    let migrated = false;
    col.onSnapshot(async snap => { clearTimeout(fallback); items = snap.docs.map(d => ({ id:d.id, ...d.data() })); loaded = true;
      if (!migrated) { migrated = true; const old = store.get("iris.items", []); if (snap.empty && old.length && !store.get("iris.migrated", false)) { store.set("iris.migrated", true); for (const it of old) { const { id, ...b } = it; try { await col.doc().set(b); } catch {} } toast("Trouxe suas listas deste navegador para o seu espaço."); } }
      renderAll(); },
      () => { clearTimeout(fallback); col = null; local.load(); loaded = true; toast("Suas listas estão sendo guardadas só neste navegador por enquanto."); renderAll(); });
    finCol.onSnapshot(snap => { fintx = snap.docs.map(d => ({ id:d.id, ...d.data() })); renderFinIfOpen(); }, () => { finCol = null; finMeta = null; finLocal.load(); renderFinIfOpen(); });
    finMeta.onSnapshot(snap => { for (const d of snap.docs) { if (d.id === "cfg") fincfg = Object.assign({ income:0, savingsPct:10, reserve:0, reserveGoalMonths:6, budgets:{}, cards:[], fixed:[] }, d.data()); else if (d.id === "prefs") { prefs = Object.assign({}, prefs, d.data()); store.set("iris.prefs", prefs); applyName(); } else if (d.id.startsWith("an-")) finAn = Object.assign({}, finAn, { [d.id.slice(3)]: d.data() }); } renderFinIfOpen(); }, () => {});
  } else { clearTimeout(fallback); local.load(); finLocal.load(); loaded = true; }

  if (mcp) { watchCal(); watchMail(); } else if (window.irisSb) { loadIcs(); setInterval(() => { if (!document.hidden) loadIcs(); }, 10*60*1000); mailState = "error"; mailNeedsLink = true; mailMsg = "Ligue o Gmail para ver aqui os e-mails importantes."; renderInbox(); if (store.get("iris.g_gmail", false)) setTimeout(() => loadGmail(false), 1500); setInterval(() => { if (!document.hidden && store.get("iris.g_gmail", false)) loadGmail(false); }, 10*60*1000); } else { calState = "error"; calMsg = "A agenda aparece quando a página é aberta no claude.ai."; mailState = "error"; mailMsg = "Os e-mails aparecem quando a página é aberta no claude.ai."; renderInbox(); }
  if (window.irisCasaRead) setTimeout(() => loadCasa(), 2500); else { casaState = "error"; casaMsg = casaErr("casa_indisponivel"); }
  if (!mcp && window.irisSb) { if (gLoad()) loadGmail(false); setTimeout(resumeGoogle, 600); }
  hello(); renderView();
})();
