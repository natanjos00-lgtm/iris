"use strict";
/* ÍRIS · Integrações: registro de conectores.
   Cada conector é uma linha na tabela connectors e uma entrada em CONECTORES abaixo.
   Para um conector novo: acrescente a entrada aqui e faça ele enviar para a função "ingest";
   a central de entrada já mostra o que chegar, sem mudar o resto do app. */

const CONECTORES = {
  google_apps_script: {
    label: "Google (Gmail, Agenda e Drive)",
    resumo: "Lê e-mails da caixa principal, compromissos dos próximos 14 dias e arquivos alterados no Drive. Só leitura, a cada 30 minutos, pelo Apps Script na sua conta.",
    fontes: ["gmail", "agenda", "drive"],
    configurar: () => openGoogleSetup()
  }
};
const FONTE_LABEL = { gmail:"Gmail", agenda:"Agenda", drive:"Drive" };
const INGEST_URL = () => ((window.IRIS_CONFIG && window.IRIS_CONFIG.SUPABASE_URL) || "") + "/functions/v1/ingest";

async function conectoresEstado(){
  const { data, error } = await window.irisSb.from("connectors").select("*");
  if (error) throw error; return data || [];
}

/* token novo: o app mostra uma vez; o banco guarda só o resumo (sha-256) */
async function gerarTokenConector(kind){
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = "iris_" + btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const dig = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const token_hash = [...new Uint8Array(dig)].map(x => x.toString(16).padStart(2, "0")).join("");
  const sb = window.irisSb; const label = (CONECTORES[kind] || {}).label || kind;
  const { data: ex } = await sb.from("connectors").select("id").eq("kind", kind).maybeSingle();
  const r = ex ? await sb.from("connectors").update({ token_hash, status:"aguardando", last_error:null, label }).eq("id", ex.id)
               : await sb.from("connectors").insert({ kind, label, token_hash, status:"aguardando" });
  if (r.error) throw r.error;
  if (window.irisPermissions) irisPermissions.audit("natalia", "gerou_token", kind, { conector: label });
  return token;
}

function tempoDesde(iso){
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora"; if (min < 60) return `há ${min} min`;
  const hh = Math.round(min / 60); if (hh < 48) return `há ${hh} h`;
  return `há ${Math.round(hh / 24)} dias`;
}
