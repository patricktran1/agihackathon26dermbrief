import { createClient } from '@insforge/sdk'
import type { CoordinationEvent, EvidenceRun } from '../types'

const baseUrl = import.meta.env.VITE_INSFORGE_BASE_URL as string | undefined
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY as string | undefined

export const insforgeConfigured = Boolean(baseUrl && anonKey)

const client = insforgeConfigured
  ? createClient({ baseUrl: baseUrl as string, anonKey: anonKey as string })
  : null

// Keep the SDK boundary deliberately small so minor query-builder type changes
// cannot leak through the rest of the hackathon app.
const database = client?.database as any | undefined

function firstRow<T>(value: unknown): T | null {
  return Array.isArray(value) && value.length > 0 ? value[0] as T : null
}

function eventRow(runId: string, event: CoordinationEvent) {
  return {
    run_id: runId,
    sequence: event.sequence,
    sender: event.sender,
    recipient: event.recipient,
    event_kind: event.kind,
    phase: event.phase,
    message: event.message,
    source_verified: event.sourceVerified,
    created_at: new Date().toISOString(),
  }
}

async function upsertRun(run: EvidenceRun) {
  if (!database) return false

  const existing = await database.from('evidence_runs').select('id').eq('id', run.id).limit(1)
  if (existing.error) throw existing.error

  const row = {
    pmid: run.article.pmid,
    journal: run.article.journal,
    article_title: run.article.title,
    quality_score: run.score,
    status: run.status,
    execution_source: run.executionSource ?? 'insforge-live',
    payload: run,
    created_at: run.startedAt,
    updated_at: new Date().toISOString(),
  }

  const result = firstRow(existing.data)
    ? await database.from('evidence_runs').update(row).eq('id', run.id)
    : await database.from('evidence_runs').insert([{ id: run.id, ...row }])

  if (result.error) throw result.error
  return true
}

export async function beginEvidenceRun(run: EvidenceRun) {
  if (!database) return { persisted: false as const }
  const staged: EvidenceRun = {
    ...run,
    status: 'processing',
    agents: run.agents.map((agent) => ({ ...agent, status: 'idle' })),
    events: [],
  }
  await upsertRun(staged)
  return { persisted: true as const }
}

export async function appendAgentEvent(runId: string, event: CoordinationEvent) {
  if (!database) return { persisted: false as const }

  const existing = await database
    .from('agent_events')
    .select('sequence')
    .eq('run_id', runId)
    .eq('sequence', event.sequence)
    .limit(1)
  if (existing.error) throw existing.error

  if (!firstRow(existing.data)) {
    const result = await database.from('agent_events').insert([eventRow(runId, event)])
    if (result.error) throw result.error
  }

  return { persisted: true as const }
}

export async function finalizeEvidenceRun(run: EvidenceRun) {
  if (!database) return { persisted: false as const }
  await upsertRun(run)
  return { persisted: true as const }
}

export async function persistEvidenceRun(run: EvidenceRun) {
  if (!database) return { persisted: false as const, reason: 'InsForge is not configured' }

  await upsertRun(run)
  for (const event of run.events) {
    await appendAgentEvent(run.id, event)
  }

  return { persisted: true as const }
}
