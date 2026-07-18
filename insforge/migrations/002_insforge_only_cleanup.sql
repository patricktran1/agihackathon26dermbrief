-- Upgrade a project that previously applied the Cotal bridge schema.

alter table public.evidence_runs add column if not exists execution_source text not null default 'insforge-live';
alter table public.evidence_runs add column if not exists updated_at timestamptz not null default now();
alter table public.evidence_runs drop column if exists mesh_auth_mode;
alter table public.evidence_runs drop constraint if exists evidence_runs_status_check;
alter table public.evidence_runs add constraint evidence_runs_status_check
  check (status in ('processing', 'awaiting_physician', 'approved', 'blocked'));

alter table public.agent_events add column if not exists source_verified boolean not null default false;
update public.agent_events
set source_verified = coalesce(signature_verified, false)
where source_verified = false;
alter table public.agent_events drop column if exists signature_verified;
alter table public.agent_events drop column if exists delivery_verified;
alter table public.agent_events drop column if exists cotal_message_id;
alter table public.agent_events drop constraint if exists agent_events_event_kind_check;
alter table public.agent_events add constraint agent_events_event_kind_check
  check (event_kind in ('checkpoint', 'handoff', 'approval')) not valid;

-- The InsForge-only architecture no longer needs a worker queue.
drop table if exists public.run_requests cascade;
