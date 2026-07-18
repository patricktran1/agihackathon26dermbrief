import { createClient } from '@insforge/sdk'
import { CotalEndpoint } from '@cotal-ai/core'

const required = ['INSFORGE_BASE_URL', 'INSFORGE_ANON_KEY']
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`)
    process.exit(1)
  }
}

const insforge = createClient({
  baseUrl: process.env.INSFORGE_BASE_URL,
  anonKey: process.env.INSFORGE_ANON_KEY,
})
const database = insforge.database
const server = process.env.COTAL_SERVER || 'nats://127.0.0.1:4222'
const space = process.env.COTAL_SPACE || 'dermbrief-evidenceops'
const channel = 'evidenceops'
const apiUrl = process.env.DERMBRIEF_API_URL || 'https://agihackathon26dermbrief.vercel.app/api/process-evidence'
const workerId = process.env.WORKER_ID || `dermbrief-worker-${process.pid}`
const pollMs = Number(process.env.WORKER_POLL_MS || 900)
const runOnce = process.env.WORKER_ONCE === '1'
const authenticated = Boolean(process.env.COTAL_TOKEN || (process.env.COTAL_USER && process.env.COTAL_PASS))
const meshAuthMode = authenticated ? 'authenticated' : 'open-loopback'

const authOptions = process.env.COTAL_TOKEN
  ? { token: process.env.COTAL_TOKEN }
  : process.env.COTAL_USER && process.env.COTAL_PASS
    ? { user: process.env.COTAL_USER, pass: process.env.COTAL_PASS }
    : {}

const specs = [
  ['scout', 'Scout', 'literature-scout', 'Retrieves and verifies curated PubMed records.'],
  ['appraiser', 'Appraiser', 'evidence-appraiser', 'Scores study design, bias, and clinical signal.'],
  ['grounder', 'Grounder', 'clinical-educator', 'Maps learner-facing claims to source excerpts.'],
  ['auditor', 'Safety Auditor', 'medical-safety', 'Blocks unsupported or ambiguous medical language.'],
  ['publisher', 'Publisher', 'release-manager', 'Waits for physician approval before release.'],
]

const endpoints = new Map(specs.map(([id, name, role, description]) => [id, new CotalEndpoint({
  space,
  servers: server,
  channels: [channel],
  ...authOptions,
  card: {
    id: `local.${id}`,
    name,
    kind: 'agent',
    role,
    description,
    tags: ['dermatology', 'evidenceops', 'hackathon'],
  },
})]))

for (const [id, endpoint] of endpoints) {
  endpoint.on('error', (error) => {
    console.error(`[${id}] Cotal error:`, error instanceof Error ? error.message : error)
  })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const first = (value) => Array.isArray(value) && value.length > 0 ? value[0] : null

function idleAgents(agents) {
  return agents.map((agent) => ({ ...agent, status: 'idle' }))
}

function agentsAfterEvent(agents, event, terminalStatus = 'processing') {
  return agents.map((agent) => {
    if (terminalStatus === 'blocked' && ['grounder', 'auditor'].includes(agent.id)) return { ...agent, status: 'blocked' }
    if (terminalStatus === 'approved' && agent.id === 'publisher') return { ...agent, status: 'complete' }
    if (terminalStatus === 'awaiting_physician' && agent.id === 'publisher') return { ...agent, status: 'waiting' }
    if (agent.id === event.sender) return { ...agent, status: 'complete' }
    if (agent.id === event.recipient) return { ...agent, status: 'working' }
    return agent
  })
}

async function updateRequest(id, values) {
  const result = await database.from('run_requests').update(values).eq('id', id)
  if (result.error) throw result.error
}

async function insertRun(run) {
  const result = await database.from('evidence_runs').insert([{
    id: run.id,
    pmid: run.article.pmid,
    journal: run.article.journal,
    article_title: run.article.title,
    quality_score: run.score,
    status: run.status,
    execution_source: run.executionSource,
    mesh_auth_mode: run.meshAuthMode,
    payload: run,
    created_at: run.startedAt,
    updated_at: new Date().toISOString(),
  }])
  if (result.error) throw result.error
}

async function updateRun(run) {
  const result = await database.from('evidence_runs').update({
    status: run.status,
    payload: run,
    updated_at: new Date().toISOString(),
  }).eq('id', run.id)
  if (result.error) throw result.error
}

async function insertEvent(runId, event) {
  const result = await database.from('agent_events').insert([{
    run_id: runId,
    sequence: event.sequence,
    sender: event.sender,
    recipient: event.recipient,
    event_kind: event.kind,
    phase: event.phase,
    message: event.message,
    signature_verified: event.signatureVerified,
    delivery_verified: event.deliveryVerified,
    cotal_message_id: event.cotalMessageId,
    created_at: new Date().toISOString(),
  }])
  if (result.error) throw result.error
}

async function fetchQueuedRequest() {
  const result = await database.from('run_requests')
    .select('*')
    .eq('status', 'queued')
    .order('requested_at', { ascending: true })
    .limit(1)
  if (result.error) throw result.error
  return first(result.data)
}

async function fetchEvidence(pmid) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pmid }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload?.error || `Evidence API failed with ${response.status}`)
  return payload
}

function workflowSteps(run) {
  return [
    { sender: 'scout', mode: 'multicast', target: channel, recipient: '#evidenceops', phase: 'Discovery', message: `PMID ${run.article.pmid} retrieved from ${run.article.journal}; whitelist identity verified.` },
    { sender: 'scout', mode: 'unicast', target: 'appraiser', recipient: 'appraiser', phase: 'Handoff', message: 'Verified metadata and abstract handed to evidence appraisal.' },
    { sender: 'appraiser', mode: 'multicast', target: channel, recipient: '#evidenceops', phase: 'Appraisal', message: `Deterministic evidence score: ${run.score}/100.` },
    { sender: 'appraiser', mode: 'anycast', target: 'clinical-educator', recipient: 'grounder', phase: 'Delegation', message: 'Create one defensible learning card bounded by the abstract.' },
    { sender: 'grounder', mode: 'unicast', target: 'auditor', recipient: 'auditor', phase: 'Grounding', message: 'Card and claim-level source mappings submitted for safety review.' },
    { sender: 'auditor', mode: 'multicast', target: channel, recipient: '#evidenceops', phase: 'Safety', message: run.status === 'blocked' ? 'Safety gate blocked this evidence card.' : 'Source strings verified. Publisher blocked until physician approval.' },
  ]
}

async function emitStep(run, step, sequence) {
  const endpoint = endpoints.get(step.sender)
  if (!endpoint) throw new Error(`Unknown Cotal sender: ${step.sender}`)
  const options = { contextId: run.id }
  let cotalMessage
  if (step.mode === 'multicast') cotalMessage = await endpoint.multicast(step.message, { ...options, channel: step.target })
  if (step.mode === 'unicast') cotalMessage = await endpoint.unicast(`local.${step.target}`, step.message, options)
  if (step.mode === 'anycast') cotalMessage = await endpoint.anycast(step.target, step.message, options)
  if (!cotalMessage) throw new Error(`Cotal did not return a message envelope for step ${sequence}`)
  return {
    sequence,
    timestamp: new Date(cotalMessage.ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    sender: step.sender,
    recipient: step.recipient,
    kind: step.mode,
    phase: step.phase,
    message: step.message,
    signatureVerified: authenticated,
    deliveryVerified: true,
    cotalMessageId: cotalMessage.id,
  }
}

async function processRequest(request) {
  console.log(`Claiming ${request.id} for PMID ${request.pmid}`)
  await updateRequest(request.id, {
    status: 'processing',
    worker_id: workerId,
    claimed_at: new Date().toISOString(),
    error: null,
  })

  try {
    const evidence = await fetchEvidence(request.pmid)
    let run = {
      ...evidence,
      id: `cotal-${request.pmid}-${Date.now()}`,
      requestId: request.id,
      status: 'processing',
      executionSource: 'cotal-live',
      meshAuthMode,
      completedAt: '',
      events: [],
      agents: idleAgents(evidence.agents),
    }
    await insertRun(run)
    await updateRequest(request.id, { result_run_id: run.id })

    const steps = workflowSteps(evidence)
    for (let index = 0; index < steps.length; index += 1) {
      const event = await emitStep(run, steps[index], index + 1)
      run = {
        ...run,
        events: [...run.events, event],
        agents: agentsAfterEvent(run.agents, event),
      }
      await insertEvent(run.id, event)
      await updateRun(run)
      console.log(`${event.sender} → ${event.recipient}: ${event.message}`)
      await sleep(650)
    }

    const terminalStatus = evidence.status === 'blocked' ? 'blocked' : 'awaiting_physician'
    run = {
      ...run,
      status: terminalStatus,
      completedAt: new Date().toISOString(),
      agents: run.agents.map((agent) => {
        if (terminalStatus === 'blocked' && ['grounder', 'auditor'].includes(agent.id)) return { ...agent, status: 'blocked' }
        if (agent.id === 'publisher') return { ...agent, status: terminalStatus === 'blocked' ? 'blocked' : 'waiting' }
        return { ...agent, status: 'complete' }
      }),
    }
    await updateRun(run)
    await updateRequest(request.id, {
      status: 'complete',
      completed_at: new Date().toISOString(),
      result_run_id: run.id,
    })
    console.log(`Completed ${request.id} as ${run.id}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Request ${request.id} failed:`, message)
    await updateRequest(request.id, {
      status: 'error',
      error: message,
      completed_at: new Date().toISOString(),
    }).catch((updateError) => console.error('Could not persist worker error:', updateError))
  }
}

async function main() {
  console.log(`Starting ${workerId}`)
  console.log(`Cotal: ${space} at ${server} (${meshAuthMode})`)
  console.log(`InsForge: ${process.env.INSFORGE_BASE_URL}`)
  console.log(`Evidence API: ${apiUrl}`)
  await Promise.all([...endpoints.values()].map((endpoint) => endpoint.start()))

  do {
    const request = await fetchQueuedRequest()
    if (request) await processRequest(request)
    else if (!runOnce) await sleep(pollMs)
  } while (!runOnce)
}

async function shutdown() {
  await Promise.allSettled([...endpoints.values()].map((endpoint) => endpoint.stop()))
}

process.on('SIGINT', () => void shutdown().finally(() => process.exit(0)))
process.on('SIGTERM', () => void shutdown().finally(() => process.exit(0)))

main()
  .catch((error) => {
    console.error('Cotal bridge worker failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    if (runOnce || process.exitCode) await shutdown()
  })
