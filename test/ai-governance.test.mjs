import assert from 'node:assert/strict'
import test from 'node:test'
import { validateAiCard } from '../api/ai-evidence.js'

const quote = 'At week 16, 62% of participants achieved the primary endpoint compared with 31% receiving placebo.'
const abstract = `BACKGROUND: Evidence remains limited. RESULTS: ${quote} CONCLUSIONS: Additional follow-up is needed.`

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

test('accepts a grounded card with explicit abstract limitations', () => {
  const result = validateAiCard(validCard(), abstract)

  assert.equal(result.passed, true)
  assert.equal(result.exactQuotes, true)
  assert.equal(result.correctAnswerMapped, true)
  assert.equal(result.languageSafe, true)
  assert.equal(result.abstractBoundaryExplicit, true)
})

test('rejects fabricated source excerpts', () => {
  const card = validCard()
  card.evidenceMap[0].sourceQuote = 'This sentence does not appear in the source abstract at all.'
  assert.equal(validateAiCard(card, abstract).exactQuotes, false)
})

test('rejects an answer that is not mapped to evidence', () => {
  const card = validCard()
  card.evidenceMap[0].claim = 'A different claim than the correct answer.'
  assert.equal(validateAiCard(card, abstract).correctAnswerMapped, false)
})

test('rejects unsupported certainty and practice-changing language', () => {
  const card = validCard()
  card.mondayMove = 'Clinicians should adopt this practice-changing treatment for all patients.'
  assert.equal(validateAiCard(card, abstract).languageSafe, false)
})

test('requires disclosure that only the abstract was processed', () => {
  const card = validCard()
  card.limitations = 'Further review of methods and adverse events is required.'
  assert.equal(validateAiCard(card, abstract).abstractBoundaryExplicit, false)
})
