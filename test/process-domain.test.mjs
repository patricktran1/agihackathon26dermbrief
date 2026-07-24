import assert from 'node:assert/strict'
import test from 'node:test'
import {
  articleText,
  events,
  findResultSentence,
  makeCard,
  scoreArticle,
} from '../api/process-evidence.js'

test('parses nested BioC passages and cleans title and abstract sections', () => {
  const parsed = articleText([
    {
      documents: [
        {
          passages: [
            {
              infons: { type: 'title' },
              text: '  <b>Synthetic</b> dermatology trial  ',
            },
            {
              infons: { type: 'abstract', section_type: 'BACKGROUND' },
              text: '  Background   evidence was limited. ',
            },
            {
              infons: { type: 'abstract_results', section_type: 'RESULTS' },
              text: 'Response rates were higher with the intervention.',
            },
            { infons: { type: 'table' }, text: 'Ignored table text' },
            { infons: null, text: 'Ignored malformed passage' },
          ],
        },
      ],
    },
  ])

  assert.deepEqual(parsed, {
    title: 'Synthetic dermatology trial',
    abstract: 'Background evidence was limited. Response rates were higher with the intervention.',
    sections: [
      { label: 'BACKGROUND', text: 'Background evidence was limited.' },
      { label: 'RESULTS', text: 'Response rates were higher with the intervention.' },
    ],
  })
})

test('uses Abstract as the fallback section label and ignores empty passages', () => {
  const parsed = articleText({
    nested: {
      first: { infons: { type: 'abstract' }, text: 'A sufficiently useful abstract sentence.' },
      second: { infons: { type: 'abstract' }, text: '   ' },
    },
  })

  assert.deepEqual(parsed.sections, [
    { label: 'Abstract', text: 'A sufficiently useful abstract sentence.' },
  ])
  assert.equal(parsed.title, '')
})

test('scores high-signal evidence and caps the score at 95', () => {
  const result = scoreArticle(
    'Systematic review and meta-analysis',
    'A double-blind multicenter placebo-controlled study with an active comparator.',
  )

  assert.equal(result.score, 95)
  assert.deepEqual(result.reasons, [
    'Systematic review or meta-analysis',
    'Blinding reduces assessment bias',
    'Multicenter enrollment',
    'Controlled comparison',
    'Active clinical comparator',
  ])
})

test('scores phase 3, randomized, prospective, and baseline designs deterministically', () => {
  assert.equal(scoreArticle('Phase III study', 'Masked trial').score, 85)
  assert.equal(scoreArticle('Randomised study', 'Compared with apremilast').score, 78)
  assert.equal(scoreArticle('Prospective cohort', 'Standard follow-up').score, 64)
  assert.deepEqual(scoreArticle('Case series', 'Descriptive findings'), {
    score: 48,
    reasons: ['Peer-reviewed article in a curated journal'],
  })
})

test('applies open-label and retrospective limitations without falling below the floor', () => {
  const limited = scoreArticle(
    'Open-label retrospective report',
    'A descriptive analysis without a controlled comparator.',
  )
  assert.equal(limited.score, 35)
  assert.deepEqual(limited.reasons, [
    'Peer-reviewed article in a curated journal',
    'Open-label limitation applied',
    'Retrospective limitation applied',
  ])

  const floor = scoreArticle(
    'Open-label retrospective report',
    'Open label retrospective evidence.',
  )
  assert.equal(floor.score, 35)
})

test('selects the first outcome-like result sentence', () => {
  const result = findResultSentence(
    'The study enrolled adults from several clinics. Response rates were significantly higher in the intervention group. Follow-up remained limited to sixteen weeks.',
  )
  assert.equal(
    result,
    'Response rates were significantly higher in the intervention group.',
  )
})

test('falls back to the last substantial sentence and then to a bounded abstract slice', () => {
  assert.equal(
    findResultSentence(
      'The first descriptive sentence contains enough words for review. The final descriptive sentence also contains enough words for review.',
    ),
    'The final descriptive sentence also contains enough words for review.',
  )

  const short = 'Brief abstract without a substantial sentence.'
  assert.equal(findResultSentence(short), short)
  assert.equal(findResultSentence('x'.repeat(500)).length, 420)
})

test('constructs a bounded high-signal card with a direct source mapping', () => {
  const resultSentence =
    'RESULTS: Response rates were higher in the intervention group than in the comparator group.'
  const article = {
    title: 'A'.repeat(100),
    abstract: `Background information was reported. ${resultSentence}`,
  }
  const card = makeCard(article, 82)

  assert.equal(card.title.length, 88)
  assert.equal(card.title.endsWith('…'), true)
  assert.equal(
    card.options[0],
    'Response rates were higher in the intervention group than in the comparator group.',
  )
  assert.equal(card.correctOptionIndex, 0)
  assert.equal(card.explanation, card.options[0])
  assert.match(card.whyItMatters, /high-signal/)
  assert.match(card.limitations, /PubMed abstract/)
  assert.deepEqual(card.evidenceMap[0], {
    claim: card.options[0],
    sourceQuote: resultSentence,
    sourceSection: 'Abstract',
    supportType: 'direct',
  })
})

test('constructs an eligible card without truncating a short title', () => {
  const article = {
    title: 'Short trial title',
    abstract:
      'The study enrolled a synthetic cohort. The final descriptive sentence contains enough words for a learning card.',
  }
  const card = makeCard(article, 70)
  assert.equal(card.title, article.title)
  assert.match(card.whyItMatters, /eligible study/)
})

test('creates a complete deterministic-fallback event sequence', () => {
  const result = events(
    { pmid: '12345678', journal: 'JAMA Dermatology' },
    78,
    { mode: 'deterministic-fallback', grounderModel: 'unused-model' },
  )

  assert.deepEqual(result.map((event) => event.sequence), [1, 2, 3, 4, 5, 6])
  assert.equal(result.every((event) => event.sourceVerified), true)
  assert.equal(result.every((event) => /^\d{2}:\d{2}:\d{2}$/.test(event.timestamp)), true)
  assert.match(result[0].message, /PMID 12345678 retrieved from JAMA Dermatology/)
  assert.match(result[3].message, /deterministic Grounder fallback retained/)
  assert.match(result[5].message, /blocked until physician approval/)
})

test('creates distinct LLM-assisted handoff and audit events', () => {
  const result = events(
    { pmid: '87654321', journal: 'British Journal of Dermatology' },
    91,
    { mode: 'llm-assisted', grounderModel: 'synthetic-grounder' },
  )

  assert.match(result[3].message, /synthetic-grounder/)
  assert.match(result[4].message, /independent AI audit pass/)
  assert.match(result[5].message, /AI Auditor approved/)
  assert.equal(result[5].recipient, 'publisher')
})
