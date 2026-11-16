-- ÍRIS · fase 0: central de aprovações e registro de auditoria.
-- proposals: ações que a IA preparou e que esperam o seu sim.
-- audit_log: tudo o que a IA, você ou um conector fez. Só aceita acréscimos.

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,                       -- nome da ação (ex.: adicionar_item, criar_evento)
  title text not null default '',           -- resumo legível
  payload jsonb not null default '{}'::jsonb,
  origin text not null default 'conversa',  -- conversa, esvaziar, conector:gmail...
  reason text not null default '',          -- por que virou proposta
  risk text not null default 'baixo' check (risk in ('baixo','medio','alto')),
  status text not null default 'pendente' check (status in ('pendente','aprovada','recusada','executada','falhou')),
  result jsonb,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  executed_at timestamptz
);
create index if not exists proposals_user_status on public.proposals (user_id, status, created_at desc);
alter table public.proposals enable row level security;
create policy "proposals: dona lê" on public.proposals for select to authenticated using (user_id = (select auth.uid()));
create policy "proposals: dona cria" on public.proposals for insert to authenticated with check (user_id = (select auth.uid()));
create policy "proposals: dona decide" on public.proposals for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  at timestamptz not null default now(),
  actor text not null check (actor in ('ia','natalia','conector','sistema')),
  action text not null,
  target text,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists audit_log_user_at on public.audit_log (user_id, at desc);
alter table public.audit_log enable row level security;
create policy "audit_log: dona lê" on public.audit_log for select to authenticated using (user_id = (select auth.uid()));
create policy "audit_log: dona acrescenta" on public.audit_log for insert to authenticated with check (user_id = (select auth.uid()));
-- sem políticas de update e delete: o registro não pode ser alterado nem apagado pelo app.
