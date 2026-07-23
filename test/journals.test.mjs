import assert from 'node:assert/strict'
import test from 'node:test'
import { journalMatch, normalizeJournalName } from '../api/process-evidence.js'

const cases = [
  ['The British journal of dermatology', 'British Journal of Dermatology'],
  ['Br J Dermatol', 'British Journal of Dermatology'],
  ['J Invest Dermatol', 'Journal of Investigative Dermatology'],
  ['The Journal of Investigative Dermatology', 'Journal of Investigative Dermatology'],
  ['J Am Acad Dermatol', 'Journal of the American Academy of Dermatology'],
  ['Am J Clin Dermatol', 'American Journal of Clinical Dermatology'],
  ['JAMA Dermatol', 'JAMA Dermatology'],
  ['J Eur Acad Dermatol Venereol', 'Journal of the European Academy of Dermatology and Venereology'],
  ['JAAD Int', 'JAAD International'],
]

test('maps curated PubMed journal aliases to canonical names', () => {
  for (const [input, canonical] of cases) {
    assert.equal(journalMatch(input)?.canonical, canonical, `${input} should map to ${canonical}`)
  }
})

test('rejects non-curated journals', () => {
  assert.equal(journalMatch('New England Journal of Medicine'), undefined)
})

test('normalizes leading articles and casing', () => {
  assert.equal(normalizeJournalName('The British Journal of Dermatology'), 'british journal of dermatology')
})
