"use strict";
/* ÍRIS · Permissões e privacidade: esconde dados sensíveis antes de qualquer texto sair para a IA.
   CPF, números de cartão e valores em dinheiro viram marcadores ([CPF_1], [CARTAO_1], [VALOR_1]).
   A IA trabalha só com os marcadores; a resposta volta com os dados reais, só na tela.
   Cada conversa com a IA usa uma sessão própria: o mesmo dado recebe sempre o mesmo marcador. */
(function () {
  const MONEY_KEY = /^(amount|valor|valores|total|totais|income|renda|saldo|gasto|gastos|spent|budget|budgets|orcamento|limite|limit|planned|paid|contracted|price|preco|livre|previsto|reserve|reserva|parcela|valorparcela|fatura|entrada|entradas|saida|saidas|sobra|falta|media|pago|apagar|aPagar|restante|economia|meta)$/i;
  const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
  const CARD = /\b\d(?:[ -]?\d){12,18}\b/g;
  const MONEY = /R\$\s?-?\s?\d[\d.]*(?:,\d{1,2})?|\b\d+(?:[.,]\d{1,2})?\s?reais\b|\b\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?\b|\b\d+,\d{2}\b/gi;
  const TAG = /\[(CPF|CARTAO|VALOR)_(\d+)\]/g;

  const luhn = digits => { let sum = 0, alt = false; for (let i = digits.length - 1; i >= 0; i--) { let d = +digits[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } sum += d; alt = !alt; } return sum % 10 === 0; };
  const brl = n => "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* "R$ 1.234,56", "42,50", "42 reais", 42.5 → 42.5 */
  function toNumber(v) {
    if (typeof v === "number") return v;
    let s = String(v == null ? "" : v).replace(/R\$|reais/gi, "").replace(/\s/g, "");
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    const n = parseFloat(s); return isFinite(n) ? n : 0;
  }

  function session() {
    const real = new Map(), byReal = new Map(), count = { CPF: 0, CARTAO: 0, VALOR: 0 };
    const tag = (kind, value) => {
      const k = kind + "|" + value; if (byReal.has(k)) return byReal.get(k);
      const t = `[${kind}_${++count[kind]}]`; real.set(t, value); byReal.set(k, t); return t;
    };
    const mask = text => {
      if (typeof text !== "string" || !text) return text;
      return text
        .replace(CPF, m => tag("CPF", m))
        .replace(CARD, m => { const d = m.replace(/\D/g, ""); return d.length >= 13 && d.length <= 19 && luhn(d) ? tag("CARTAO", m) : m; })
        .replace(MONEY, m => tag("VALOR", m.trim()));
    };
    const unmask = text => typeof text === "string" ? text.replace(TAG, t => real.has(t) ? real.get(t) : t) : text;
    const maskDeep = (v, key) => {
      if (typeof v === "string") return mask(v);
      if (typeof v === "number") return key && MONEY_KEY.test(key) ? tag("VALOR", brl(v)) : v;
      if (Array.isArray(v)) return v.map(x => maskDeep(x, key));
      if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = maskDeep(x, k); return o; }
      return v;
    };
    const unmaskDeep = v => {
      if (typeof v === "string") return unmask(v);
      if (Array.isArray(v)) return v.map(unmaskDeep);
      if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = unmaskDeep(x); return o; }
      return v;
    };
    /* conteúdo no formato do Gemini: só as partes de texto e as respostas de ferramentas */
    const maskContents = contents => contents.map(c => ({ ...c, parts: (c.parts || []).map(p =>
      typeof p.text === "string" ? { ...p, text: mask(p.text) } :
      p.functionResponse ? { functionResponse: { name: p.functionResponse.name, response: maskDeep(p.functionResponse.response) } } : p) }));
    return { mask, unmask, maskDeep, unmaskDeep, maskContents, get size() { return real.size; } };
  }

  window.irisPrivacy = { session, toNumber };
})();
