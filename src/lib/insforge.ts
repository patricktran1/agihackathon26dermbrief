import { createClient } from '@insforge/sdk'
import type { CoordinationEvent, EvidenceRun, EvidenceRunRequest } from '../types'

const baseUrl = import.meta.env.VITE_INSFORGE_BASE_URL as string | undefined
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY as string | undefined

export const insforgeConfigured = Boolean(baseUrl && anonKey)

const client = insforgeConfigured
  ? createClient({ baseUrl: baseUrl as string, anonKey: anonKey as string })
  : null

// The SDK exposes a PostgREST-shaped query builder. Keep the boundary narrow so
// the app remains resilient across SDK minor-version type changes.
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
    signature_verified: event.signatureVerified,
    delivery_verified: event.deliveryVerified ?? false,
    cotal_message_id: event.cotalMessageId ?? null,
    created_at: new Date().toISOString(),
  }
}

export async function createEvidenceRequest(pmid: string): Promise<EvidenceRunRequest> {
  if (!database) throw new Error('InsForge is not configured')
  const request: EvidenceRunRequest = {
    id: `request-${crypto.randomUUID()}`,
    pmid,
    status: 'queued',
    requested_at: new Date().toISOString(),
  }
  const result = await database.from('run_requests').insert([request]).select()
  if (result.error) throw result.error
  return firstRow<EvidenceRunRequest>(result.data) ?? request
}

export async function fetchEvidenceRequest(id: string): Promise<EvidenceRunRequest | null> {
  if (!database) return null
  const result = await database.from('run_requests').select('*').eq('id', id).limit(1)
  if (result.error) throw result.error
  return firstRow<EvidenceRunRequest>(result.data)
}

export async function fetchEvidenceRun(id: string): Promise<EvidenceRun | null> {
  if (!database) return null
  const result = await database.from('evidence_runs').select('*').eq('id', id).limit(1)
  if (result.error) throw result.error
  const row = firstRow<Record<string, unknown>>(result.data)
  if (!row || typeof row.payload !== 'object' || row.payload === null) return null
  return {
    ...(row.payload as EvidenceRun),
    status: String(row.status) as EvidenceRun['status'],
    executionSource: (row.execution_source as EvidenceRun['executionSource']) ?? (row.payload as EvidenceRun).executionSource,
    meshAuthMode: (row.mesh_auth_mode as EvidenceRun['meshAuthMode']) ?? (row.payload as EvidenceRun).meshAuthMode,
  }
}

export async function fetchAgentEvents(runId: string): Promise<CoordinationEvent[]> {
  if (!database) return []
  const result = await database.from('agent_events').select('*').eq('run_id', runId).order('sequence', { ascending: true })
  if (result.error) throw result.error
  if (!Array.isArray(result.data)) return []
  return result.data.map((row: Record<string, unknown>) => ({
    sequence: Number(row.sequence),
    timestamp: new Date(String(row.created_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    sender: String(row.sender) as CoordinationEvent['sender'],
    recipient: String(row.recipient) as CoordinationEvent['recipient'],
    kind: String(row.event_kind) as CoordinationEvent['kind'],
    phase: String(row.phase),
    message: String(row.message),
    signatureVerified: Boolean(row.signature_verified),
    deliveryVerified: Boolean(row.delivery_verified),
    cotalMessageId: typeof row.cotal_message_id === 'string' ? row.cotal_message_id : undefined,
  }))
}

export async function fetchRunBundle(runId: string): Promise<EvidenceRun | null> {
  const [run, events] = await Promise.all([fetchEvidenceRun(runId), fetchAgentEvents(runId)])
  return run ? { ...run, events } : null
}

export async function persistEvidenceRun(run: EvidenceRun) {
  if (!database) return { persisted: false as const, reason: 'InsForge is not configured' }

  const existingResult = await database.from('evidence_runs').select('id').eq('id', run.id).limit(1)
  if (existingResult.error) throw existingResult.error
  const runRow = {
    pmid: run.article.pmid,
    journal: run.article.journal,
    article_title: run.article.title,
    quality_score: run.score,
    status: run.status,
    execution_source: run.executionSource ?? 'stage-demo',
    mesh_auth_mode: run.meshAuthMode ?? 'simulated',
    payload: run,
    created_at: run.startedAt,
    updated_at: new Date().toISOString(),
  }

  const runResult = firstRow(existingResult.data)
    ? await database.from('evidence_runs').update(runRow).eq('id', run.id)
    : await database.from('evidence_runs').insert([{ id: run.id, ...runRow }])
  if (runResult.error) throw runResult.error

  const existingEventsResult = await database.from('agent_events').select('sequence').eq('run_id', run.id)
  if (existingEventsResult.error) throw existingEventsResult.error
  const existingSequences = new Set(
    Array.isArray(existingEventsResult.data)
      ? existingEventsResult.data.map((row: Record<string, unknown>) => Number(row.sequence))
      : [],
  )
  const missingEvents = run.events.filter((event) => !existingSequences.has(event.sequence))
  if (missingEvents.length > 0) {
    const eventResult = await database.from('agent_events').insert(missingEvents.map((event) => eventRow(run.id, event)))
    if (eventResult.error) throw eventResult.error
  }

  return { persisted: true as const }
}
