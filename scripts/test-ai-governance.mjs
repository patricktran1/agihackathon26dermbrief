import assert from 'node:assert/strict'
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

const valid = validateAiCard(validCard(), abstract)
assert.equal(valid.passed, true)
assert.equal(valid.exactQuotes, true)
assert.equal(valid.correctAnswerMapped, true)
assert.equal(valid.languageSafe, true)
assert.equal(valid.abstractBoundaryExplicit, true)

const fabricated = validCard()
fabricated.evidenceMap[0].sourceQuote = 'This sentence does not appear in the source abstract at all.'
assert.equal(validateAiCard(fabricated, abstract).exactQuotes, false)

const unmapped = validCard()
unmapped.evidenceMap[0].claim = 'A different claim than the correct answer.'
assert.equal(validateAiCard(unmapped, abstract).correctAnswerMapped, false)

const unsafe = validCard()
unsafe.mondayMove = 'Clinicians should adopt this practice-changing treatment for all patients.'
assert.equal(validateAiCard(unsafe, abstract).languageSafe, false)

const missingBoundary = validCard()
missingBoundary.limitations = 'Further review of methods and adverse events is required.'
assert.equal(validateAiCard(missingBoundary, abstract).abstractBoundaryExplicit, false)

console.log('Validated AI Grounder and Auditor deterministic veto rules.')
