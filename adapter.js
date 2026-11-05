/* Adaptador: faz o Supabase responder com a mesma interface que a ÍRIS já usa
   (claude.use("db"|"user"|"sample"|"mcp")). Assim o código do app não muda. */
(function () {
  const cfg = window.IRIS_CONFIG;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  window.irisSb = sb;

  /* ---------- login por link no e-mail (gratuito) ---------- */
  function loginScreen() {
    return new Promise(resolve => {
      const box = document.createElement("div");
      box.style.cssText = "position:fixed;inset:0;z-index:99999;background:#f6f2ea;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;color:#3b3a37";
      box.innerHTML = '<form style="max-width:340px;width:100%;display:grid;gap:12px"><h1 style="font-weight:400;margin:0">ÍRIS</h1><p style="margin:0;opacity:.75">Digite seu e-mail. Você recebe um link para entrar, sem senha.</p><input type="email" required placeholder="seu@email.com" style="padding:12px;border:1px solid #cfc6b6;border-radius:10px;font-size:16px;background:#fff"><button style="padding:12px;border:0;border-radius:10px;background:#6b7a4f;color:#fff;font-size:16px">Enviar link</button><p class="m" style="margin:0;min-height:1.2em;font-size:14px"></p></form>';
      document.body.appendChild(box);
      const f = box.querySelector("form"), m = box.querySelector(".m");
      f.onsubmit = async e => {
        e.preventDefault(); m.textContent = "Enviando…";
        const { error } = await sb.auth.signInWithOtp({ email: f.querySelector("input").value.trim(), options: { emailRedirectTo: location.origin + location.pathname } });
        m.textContent = error ? "Não consegui enviar. Tente de novo em instantes." : "Link enviado. Abra o e-mail neste aparelho.";
      };
      sb.auth.onAuthStateChange((_ev, session) => { if (session) { box.remove(); resolve(session.user.id); } });
    });
  }
  const userId = (async () => {
    const { data } = await sb.auth.getSession();
    return data.session ? data.session.user.id : loginScreen();
  })();

  /* ---------- mapeamento documento <-> linha ---------- */
  const SPECS = {
    items: { table: "items",
      toRow: { id:"id", area:"area", kind:"kind", title:"title", date:"date", focus:"focus", done:"done", doneAt:"done_at", steps:"steps", doneDates:"done_dates", createdAt:"created_at" } },
    fintx: { table: "fintx",
      toRow: { id:"id", type:"type", amount:"amount", desc:"descr", cat:"cat", method:"method", card:"card", date:"date", month:"month", fixedId:"fixed_id", inst:"inst", createdAt:"created_at" } }
  };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c === "x" ? r : (r&3|8)).toString(16); }));
  const isUuid = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  function docToRow(spec, doc) {
    const row = {}, extra = {};
    for (const [k, v] of Object.entries(doc)) {
      if (k === "id") continue;
      if (spec.toRow[k]) row[spec.toRow[k]] = v === undefined ? null : v; else extra[k] = v;
    }
    row.extra = extra; return row;
  }
  function rowToDoc(spec, row) {
    const doc = { id: row.id };
    for (const [k, col] of Object.entries(spec.toRow)) if (k !== "id" && row[col] !== null && row[col] !== undefined) doc[k] = col === "amount" ? Number(row[col]) : row[col];
    return Object.assign(doc, row.extra || {});
  }

  /* ---------- coleção estilo Firestore ---------- */
  function collection(path) {
    const name = path.split("/").pop();
    const listeners = new Set();
    const notify = async () => { for (const l of listeners) await l.run(); };
    const snapOf = docs => ({ docs: docs.map(d => ({ id: d.id, data: () => d.data })), empty: !docs.length });

    async function fetchAll() {
      const uid = await userId;
      if (name === "fin") {
        const { data, error } = await sb.from("fin").select("key,data").eq("user_id", uid);
        if (error) throw error; return data.map(r => ({ id: r.key, data: r.data }));
      }
      const spec = SPECS[name];
      const { data, error } = await sb.from(spec.table).select("*").eq("user_id", uid);
      if (error) throw error;
      return data.map(r => { const d = rowToDoc(spec, r); const { id, ...rest } = d; return { id, data: rest }; });
    }

    function doc(id) {
      const key = id || uuid();
      return {
        id: key,
        async set(body) {
          const uid = await userId;
          if (name === "fin") { const { error } = await sb.from("fin").upsert({ user_id: uid, key, data: body, updated_at: new Date().toISOString() }); if (error) throw error; }
          else { const spec = SPECS[name]; const row = docToRow(spec, body); row.id = isUuid(key) ? key : uuid(); row.user_id = uid; const { error } = await sb.from(spec.table).upsert(row); if (error) throw error; }
          await notify();
        },
        async update(patch) {
          const uid = await userId;
          if (name === "fin") { const cur = await sb.from("fin").select("data").eq("user_id", uid).eq("key", key).maybeSingle(); const { error } = await sb.from("fin").upsert({ user_id: uid, key, data: Object.assign({}, cur.data && cur.data.data, patch) }); if (error) throw error; }
          else {
            const spec = SPECS[name]; const row = {}; const extra = {};
            for (const [k, v] of Object.entries(patch)) { if (k === "id") continue; if (spec.toRow[k]) row[spec.toRow[k]] = v === undefined ? null : v; else extra[k] = v; }
            if (Object.keys(extra).length) { const cur = await sb.from(spec.table).select("extra").eq("id", key).maybeSingle(); row.extra = Object.assign({}, cur.data && cur.data.extra, extra); }
            const { error } = await sb.from(spec.table).update(row).eq("id", key); if (error) throw error;
          }
          await notify();
        },
        async delete() {
          const uid = await userId;
          const q = name === "fin" ? sb.from("fin").delete().eq("user_id", uid).eq("key", key) : sb.from(SPECS[name].table).delete().eq("id", key);
          const { error } = await q; if (error) throw error; await notify();
        }
      };
    }

    function onSnapshot(ok, fail) {
      const l = { async run() { try { ok(snapOf(await fetchAll())); } catch (e) { if (fail) fail(e); } } };
      listeners.add(l); l.run();
      document.addEventListener("visibilitychange", () => { if (!document.hidden) l.run(); });
      return () => listeners.delete(l);
    }
    return { doc, onSnapshot };
  }

  const caps = {
    db: { collection },
    user: { id: () => userId },
    sample: null, // IA e leitura de faturas: etapa seguinte (função no Supabase com a chave do Gemini)
    mcp: null     // Agenda e Gmail: etapa seguinte (login do Google próprio)
  };
  window.claude = { use: async name => caps[name] || null };
})();
