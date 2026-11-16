// ÍRIS · função "ingest": recebe o que os conectores leram (hoje, o Apps Script do Google)
// e grava na central de entrada. Não usa login: confere o token do conector, guardado só como
// resumo (sha-256) na tabela connectors. Grava no máximo 200 itens por chamada, com campos cortados.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? (() => { try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!).default; } catch { return ""; } })();
const svc = createClient(Deno.env.get("SUPABASE_URL")!, svcKey);
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const SOURCES: Record<string, string> = { gmail: "email", agenda: "evento", drive: "arquivo" };
const cut = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const httpsOrNull = (v: unknown) => { const s = String(v ?? ""); try { const u = new URL(s); return u.protocol === "https:" ? s.slice(0, 600) : null; } catch { return null; } };
const isoOrNull = (v: unknown) => { const d = new Date(String(v ?? "")); return isNaN(d.getTime()) ? null : d.toISOString(); };

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/* dados extras permitidos, por origem (nada além disso é guardado) */
function extra(source: string, d: Record<string, unknown>) {
  if (source === "agenda") return { inicio: isoOrNull(d.inicio), fim: isoOrNull(d.fim), diaInteiro: !!d.diaInteiro, local: cut(d.local, 200), organizador: cut(d.organizador, 200), resposta: cut(d.resposta, 30) };
  if (source === "drive") return { tipo: cut(d.tipo, 120), dono: cut(d.dono, 200), modificadoPor: cut(d.modificadoPor, 200) };
  if (source === "gmail") return { naoLido: !!d.naoLido, conversa: cut(d.conversa, 120), rotulos: Array.isArray(d.rotulos) ? d.rotulos.slice(0, 12).map((x) => cut(x, 40)) : [] };
  return {};
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const token = String(body?.token ?? "");
  if (token.length < 30 || token.length > 200) return json({ error: "forbidden" }, 403);
  const { data: con } = await svc.from("connectors").select("id,user_id,status").eq("token_hash", await sha256(token)).maybeSingle();
  if (!con) return json({ error: "forbidden" }, 403);
  if (con.status === "pausado") return json({ ok: true, pausado: true, recebidos: 0 });

  const now = new Date().toISOString();
  if (body.erro) {
    await svc.from("connectors").update({ status: "erro", last_error: cut(body.erro, 300), last_sync_at: now }).eq("id", con.id);
    return json({ ok: true, registrado: "erro" });
  }

  const events = Array.isArray(body.events) ? body.events.slice(0, 200) : [];
  const rows = [];
  for (const e of events) {
    const source = String(e?.source ?? "");
    if (!SOURCES[source]) continue;
    const external_id = cut(e.external_id, 200);
    if (!external_id) continue;
    rows.push({
      user_id: con.user_id, source, external_id, kind: SOURCES[source],
      title: cut(e.title, 300), snippet: cut(e.snippet, 500), sender: cut(e.sender, 200),
      url: httpsOrNull(e.url), occurred_at: isoOrNull(e.occurred_at),
      data: extra(source, (e.data && typeof e.data === "object") ? e.data : {}), updated_at: now,
    });
  }
  if (rows.length) {
    const { error } = await svc.from("inbox_events").upsert(rows, { onConflict: "user_id,source,external_id" });
    if (error) {
      await svc.from("connectors").update({ status: "erro", last_error: "não consegui gravar: " + cut(error.message, 200), last_sync_at: now }).eq("id", con.id);
      return json({ error: "db" }, 500);
    }
  }
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.source] = (counts[r.source] ?? 0) + 1;
  await svc.from("connectors").update({ status: "ok", last_error: null, last_sync_at: now, last_counts: counts }).eq("id", con.id);
  return json({ ok: true, recebidos: rows.length });
});
