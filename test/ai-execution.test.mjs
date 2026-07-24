import assert from 'node:assert/strict'
import test from 'node:test'
import { generateAiEvidence } from '../api/ai-evidence.js'

const quote = 'At week 16, 62% of participants achieved the primary endpoint compared with 31% receiving placebo.'
const abstract = `BACKGROUND: Evidence remains limited. RESULTS: ${quote} CONCLUSIONS: Additional follow-up is needed.`

const article = {
  pmid: '12345678',
  title: 'Synthetic randomized dermatology trial',
  journal: 'Journal of the American Academy of Dermatology',
  publicationDate: '2026 Jul',
  abstract,
}

const appraisal = { score: 82, reasons: ['Randomized controlled design'] }

function validCard() {
  return {
    title: 'Trial endpoint learning card',
    prompt: 'Which statement is most directly supported by the PubMed abstract?',
    options: [
      quote,
      'The intervention was superior in every population and clinical setting.',
      'The study established permanent benefit after treatment discontinuation.',
      'The abstract recommends replacing all existing therapies.',
    ],
    correctOptionIndex: 0,
    explanation: 'The abstract reports the week 16 primary endpoint result for the studied participants and comparator.',
    whyItMatters: 'The reported endpoint may inform physician review of the studied population, intervention, comparator, and follow-up.',
    mondayMove: 'Review the full methods, eligibility criteria, adverse events, and follow-up before applying the finding clinically.',
    limitations: 'Only the PubMed abstract was processed; full-text methods and safety data still require physician review.',
    evidenceMap: [
      {
        claim: quote,
        sourceQuote: quote,
        sourceSection: 'Results',
        supportType: 'direct',
      },
    ],
  }
}

function approvedAudit(card) {
  return {
    approved: true,
    verdict: 'The bounded card is supported by the supplied abstract.',
    issues: [],
    claimChecks: card.evidenceMap.map((entry) => ({
      claim: entry.claim,
      supported: true,
      rationale: 'The claim maps directly to an exact abstract quotation.',
    })),
  }
}

async function withEnv(values, callback) {
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]))
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    return await callback()
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test('disabled AI returns the deterministic card without invoking a model', async () => {
  const deterministicCard = validCard()
  const result = await withEnv(
    {
      DERMBRIEF_DISABLE_AI: '1',
      DERMBRIEF_GROUNDER_MODEL: 'synthetic-grounder',
      DERMBRIEF_AUDITOR_MODEL: 'synthetic-auditor',
    },
    () => generateAiEvidence(article, appraisal, deterministicCard, {
      generateText: async () => {
        throw new Error('model must not be called')
      },
    }),
  )

  assert.equal(result.card, deterministicCard)
  assert.equal(result.ai.mode, 'deterministic-fallback')
  assert.equal(result.ai.grounderAttempted, false)
  assert.equal(result.ai.auditorAttempted, false)
  assert.deepEqual(result.ai.issues, ['AI assistance is disabled for this deployment.'])
})

test('rejects a Grounder draft that fails deterministic source checks', async () => {
  const deterministicCard = validCard()
  const invalidDraft = validCard()
  invalidDraft.evidenceMap[0].sourceQuote = 'A fabricated sentence that is not present in the source abstract.'
  let calls = 0

  const result = await withEnv({ DERMBRIEF_DISABLE_AI: undefined }, () =>
    generateAiEvidence(article, appraisal, deterministicCard, {
      generateText: async () => {
        calls += 1
        return { output: invalidDraft }
      },
    }),
  )

  assert.equal(calls, 1)
  assert.equal(result.card, deterministicCard)
  assert.equal(result.ai.mode, 'deterministic-fallback')
  assert.equal(result.ai.grounderAccepted, false)
  assert.equal(result.ai.auditorAttempted, false)
  assert.match(result.ai.issues[0], /source quote/i)
})

test('retains the deterministic card when the independent Auditor rejects a claim', async () => {
  const deterministicCard = validCard()
  const draft = validCard()
  const outputs = [
    draft,
    {
      approved: false,
      verdict: 'One mapped claim requires additional source support.',
      issues: [],
      claimChecks: [
        {
          claim: quote,
          supported: false,
          rationale: 'The audit fixture rejects the mapped claim.',
        },
      ],
    },
  ]

  const result = await withEnv({ DERMBRIEF_DISABLE_AI: undefined }, () =>
    generateAiEvidence(article, appraisal, deterministicCard, {
      generateText: async () => ({ output: outputs.shift() }),
    }),
  )

  assert.equal(outputs.length, 0)
  assert.equal(result.card, deterministicCard)
  assert.equal(result.ai.mode, 'deterministic-fallback')
  assert.equal(result.ai.grounderAccepted, true)
  assert.equal(result.ai.auditorAttempted, true)
  assert.equal(result.ai.auditorApproved, false)
  assert.equal(result.ai.verdict, 'One mapped claim requires additional source support.')
  assert.deepEqual(result.ai.issues, ['The AI Safety Auditor did not approve every mapped claim.'])
})

test('returns an LLM-assisted card only after Grounder and Auditor checks pass', async () => {
  const deterministicCard = validCard()
  const draft = validCard()
  const outputs = [draft, approvedAudit(draft)]

  const result = await withEnv(
    {
      DERMBRIEF_DISABLE_AI: undefined,
      DERMBRIEF_AI_MODEL: 'synthetic-shared-model',
      DERMBRIEF_GROUNDER_MODEL: undefined,
      DERMBRIEF_AUDITOR_MODEL: undefined,
    },
    () => generateAiEvidence(article, appraisal, deterministicCard, {
      generateText: async () => ({ output: outputs.shift() }),
    }),
  )

  assert.equal(outputs.length, 0)
  assert.equal(result.card, draft)
  assert.equal(result.ai.mode, 'llm-assisted')
  assert.equal(result.ai.grounderModel, 'synthetic-shared-model')
  assert.equal(result.ai.auditorModel, 'synthetic-shared-model')
  assert.equal(result.ai.grounderAccepted, true)
  assert.equal(result.ai.auditorApproved, true)
  assert.deepEqual(result.ai.issues, [])
  assert.deepEqual(result.ai.deterministicChecks, {
    exactQuotes: true,
    correctAnswerMapped: true,
    languageSafe: true,
    abstractBoundaryExplicit: true,
  })
})

test('redacts quota and gateway details from model failures', async () => {
  const originalError = console.error
  console.error = () => {}
  try {
    const result = await withEnv({ DERMBRIEF_DISABLE_AI: undefined }, () =>
      generateAiEvidence(article, appraisal, validCard(), {
        generateText: async () => {
          throw new Error('Gateway quota and billing detail that must not escape')
        },
      }),
    )

    assert.deepEqual(result.ai.issues, [
      'AI generation was unavailable; the deterministic fallback was retained.',
    ])
    assert.equal(result.ai.grounderAccepted, false)
    assert.equal(result.ai.auditorAttempted, false)
  } finally {
    console.error = originalError
  }
})

test('uses the governed generic fallback for unexpected model errors', async () => {
  const originalError = console.error
  console.error = () => {}
  try {
    const result = await withEnv({ DERMBRIEF_DISABLE_AI: undefined }, () =>
      generateAiEvidence(article, appraisal, validCard(), {
        generateText: async () => {
          throw new TypeError('synthetic parser failure')
        },
      }),
    )

    assert.deepEqual(result.ai.issues, [
      'The AI draft did not clear the governed workflow; the deterministic fallback was retained.',
    ])
  } finally {
    console.error = originalError
  }
})

test('rejects a non-function runtime dependency before workflow execution', async () => {
  await assert.rejects(
    () => generateAiEvidence(article, appraisal, validCard(), { generateText: 'not-a-function' }),
    /runtime\.generateText must be a function/,
  )
})
