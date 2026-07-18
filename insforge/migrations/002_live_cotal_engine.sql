-- Upgrade an existing EvidenceOps schema to the live Cotal + InsForge engine.

alter table public.evidence_runs add column if not exists execution_source text not null default 'stage-demo';
alter table public.evidence_runs add column if not exists mesh_auth_mode text not null default 'simulated';
alter table public.evidence_runs add column if not exists updated_at timestamptz not null default now();
alter table public.evidence_runs drop constraint if exists evidence_runs_status_check;
alter table public.evidence_runs add constraint evidence_runs_status_check
  check (status in ('queued', 'processing', 'awaiting_physician', 'approved', 'blocked'));

alter table public.agent_events add column if not exists delivery_verified boolean not null default false;
alter table public.agent_events add column if not exists cotal_message_id text;

create table if not exists public.run_requests (
  id text primary key,
  pmid text not null,
  status text not null check (status in ('queued', 'processing', 'complete', 'error')),
  requested_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  result_run_id text references public.evidence_runs(id) on delete set null,
  error text,
  worker_id text
);

create index if not exists run_requests_status_requested_idx on public.run_requests(status, requested_at);
alter table public.run_requests enable row level security;

-- Add permissive hackathon policies only when they do not already exist.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'evidence_runs' and policyname = 'demo update evidence runs') then
    create policy "demo update evidence runs" on public.evidence_runs for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'run_requests' and policyname = 'demo read run requests') then
    create policy "demo read run requests" on public.run_requests for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'run_requests' and policyname = 'demo insert run requests') then
    create policy "demo insert run requests" on public.run_requests for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'run_requests' and policyname = 'demo update run requests') then
    create policy "demo update run requests" on public.run_requests for update using (true) with check (true);
  end if;
end $$;
