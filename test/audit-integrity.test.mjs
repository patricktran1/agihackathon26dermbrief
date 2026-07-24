import assert from 'node:assert/strict'
import test from 'node:test'
import auditManifestApi from '../api/audit-manifest.js'
import { createAuditManifest, verifyAuditManifest } from '../api/audit-integrity.js'

function syntheticRun() {
  return {
    id: 'run-35820547',
    startedAt: '2026-07-18T18:30:00.000Z',
    completedAt: '2026-07-18T18:30:18.000Z',
    status: 'awaiting_physician',
    ai: { mode: 'deterministic-fallback' },
    article: {
      pmid: '35820547',
      abstract: 'Synthetic source text that must never appear in the manifest.',
    },
    events: [
      {
        sequence: 1,
        timestamp: '18:30:01',
        sender: 'scout',
        recipient: 'workflow',
        kind: 'checkpoint',
        message: 'Synthetic source verified.',
        sourceVerified: true,
        persisted: true,
        phase: 'Discovery',
      },
      {
        sequence: 2,
        timestamp: '18:30:04',
        sender: 'auditor',
        recipient: 'publisher',
        kind: 'handoff',
        message: 'Publisher remains blocked pending physician approval.',
        sourceVerified: true,
        persisted: false,
        phase: 'Safety',
      },
    ],
  }
}

test('creates a deterministic SHA-256 chain without embedding source or event content', () => {
  const run = syntheticRun()
  const first = createAuditManifest(run)
  const second = createAuditManifest(run)

  assert.deepEqual(first, second)
  assert.equal(first.manifestVersion, '1')
  assert.equal(first.algorithm, 'sha256')
  assert.match(first.headerHash, /^[0-9a-f]{64}$/)
  assert.match(first.headHash, /^[0-9a-f]{64}$/)
  assert.equal(first.eventCount, 2)
  assert.deepEqual(first.eventDigests.map((entry) => entry.sequence), [1, 2])
  assert.equal(first.eventDigests[0].previousHash, first.headerHash)
  assert.equal(first.eventDigests[1].previousHash, first.eventDigests[0].hash)
  assert.equal(first.headHash, first.eventDigests[1].hash)
  assert.equal(verifyAuditManifest(run, first), true)

  const serialized = JSON.stringify(first)
  assert.equal(serialized.includes(run.article.abstract), false)
  assert.equal(serialized.includes(run.events[0].message), false)
})

test('detects event, status, and ordering changes', () => {
  const run = syntheticRun()
  const manifest = createAuditManifest(run)

  const changedMessage = structuredClone(run)
  changedMessage.events[1].message = 'Publisher was unlocked without approval.'
  assert.equal(verifyAuditManifest(changedMessage, manifest), false)

  const changedStatus = structuredClone(run)
  changedStatus.status = 'approved'
  assert.equal(verifyAuditManifest(changedStatus, manifest), false)

  const gap = structuredClone(run)
  gap.events[1].sequence = 3
  assert.throws(() => createAuditManifest(gap), /contiguous sequence/i)
})

test('ignores persistence transport state while protecting substantive event fields', () => {
  const run = syntheticRun()
  const manifest = createAuditManifest(run)
  const persistenceChanged = structuredClone(run)
  persistenceChanged.events[0].persisted = false
  persistenceChanged.events[1].persisted = true

  assert.equal(verifyAuditManifest(persistenceChanged, manifest), true)
})

test('API returns a manifest and stable validation errors', async () => {
  const valid = await auditManifestApi.fetch(new Request('https://dermbrief.example/api/audit-manifest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(syntheticRun()),
  }))
  assert.equal(valid.status, 200)
  assert.equal(valid.headers.get('cache-control'), 'no-store')
  const validPayload = await valid.json()
  assert.equal(verifyAuditManifest(syntheticRun(), validPayload.manifest), true)

  const invalidJson = await auditManifestApi.fetch(new Request('https://dermbrief.example/api/audit-manifest', {
    method: 'POST',
    body: '{',
  }))
  assert.equal(invalidJson.status, 400)
  assert.equal((await invalidJson.json()).error.code, 'invalid_json')

  const invalidRun = await auditManifestApi.fetch(new Request('https://dermbrief.example/api/audit-manifest', {
    method: 'POST',
    body: JSON.stringify({ id: 'missing-fields' }),
  }))
  assert.equal(invalidRun.status, 400)
  assert.equal((await invalidRun.json()).error.code, 'invalid_audit_run')

  const method = await auditManifestApi.fetch(new Request('https://dermbrief.example/api/audit-manifest'))
  assert.equal(method.status, 405)
  assert.equal(method.headers.get('allow'), 'POST')
})

test('API enforces the declared and actual body limits', async () => {
  const declared = await auditManifestApi.fetch(new Request('https://dermbrief.example/api/audit-manifest', {
    method: 'POST',
    headers: { 'content-length': '600000' },
    body: JSON.stringify(syntheticRun()),
  }))
  assert.equal(declared.status, 413)
  assert.equal((await declared.json()).error.code, 'payload_too_large')

  const oversized = await auditManifestApi.fetch(new Request('https://dermbrief.example/api/audit-manifest', {
    method: 'POST',
    body: JSON.stringify({ padding: 'x'.repeat(520000) }),
  }))
  assert.equal(oversized.status, 413)
  assert.equal((await oversized.json()).error.code, 'payload_too_large')
})
