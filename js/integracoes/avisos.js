"use strict";
/* ÍRIS · Integrações: avisos por push. */

/* ---------- avisos (notificações push) ---------- */
const pushOk = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const b64u = s => { const p = "=".repeat((4 - s.length % 4) % 4), b = (s + p).replace(/-/g, "+").replace(/_/g, "/"), r = atob(b); return Uint8Array.from(r, c => c.charCodeAt(0)); };
async function pushState(){ if (!pushOk()) return "unsupported"; if (Notification.permission === "denied") return "denied"; try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); return sub && Notification.permission === "granted" ? "on" : "off"; } catch { return "off"; } }
async function pushEnable(){
  const key = window.IRIS_CONFIG && window.IRIS_CONFIG.VAPID_PUBLIC_KEY; if (!key) throw new Error("A chave dos avisos não está no config.js.");
  const perm = await Notification.requestPermission(); if (perm !== "granted") throw new Error("A permissão não foi dada. Libere as notificações para este app nas configurações do aparelho.");
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:b64u(key) });
  const j = sub.toJSON();
  const { error } = await window.irisSb.from("push_subs").upsert({ endpoint:j.endpoint, p256dh:j.keys.p256dh, auth:j.keys.auth, ua:navigator.userAgent.slice(0,180) }, { onConflict:"endpoint" });
  if (error) throw new Error("Não consegui guardar este aparelho: " + (error.message || "erro"));
}
async function pushDisable(){ try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) { try { await window.irisSb.from("push_subs").delete().eq("endpoint", sub.endpoint); } catch {} await sub.unsubscribe(); } } catch {} }
async function pushCall(mode){ const { data, error } = await window.irisSb.functions.invoke("notify", { body:{ mode } }); if (error) { let d = ""; try { d = (await error.context.json()).error || ""; } catch {} throw new Error(d || error.message || "falhou"); } return data; }
async function openNotif(){
  document.body.classList.remove("menu");
  const slot = $("dlgSlot"); slot.textContent = ""; const close = () => { slot.textContent = ""; };
  const st = h("p",{class:"muted",style:"margin:0"}), out = h("p",{class:"small",style:"margin:0;min-height:20px"});
  const bOn = h("button",{class:"btn",type:"button"},"Ativar avisos neste aparelho"), bTest = h("button",{class:"btn ghost",type:"button"},"Enviar um aviso de teste"), bNow = h("button",{class:"btn ghost",type:"button"},"Ver o resumo de hoje"), bOff = h("button",{class:"btn ghost",type:"button"},"Desativar neste aparelho");
  const f = h("form",{class:"dlg",role:"dialog","aria-modal":"true",autocomplete:"off"},
    h("h2",{class:"t"},"Avisos no celular"),
    h("p",{class:"muted small",style:"margin:0"},"A ÍRIS manda um resumo às 7h30 (compromissos, atrasos, contas) e avisa cerca de 1 hora antes de cada compromisso do Google Agenda."),
    st, bOn, bTest, bNow, bOff, out,
    h("div",{class:"row-end"}, h("button",{class:"btn ghost",type:"button",onclick:close},"Fechar")));
  const ov = h("div",{class:"overlay",onclick:e => { if (e.target === ov) close(); }}, f); slot.append(ov);
  const refresh = async () => { const s = await pushState();
    st.textContent = s === "on" ? "Avisos ativados neste aparelho." : s === "denied" ? "As notificações estão bloqueadas para este app. Libere nas configurações do aparelho." : s === "unsupported" ? "Este navegador não permite avisos. No iPhone, instale o app: Compartilhar > Adicionar à Tela de Início, abra pelo ícone e volte aqui (precisa do iOS 16.4 ou mais novo)." : "Avisos desativados neste aparelho.";
    bOn.hidden = s === "on" || s === "unsupported" || s === "denied"; bTest.hidden = bNow.hidden = bOff.hidden = s !== "on"; };
  const run = async (fn, okMsg) => { out.textContent = "Um instante…"; try { const r = await fn(); out.textContent = typeof okMsg === "function" ? okMsg(r) : okMsg; } catch (e) { out.textContent = "Não deu: " + (e && e.message || "erro"); } refresh(); };
  bOn.onclick = () => run(pushEnable, "Pronto! Avisos ativados. Toque em \"Enviar um aviso de teste\".");
  bTest.onclick = () => run(() => pushCall("test"), r => r && r.ok ? "Enviei. Deve chegar em alguns segundos." : "Não chegou a enviar" + (r && r.errs && r.errs.length ? " (" + r.errs.join(", ") + ")" : "") + ".");
  bNow.onclick = () => run(() => pushCall("digest_now"), r => r && r.sent ? "Enviei o resumo de hoje." : "Nada para avisar hoje.");
  bOff.onclick = () => run(pushDisable, "Avisos desativados neste aparelho.");
  refresh();
}
$("notifBtn").onclick = openNotif;
