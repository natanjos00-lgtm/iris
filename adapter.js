/* Adaptador: faz o Supabase responder com a mesma interface que a ÍRIS já usa
   (claude.use("db"|"user"|"sample"|"mcp")). Assim o código do app não muda. */
(function () {
  const cfg = window.IRIS_CONFIG;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  window.irisSb = sb;

  /* ---------- login por link no e-mail (gratuito) ---------- */
  function loginScreen() {
    return new Promise(resolve => {
      const st = document.createElement("style");
      st.textContent = `
        .lg{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;color:#f5e9d7;font-family:"Figtree",system-ui,sans-serif;
          background:radial-gradient(55% 45% at 50% 40%,rgba(255,150,60,.18),transparent 70%),radial-gradient(30% 30% at 8% 6%,rgba(255,190,110,.14),transparent 70%),linear-gradient(180deg,#120d09,#1c140e 60%,#140e0a)}
        .lg form{width:100%;max-width:340px;display:grid;gap:14px;justify-items:center;text-align:center}
        .lg .orb{width:120px;height:120px;border-radius:50%;position:relative;margin-bottom:6px;background:radial-gradient(circle,rgba(44,28,15,.95) 40%,rgba(224,150,70,.22) 75%,transparent 76%)}
        .lg .orb::before,.lg .orb::after{content:"";position:absolute;inset:6px;border-radius:50%;border:2px solid transparent;border-top-color:#f0b05f;border-right-color:rgba(240,176,95,.35);animation:lgspin 7s linear infinite}
        .lg .orb::after{inset:20px;border-top-color:rgba(255,214,160,.8);border-right-color:transparent;border-left-color:rgba(240,176,95,.5);animation-duration:11s;animation-direction:reverse}
        @keyframes lgspin{to{transform:rotate(360deg)}}
        .lg h1{font-family:"Cormorant Garamond",Georgia,serif;font-weight:500;font-size:44px;letter-spacing:.14em;margin:0;line-height:1}
        .lg p{margin:0;color:#d3c0a7;font-size:14.5px;line-height:1.5}
        .lg input{width:100%;box-sizing:border-box;padding:13px 16px;border:1px solid rgba(224,164,88,.45);border-radius:999px;font-size:16px;background:rgba(30,22,15,.8);color:#f5e9d7;outline:none;text-align:center}
        .lg input::placeholder{color:#b39d85}
        .lg input:focus{border-color:#e0a458;box-shadow:0 0 18px rgba(224,140,60,.2)}
        .lg button{width:100%;padding:13px;border:0;border-radius:999px;background:#e0a458;color:#1d130b;font-size:16px;font-weight:500;cursor:pointer}
        .lg .m{min-height:1.3em;font-size:13.5px;color:#e6b57c}`;
      document.head.appendChild(st);
      const box = document.createElement("div"); box.className = "lg";
      box.innerHTML = '<form><div class="orb" aria-hidden="true"></div><h1>ÍRIS</h1><p>Digite seu e-mail. Você recebe um link para entrar, sem senha.</p><input type="email" required placeholder="seu@email.com" autocomplete="email" inputmode="email"><button>Enviar link</button><p class="m" aria-live="polite"></p></form>';
      document.body.appendChild(box);
      const f = box.querySelector("form"), m = box.querySelector(".m");
      f.onsubmit = async e => {
        e.preventDefault(); m.textContent = "Enviando…";
        const { error } = await sb.auth.signInWithOtp({ email: f.querySelector("input").value.trim(), options: { emailRedirectTo: location.origin + location.pathname } });
        m.textContent = error ? "Não consegui enviar. Confira o e-mail e tente de novo." : "Link enviado. Abra o e-mail neste aparelho.";
      };
      sb.auth.onAuthStateChange((_ev, session) => { if (session) { box.remove(); st.remove(); resolve(session.user.id); } });
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

  /* ---------- IA (Gemini, via função "chat" no Supabase; a chave fica lá, nunca aqui) ---------- */
  async function callFn(name, body) {
    await userId;
    const { data, error } = await sb.functions.invoke(name, { body });
    if (error) {
      let detail = "";
      try { const j = await error.context.json(); detail = j.detail || j.error || ""; } catch {}
      throw { code: "fn_error", detail };
    }
    return data;
  }
  const blobToB64 = b => new Promise(res => { const r = new FileReader(); r.onload = () => res({ mime: b.type || "image/jpeg", data: String(r.result).split(",")[1] }); r.readAsDataURL(b); });
  const sample = async (messages, opts = {}) => {
    const d = await callFn("chat", { messages });
    if (opts.onText) opts.onText({ text: d.text, delta: d.text });
    return { text: d.text, truncated: !!d.truncated };
  };
  sample.limits = async () => ({ tools: false, images: { maxCount: 4, mediaTypes: ["image/png", "image/jpeg", "image/webp"] } });
  sample.json = async (prompt, opts = {}) => {
    const images = opts.images ? await Promise.all(opts.images.map(blobToB64)) : [];
    const d = await callFn("chat", { messages: [{ role: "user", content: prompt }], json: true, images });
    try { return JSON.parse(d.text); } catch { const m = d.text.match(/[\[{][\s\S]*[\]}]/); if (m) return JSON.parse(m[0]); throw { code: "bad_json" }; }
  };

  const caps = {
    db: { collection },
    user: { id: () => userId },
    sample,
    mcp: null // Gmail e Google Agenda por login do Google: o app lê a agenda por endereço secreto (função "agenda")
  };
  window.claude = { use: async name => caps[name] || null };
})();
