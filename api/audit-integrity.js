import { createHash } from 'node:crypto'

const RUN_STATUSES = new Set(['processing', 'awaiting_physician', 'approved', 'blocked'])
const EVENT_KINDS = new Set(['checkpoint', 'handoff', 'approval'])

function requireString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`)
  return value.trim()
}

function canonicalize(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Audit data cannot contain non-finite numbers.')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`
  }
  throw new Error('Audit data contains an unsupported value.')
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function normalizeEvent(event, expectedSequence) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new Error(`Audit event ${expectedSequence} must be an object.`)
  }
  if (event.sequence !== expectedSequence) {
    throw new Error(`Audit events must use contiguous sequence numbers beginning at 1.`)
  }
  const kind = requireString(event.kind, `Audit event ${expectedSequence} kind`)
  if (!EVENT_KINDS.has(kind)) throw new Error(`Audit event ${expectedSequence} kind is invalid.`)

  return {
    sequence: expectedSequence,
    timestamp: requireString(event.timestamp, `Audit event ${expectedSequence} timestamp`),
    sender: requireString(event.sender, `Audit event ${expectedSequence} sender`),
    recipient: requireString(event.recipient, `Audit event ${expectedSequence} recipient`),
    kind,
    phase: requireString(event.phase, `Audit event ${expectedSequence} phase`),
    message: requireString(event.message, `Audit event ${expectedSequence} message`),
    sourceVerified: event.sourceVerified === true,
  }
}

function normalizeRun(run) {
  if (!run || typeof run !== 'object' || Array.isArray(run)) throw new Error('Evidence run must be an object.')
  const status = requireString(run.status, 'Evidence run status')
  if (!RUN_STATUSES.has(status)) throw new Error('Evidence run status is invalid.')
  const pmid = requireString(run.article?.pmid, 'Article PMID')
  if (!/^\d+$/.test(pmid)) throw new Error('Article PMID must contain digits only.')
  if (!Array.isArray(run.events) || run.events.length === 0) {
    throw new Error('Evidence run must include at least one audit event.')
  }

  return {
    header: {
      manifestVersion: '1',
      algorithm: 'sha256',
      runId: requireString(run.id, 'Evidence run id'),
      pmid,
      status,
      startedAt: requireString(run.startedAt, 'Evidence run startedAt'),
      completedAt: requireString(run.completedAt, 'Evidence run completedAt'),
      eventCount: run.events.length,
      aiMode: typeof run.ai?.mode === 'string' ? run.ai.mode : null,
    },
    events: run.events.map((event, index) => normalizeEvent(event, index + 1)),
  }
}

export function createAuditManifest(run) {
  const normalized = normalizeRun(run)
  const headerHash = sha256(canonicalize(normalized.header))
  let previousHash = headerHash
  const eventDigests = normalized.events.map((event) => {
    const hash = sha256(`${previousHash}\n${canonicalize(event)}`)
    const digest = {
      sequence: event.sequence,
      previousHash,
      hash,
    }
    previousHash = hash
    return digest
  })

  return {
    ...normalized.header,
    headerHash,
    headHash: previousHash,
    eventDigests,
  }
}

export function verifyAuditManifest(run, manifest) {
  try {
    const expected = createAuditManifest(run)
    return canonicalize(expected) === canonicalize(manifest)
  } catch {
    return false
  }
}
