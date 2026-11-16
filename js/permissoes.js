"use strict";
/* ÍRIS · Permissões e aprovações: decide o que a IA pode fazer sozinha e o que espera o seu sim.
   Regras (garantidas aqui, no código, e não só no texto que a IA recebe):
   - fonte externa (e-mails, agenda, casa): pode ler; a partir daí, a conversa fica "contaminada";
   - ação interna (listas, foco, etapas, lançamentos): executa se o pedido veio de você;
     se a conversa leu conteúdo de fora, vira proposta na central de aprovações;
   - ação externa (Google Agenda e futuros envios e publicações): só com o seu sim;
   - ferramenta sem regra (conectores novos): sempre vira proposta.
   Tudo o que é executado ou decidido fica no registro de auditoria. */
(function () {
  const POLICY = {
    buscar_emails: "fonte", consultar_agenda: "fonte", consultar_casa: "fonte",
    resumo_financeiro: "livre", iniciar_temporizador: "livre",
    adicionar_item: "interna", concluir_item: "interna", definir_foco: "interna", adicionar_etapas: "interna", registrar_lancamento: "interna",
    criar_evento: "externa"
  };
  const RISK = { interna: "baixo", externa: "medio", nova: "alto" };
  const sb = () => window.irisSb;
  const short = (s, n) => { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
  const itemTitle = id => { try { const it = (typeof items !== "undefined" ? items : []).find(x => x.id === String(id)); return it ? it.title : "um item"; } catch { return "um item"; } };

  function describe(name, a) {
    a = a || {};
    switch (name) {
      case "adicionar_item": return `Adicionar "${short(a.titulo, 80)}"${a.data ? " para " + a.data : ""}`;
      case "concluir_item": return `Concluir "${short(itemTitle(a.id), 80)}"`;
      case "definir_foco": return `Trocar o foco de hoje (${(a.ids || []).length} itens)`;
      case "adicionar_etapas": return `Acrescentar ${(a.etapas || []).length} etapas em "${short(itemTitle(a.id), 60)}"`;
      case "registrar_lancamento": return `Registrar ${a.tipo === "entrada" ? "entrada" : "gasto"} de ${a.valor}: ${short(a.descricao, 60)}`;
      case "criar_evento": return `Criar "${short(a.titulo, 80)}" no Google Agenda em ${a.data}${a.inicio ? " às " + a.inicio : ""}`;
      default: return `Executar ${name}`;
    }
  }

  async function audit(actor, action, target, detail) {
    try { if (sb()) await sb().from("audit_log").insert({ actor, action, target: target || null, detail: detail || {} }); } catch {}
  }

  async function propose(name, args, origin, reason, level) {
    const row = { kind: name, title: describe(name, args), payload: args || {}, origin: origin || "conversa", reason: reason || "", risk: RISK[level] || "medio" };
    const { data, error } = await sb().from("proposals").insert(row).select("id").maybeSingle();
    if (error) throw new Error("não consegui guardar a proposta");
    await audit("ia", "propos:" + name, data && data.id, { title: row.title, origin: row.origin });
    try { window.dispatchEvent(new Event("iris:aprovacoes")); } catch {}
    return data && data.id;
  }

  /* uma sessão por conversa com a IA */
  function session(origin) { return { origin: origin || "conversa", tainted: false }; }

  async function run(tool, args, ctx, opts) {
    const level = POLICY[tool.name] || "nova";
    if (level === "fonte") { ctx.tainted = true; return tool.execute(args, opts); }
    if (level === "livre") return tool.execute(args, opts);
    const reason = level === "nova" ? "Ação sem regra definida: toda ação nova passa por você."
      : ctx.tainted ? "O pedido surgiu depois de a ÍRIS ler conteúdo de fora (e-mail, agenda ou casa)." : "";
    if (level === "nova" || ctx.tainted) {
      await propose(tool.name, args, ctx.origin, reason, level);
      return { status: "aguardando_aprovacao", mensagem: "Deixei isso na central de aprovações. Avise que a ação só acontece depois do sim dela." };
    }
    const r = await tool.execute(args, opts);
    await audit("ia", tool.name, (r && r.id) || null, { args, origin: ctx.origin });
    return r;
  }

  async function list() {
    const pend = await sb().from("proposals").select("*").eq("status", "pendente").order("created_at", { ascending: false });
    const done = await sb().from("proposals").select("*").neq("status", "pendente").order("created_at", { ascending: false }).limit(15);
    return { pending: pend.data || [], recent: done.data || [] };
  }
  async function count() {
    try { const { count: n } = await sb().from("proposals").select("id", { count: "exact", head: true }).eq("status", "pendente"); return n || 0; } catch { return 0; }
  }
  async function decide(p, approve) {
    const now = new Date().toISOString();
    if (!approve) {
      await sb().from("proposals").update({ status: "recusada", decided_at: now }).eq("id", p.id);
      await audit("natalia", "recusou", p.id, { title: p.title });
      return { ok: true };
    }
    await sb().from("proposals").update({ status: "aprovada", decided_at: now }).eq("id", p.id);
    await audit("natalia", "aprovou", p.id, { title: p.title });
    const tool = (typeof TOOLS !== "undefined" ? TOOLS : []).find(t => t.name === p.kind);
    try {
      if (!tool) throw new Error("ação não disponível nesta versão da ÍRIS");
      const result = await tool.execute(p.payload || {}, { preapproved: true });
      await sb().from("proposals").update({ status: "executada", executed_at: new Date().toISOString(), result: result || {} }).eq("id", p.id);
      await audit("ia", p.kind, p.id, { args: p.payload, aprovada: true });
      return { ok: true, result };
    } catch (e) {
      const msg = String((e && (e.message || e.code)) || e || "falhou");
      await sb().from("proposals").update({ status: "falhou", executed_at: new Date().toISOString(), result: { erro: msg } }).eq("id", p.id);
      await audit("sistema", "falhou:" + p.kind, p.id, { erro: msg });
      return { ok: false, error: msg };
    }
  }
  async function history(limit) {
    const { data } = await sb().from("audit_log").select("*").order("at", { ascending: false }).limit(limit || 20);
    return data || [];
  }

  window.irisPermissions = { POLICY, session, run, propose, list, count, decide, history, audit, describe };
})();
