import { createClient } from '@insforge/sdk'
import type { EvidenceRun } from '../types'

const baseUrl = import.meta.env.VITE_INSFORGE_BASE_URL as string | undefined
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY as string | undefined

export const insforgeConfigured = Boolean(baseUrl && anonKey)

const client = insforgeConfigured
  ? createClient({ baseUrl, anonKey })
  : null

export async function persistEvidenceRun(run: EvidenceRun) {
  if (!client) return { persisted: false as const, reason: 'InsForge is not configured' }

  const runResult = await client.database.from('evidence_runs').insert([{
    id: run.id,
    pmid: run.article.pmid,
    journal: run.article.journal,
    article_title: run.article.title,
    quality_score: run.score,
    status: run.status,
    payload: run,
    created_at: run.startedAt,
  }])

  if (runResult.error) throw runResult.error

  const eventResult = await client.database.from('agent_events').insert(
    run.events.map((event) => ({
      run_id: run.id,
      sequence: event.sequence,
      sender: event.sender,
      recipient: event.recipient,
      event_kind: event.kind,
      phase: event.phase,
      message: event.message,
      signature_verified: event.signatureVerified,
    })),
  )

  if (eventResult.error) throw eventResult.error
  return { persisted: true as const }
}
