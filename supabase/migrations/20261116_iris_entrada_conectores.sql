-- ÍRIS · fase 1: conectores e central de entrada.
-- connectors: cada conector (hoje, o Google pelo Apps Script) com o resumo do token e o estado da última sincronização.
-- inbox_events: tudo o que chega de fora, uma linha por item externo, sem duplicar.

create table if not exists public.connectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,                         -- google_apps_script
  label text not null default '',
  token_hash text,                            -- sha-256 do token; o token em si nunca é guardado
  status text not null default 'aguardando' check (status in ('aguardando','ok','erro','pausado')),
  last_sync_at timestamptz,
  last_error text,
  last_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, kind)
);
create unique index if not exists connectors_token_hash on public.connectors (token_hash) where token_hash is not null;
alter table public.connectors enable row level security;
create policy "connectors: dona lê" on public.connectors for select to authenticated using (user_id = (select auth.uid()));
create policy "connectors: dona cria" on public.connectors for insert to authenticated with check (user_id = (select auth.uid()));
create policy "connectors: dona altera" on public.connectors for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "connectors: dona remove" on public.connectors for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.inbox_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('gmail','agenda','drive')),
  external_id text not null,
  kind text not null default 'outro',         -- email, evento, arquivo
  title text not null default '',
  snippet text not null default '',
  sender text not null default '',
  url text,
  occurred_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  triage jsonb,                               -- preenchido pela IA na fase 2
  status text not null default 'novo' check (status in ('novo','visto','arquivado','convertido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);
create index if not exists inbox_events_user_status on public.inbox_events (user_id, status, occurred_at desc);
alter table public.inbox_events enable row level security;
-- só a função "ingest" (chave de servidor) grava novos itens; o app lê e muda a situação
create policy "inbox_events: dona lê" on public.inbox_events for select to authenticated using (user_id = (select auth.uid()));
create policy "inbox_events: dona altera" on public.inbox_events for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
