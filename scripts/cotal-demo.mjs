import { CotalEndpoint } from '@cotal-ai/core'

const server = process.env.COTAL_SERVER || 'nats://127.0.0.1:4222'
const space = process.env.COTAL_SPACE || 'dermbrief-evidenceops'
const channel = 'evidenceops'

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
  card: { id: `local.${id}`, name, kind: 'agent', role, description, tags: ['dermatology', 'evidenceops', 'hackathon'] },
})]))

for (const [id, endpoint] of endpoints) {
  // Cotal endpoints emit asynchronous connection and permission errors.
  // Register this listener before start() so Node does not treat them as unhandled errors.
  endpoint.on('error', (error) => {
    console.error(`[${id}] Cotal error:`, error instanceof Error ? error.message : error)
  })
}

const sequence = [
  ['scout', 'multicast', channel, 'PMID 35820547 verified as a JAAD publication.'],
  ['scout', 'unicast', 'appraiser', 'Handing off verified abstract and publication metadata.'],
  ['appraiser', 'multicast', channel, 'Evidence quality score 92/100. Phase 3, randomized, double-blind, active comparator.'],
  ['appraiser', 'anycast', 'clinical-educator', 'Create one defensible learning card bounded by the abstract.'],
  ['grounder', 'unicast', 'auditor', 'Card complete with exact source excerpts for every substantive claim.'],
  ['auditor', 'multicast', channel, 'Grounding verified. Publisher blocked pending physician approval.'],
]

async function main() {
  console.log(`Connecting five DermBrief agents to Cotal space “${space}” at ${server}`)
  await Promise.all([...endpoints.values()].map((endpoint) => endpoint.start()))

  for (const [sender, mode, target, message] of sequence) {
    const endpoint = endpoints.get(sender)
    if (!endpoint) throw new Error(`Unknown endpoint ${sender}`)
    if (mode === 'multicast') await endpoint.multicast(message, { channel: target, contextId: 'pmid-35820547' })
    if (mode === 'unicast') await endpoint.unicast(`local.${target}`, message, { contextId: 'pmid-35820547' })
    if (mode === 'anycast') await endpoint.anycast(target, message, { contextId: 'pmid-35820547' })
    console.log(`${sender} → ${target}: ${message}`)
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  console.log('Cotal demo complete. Keep `cotal console` or `cotal web` open during the run to watch the coordination live.')
}

main()
  .catch((error) => {
    console.error('Cotal demo failed. Start a loopback demo mesh first with `cotal up --open`.', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await Promise.allSettled([...endpoints.values()].map((endpoint) => endpoint.stop()))
  })
