-- Hackathon schema for durable EvidenceOps runs and live Cotal coordination.
-- Apply through the InsForge SQL editor or migration workflow.

create table if not exists public.evidence_runs (
  id text primary key,
  pmid text not null,
  journal text not null,
  article_title text not null,
  quality_score integer not null check (quality_score between 0 and 100),
  status text not null check (status in ('queued', 'processing', 'awaiting_physician', 'approved', 'blocked')),
  execution_source text not null default 'stage-demo',
  mesh_auth_mode text not null default 'simulated',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_events (
  id bigint generated always as identity primary key,
  run_id text not null references public.evidence_runs(id) on delete cascade,
  sequence integer not null,
  sender text not null,
  recipient text not null,
  event_kind text not null,
  phase text not null,
  message text not null,
  signature_verified boolean not null default false,
  delivery_verified boolean not null default false,
  cotal_message_id text,
  created_at timestamptz not null default now(),
  unique (run_id, sequence)
);

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

create index if not exists evidence_runs_created_at_idx on public.evidence_runs(created_at desc);
create index if not exists agent_events_run_sequence_idx on public.agent_events(run_id, sequence);
create index if not exists run_requests_status_requested_idx on public.run_requests(status, requested_at);

alter table public.evidence_runs enable row level security;
alter table public.agent_events enable row level security;
alter table public.run_requests enable row level security;

-- Hackathon demo policies. Tighten these for production authentication.
create policy "demo read evidence runs" on public.evidence_runs for select using (true);
create policy "demo insert evidence runs" on public.evidence_runs for insert with check (true);
create policy "demo update evidence runs" on public.evidence_runs for update using (true) with check (true);
create policy "demo read agent events" on public.agent_events for select using (true);
create policy "demo insert agent events" on public.agent_events for insert with check (true);
create policy "demo read run requests" on public.run_requests for select using (true);
create policy "demo insert run requests" on public.run_requests for insert with check (true);
create policy "demo update run requests" on public.run_requests for update using (true) with check (true);
