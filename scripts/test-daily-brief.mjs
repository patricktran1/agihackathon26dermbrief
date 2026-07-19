import assert from 'node:assert/strict'
import { classifyStudy, JOURNALS, matchJournal, rankArticle } from '../api/daily-brief.js'

const aliasCases = [
  ['Journal of the American Academy of Dermatology', '', 'jaad'],
  ['', 'J Am Acad Dermatol', 'jaad'],
  ['American Journal of Clinical Dermatology', '', 'ajcd'],
  ['', 'Am J Clin Dermatol', 'ajcd'],
  ['JAMA Dermatology', '', 'jama-dermatology'],
  ['', 'Br J Dermatol', 'bjd'],
  ['', 'J Eur Acad Dermatol Venereol', 'jeadv'],
  ['', 'J Invest Dermatol', 'jid'],
]

for (const [fullName, source, expected] of aliasCases) {
  assert.equal(matchJournal(fullName, source)?.id, expected)
}
assert.equal(matchJournal('New England Journal of Medicine', 'N Engl J Med'), null)

assert.equal(classifyStudy('A systematic review and meta-analysis', '').studyType, 'Systematic review / meta-analysis')
assert.equal(classifyStudy('Results from a phase 3 multicenter trial', '').studyType, 'Phase 3 trial')
assert.equal(classifyStudy('A randomized placebo-controlled study', '').studyType, 'Randomized trial')
assert.equal(classifyStudy('Prospective cohort of patients with psoriasis', '').studyType, 'Prospective cohort')

const journal = JOURNALS[0]
const phaseThree = rankArticle({
  title: 'Phase 3 randomized placebo-controlled multicenter trial',
  abstract: 'A'.repeat(400),
  publicationDate: new Date().toISOString(),
  journal,
})
const cohort = rankArticle({
  title: 'Retrospective cohort study',
  abstract: 'A'.repeat(400),
  publicationDate: new Date().toISOString(),
  journal,
})

assert.ok(phaseThree.rankingScore > cohort.rankingScore)
assert.ok(phaseThree.rankingScore <= 100)
assert.ok(phaseThree.rankingBreakdown.design > cohort.rankingBreakdown.design)

console.log(`Daily evidence triage regression tests passed (${aliasCases.length + 7} assertions).`)
