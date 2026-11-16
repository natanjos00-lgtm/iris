import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const ALLOWED = (Deno.env.get("ALLOWED_EMAIL") ?? "natanjos00@gmail.com").toLowerCase();
const SP = "America/Sao_Paulo";
const URL_ = Deno.env.get("SUPABASE_URL")!;
const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? (() => { try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!).default; } catch { return ""; } })();
const svc = createClient(URL_, svcKey);
const pad = (n: number) => String(n).padStart(2, "0");

function spParts(ms: number) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: SP, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const o: Record<string, number> = {}; for (const p of f.formatToParts(new Date(ms))) if (p.type !== "literal") o[p.type] = +p.value; return o;
}
const spDay = (ms: number) => { const p = spParts(ms); return `${p.year}-${pad(p.month)}-${pad(p.day)}`; };
const addDays = (iso: string, n: number) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (iso: string) => new Date(iso + "T12:00:00Z").getUTCDay();
const inDays = (d: number) => d === 0 ? "hoje" : d === 1 ? "amanhã" : `em ${d} dias`;
function daysUntilDay(day: number, today: string) {
  const [y, m, d] = today.split("-").map(Number); const base = Date.UTC(y, m - 1, d);
  let target = Date.UTC(y, m - 1, day); if (day < d) target = Date.UTC(y, m, day);
  return Math.round((target - base) / 864e5);
}

async function cfg() {
  const { data } = await svc.from("push_cfg").select("key,value");
  const o: Record<string, string> = {}; for (const r of data ?? []) o[r.key] = r.value; return o;
}

async function sendTo(uid: string, payload: { title: string; body: string; url?: string; tag?: string }, C: Record<string, string>) {
  const { data: subs } = await svc.from("push_subs").select("*").eq("user_id", uid);
  let ok = 0, fail = 0; const errs: string[] = [];
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 1800, urgency: "high", vapidDetails: { subject: C.vapid_subject, publicKey: C.vapid_public, privateKey: C.vapid_private } });
      ok++;
    } catch (e: any) {
      fail++; errs.push(String(e?.statusCode ?? e?.message ?? e).slice(0, 80));
      if (e?.statusCode === 404 || e?.statusCode === 410) await svc.from("push_subs").delete().eq("id", s.id);
    }
  }
  return { subs: (subs ?? []).length, ok, fail, errs };
}

async function events(uid: string, C: Record<string, string>): Promise<any[]> {
  try {
    const r = await fetch(`${URL_}/functions/v1/agenda`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron-secret": C.cron_secret }, body: JSON.stringify({ user_id: uid }) });
    const j = await r.json(); return Array.isArray(j.events) ? j.events : [];
  } catch { return []; }
}

async function dataFor(uid: string) {
  const { data: items } = await svc.from("items").select("area,kind,title,date,done").eq("user_id", uid).eq("done", false);
  const { data: finRows } = await svc.from("fin").select("key,data").eq("user_id", uid).in("key", ["cfg", "prefs", "rotina"]);
  const fincfg = finRows?.find((r) => r.key === "cfg")?.data ?? {}; const prefs = finRows?.find((r) => r.key === "prefs")?.data ?? {};
  const rotina = finRows?.find((r) => r.key === "rotina")?.data ?? null;
  return { items: items ?? [], fincfg, rotina, name: String(prefs.name || "Natália") };
}

async function digest(uid: string, C: Record<string, string>) {
  const now = Date.now(); const today = spDay(now); const tomorrow = addDays(today, 1);
  const { items, fincfg, name } = await dataFor(uid); const ev = await events(uid, C);
  const lines: string[] = [];
  const todayEv = ev.filter((e) => e.day === today && !e.allDay);
  if (todayEv.length) lines.push(`${todayEv.length === 1 ? "1 compromisso" : todayEv.length + " compromissos"} hoje: ${todayEv[0].time} ${todayEv[0].title}${todayEv.length > 1 ? " e mais " + (todayEv.length - 1) : ""}.`);
  const over = items.filter((i) => i.kind !== "ritual" && i.date && i.date < today);
  if (over.length) lines.push(`${over.length === 1 ? "1 item atrasado" : over.length + " itens atrasados"}: ${over[0].title}${over.length > 1 ? " e mais " + (over.length - 1) : ""}.`);
  const dueToday = items.filter((i) => i.kind !== "ritual" && i.date === today);
  if (dueToday.length) lines.push(`Para hoje: ${dueToday.slice(0, 2).map((i) => i.title).join(", ")}${dueToday.length > 2 ? " e mais " + (dueToday.length - 2) : ""}.`);
  const tmw = items.filter((i) => i.kind !== "ritual" && i.date === tomorrow);
  if (tmw.length) lines.push(`Amanhã: ${tmw.slice(0, 2).map((i) => i.title).join(", ")}.`);
  for (const c of (fincfg.cards ?? [])) if (+c.dueDay) { const d = daysUntilDay(+c.dueDay, today); if (d <= 3) lines.push(`Fatura do ${c.name} vence ${inDays(d)}.`); }
  const ym = today.slice(0, 7);
  const { data: paid } = await svc.from("fintx").select("fixed_id").eq("user_id", uid).eq("month", ym).not("fixed_id", "is", null);
  const paidSet = new Set((paid ?? []).map((p) => p.fixed_id));
  for (const f of (fincfg.fixed ?? [])) if (+f.day && f.freq !== "semanal" && !paidSet.has(f.id)) { const d = daysUntilDay(+f.day, today); if (d <= 2 && +f.day >= +today.slice(8)) lines.push(`${f.desc} vence ${inDays(d)}.`); }
  if (!lines.length) return { sent: false, reason: "nada para avisar" };
  const hr = spParts(now).hour; const greet = hr < 12 ? "Bom dia" : hr < 18 ? "Boa tarde" : "Boa noite";
  const r = await sendTo(uid, { title: `${greet}, ${name}`, body: lines.slice(0, 4).join("\n"), url: "./", tag: "digest" }, C);
  return { sent: true, lines, ...r };
}

async function soon(uid: string, C: Record<string, string>) {
  const now = Date.now(); const today = spDay(now); const p = spParts(now); const nowM = p.hour * 60 + p.minute;
  const ev = (await events(uid, C)).filter((e) => e.day === today && !e.allDay && e.time);
  const out: any[] = [];
  for (const e of ev) {
    const [h, m] = String(e.time).split(":").map(Number); const diff = h * 60 + m - nowM;
    if (diff > 0 && diff <= 60) {
      const key = `soon:${uid}:${today}:${e.time}:${String(e.title).slice(0, 40)}`;
      const { data: seen } = await svc.from("notif_log").select("key").eq("key", key).maybeSingle();
      if (seen) continue;
      await svc.from("notif_log").insert({ key });
      const r = await sendTo(uid, { title: `Daqui a ${diff} min`, body: `${e.time} · ${e.title}${e.location ? "\n" + e.location : ""}`, url: "./", tag: "soon" }, C);
      out.push({ e: e.title, ...r });
    }
  }
  return { sent: out.length > 0, out };
}

/* rotina com horários (ex.: plano de horas extras): a ÍRIS avisa em cada horário combinado.
   fin/rotina = { de, ate, pular:[datas], extra:{ "1":1,... horas a mais por dia da semana }, devendo, metaHoras,
                  avisos:[{ id, hora:"05:10", dias:[1,2,3,4], titulo, texto }] }
   No texto: {nome}, {dia}, {banco}, {meta} são preenchidos. */
function planDays(R: any, until: string) { // dias do plano antes de `until`
  const out: string[] = []; if (!R?.de) return out;
  for (let d = R.de; d < until && d <= R.ate; d = addDays(d, 1)) if ((R.extra ?? {})[String(dow(d))] && !(R.pular ?? []).includes(d)) out.push(d);
  return out;
}
function fmtH(h: number) { const s = h < 0 ? "−" : "+"; const a = Math.abs(h); const H = Math.floor(a), M = Math.round((a - H) * 60); return `${s}${H}h${M ? pad(M) : ""}`; }
async function rotina(uid: string, C: Record<string, string>) {
  const { rotina: R, name } = await dataFor(uid); if (!R || !Array.isArray(R.avisos)) return { sent: false, reason: "sem rotina" };
  const now = Date.now(); const today = spDay(now); const p = spParts(now); const nowM = p.hour * 60 + p.minute;
  if (today < R.de || today > R.ate || (R.pular ?? []).includes(today)) return { sent: false, reason: "fora do período" };
  const done = planDays(R, today); const hrs = done.reduce((a, d) => a + (+R.extra[String(dow(d))] || 0), 0);
  const banco = hrs - (+R.devendo || 0), total = planDays(R, addDays(R.ate, 1)).length, diaN = done.length + 1;
  const paidH = Math.max(0, banco), meta = +R.metaHoras || 0;
  const fill = (s: string) => s.replace(/\{nome\}/g, name).replace(/\{dia\}/g, `${diaN} de ${total}`).replace(/\{banco\}/g, fmtH(banco))
    .replace(/\{meta\}/g, meta ? `${Math.min(meta, Math.round(paidH))} de ${meta}h para os R$ 300` : "");
  const out: any[] = [];
  for (const a of R.avisos) {
    if (!(a.dias ?? []).includes(dow(today))) continue;
    const [h, m] = String(a.hora).split(":").map(Number); const diff = nowM - (h * 60 + m);
    if (diff < 0 || diff > 6) continue;
    const key = `rotina:${uid}:${today}:${a.id}`;
    const { data: seen } = await svc.from("notif_log").select("key").eq("key", key).maybeSingle(); if (seen) continue;
    await svc.from("notif_log").insert({ key });
    const r = await sendTo(uid, { title: fill(a.titulo), body: fill(a.texto), url: "./", tag: "rotina-" + a.id }, C);
    out.push({ id: a.id, ...r });
  }
  return { sent: out.length > 0, out, banco };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const C = await cfg();
  if (!C.vapid_private) return json({ error: "no_cfg" }, 500);
  const body = await req.json().catch(() => ({}));
  const mode = String(body.mode ?? "");
  const cronH = req.headers.get("x-cron-secret");

  if (cronH) {
    if (cronH !== C.cron_secret) return json({ error: "forbidden" }, 403);
    const { data: users } = await svc.from("push_subs").select("user_id");
    const ids = [...new Set((users ?? []).map((u) => u.user_id))];
    const res: any[] = [];
    for (const uid of ids) {
      try {
        if (mode === "digest") {
          const key = `digest:${uid}:${spDay(Date.now())}`;
          const { data: seen } = await svc.from("notif_log").select("key").eq("key", key).maybeSingle();
          if (seen) { res.push({ uid, skipped: "já enviado hoje" }); continue; }
          const r = await digest(uid, C); if (r.sent) await svc.from("notif_log").insert({ key }); res.push({ uid, ...r });
        } else if (mode === "soon") res.push({ uid, ...(await soon(uid, C)) });
        else if (mode === "rotina") res.push({ uid, ...(await rotina(uid, C)) });
      } catch (e) { res.push({ uid, error: String(e).slice(0, 120) }); }
    }
    return json({ ok: true, mode, res });
  }

  // chamada do app (teste): precisa estar logada na conta permitida
  const sb = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: u } = await sb.auth.getUser();
  if (!u.user || (u.user.email ?? "").toLowerCase() !== ALLOWED) return json({ error: "forbidden" }, 403);
  if (mode === "test") {
    const r = await sendTo(u.user.id, { title: "ÍRIS", body: "Teste: os avisos estão funcionando neste aparelho.", url: "./", tag: "test" }, C);
    return json({ ok: r.ok > 0, ...r });
  }
  if (mode === "digest_now") { const r = await digest(u.user.id, C); return json({ ok: true, ...r }); }
  return json({ error: "mode" }, 400);
});
