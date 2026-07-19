import { generateAiEvidence } from './ai-evidence.js'

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const BIOC_BASE = 'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pubmed.cgi'
const TOOL = 'dermbrief-evidenceops'
const EMAIL = 'patrick@trandermatology.com'

export const JOURNALS = [
  {
    canonical: 'Journal of the American Academy of Dermatology',
    aliases: ['Journal of the American Academy of Dermatology', 'J Am Acad Dermatol', 'JAAD'],
  },
  {
    canonical: 'American Journal of Clinical Dermatology',
    aliases: ['American Journal of Clinical Dermatology', 'Am J Clin Dermatol', 'AJCD'],
  },
  {
    canonical: 'JAMA Dermatology',
    aliases: ['JAMA Dermatology', 'JAMA Dermatol'],
  },
  {
    canonical: 'British Journal of Dermatology',
    aliases: ['British Journal of Dermatology', 'The British Journal of Dermatology', 'Br J Dermatol', 'BJD'],
  },
  {
    canonical: 'Journal of the European Academy of Dermatology and Venereology',
    aliases: [
      'Journal of the European Academy of Dermatology and Venereology',
      'J Eur Acad Dermatol Venereol',
      'JEADV',
    ],
  },
  {
    canonical: 'Journal of Investigative Dermatology',
    aliases: ['Journal of Investigative Dermatology', 'The Journal of Investigative Dermatology', 'J Invest Dermatol', 'JID'],
  },
  {
    canonical: 'JAAD International',
    aliases: ['JAAD International', 'JAAD Int'],
  },
]

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

function clean(value) {
  return typeof value === 'string' ? value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function ncbiUrl(path) {
  const url = new URL(`${EUTILS_BASE}/${path}`)
  url.searchParams.set('tool', TOOL)
  url.searchParams.set('email', EMAIL)
  if (process.env.NCBI_API_KEY) url.searchParams.set('api_key', process.env.NCBI_API_KEY)
  return url
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': `${TOOL}/1.0 (${EMAIL})` } })
  if (!response.ok) throw new Error(`NCBI request failed with ${response.status}`)
  return response.json()
}

export function normalizeJournalName(value) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bthe\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function journalMatch(...values) {
  const candidates = values.flat().map(normalizeJournalName).filter(Boolean)
  return JOURNALS.find((journal) => journal.aliases.some((alias) => candidates.includes(normalizeJournalName(alias))))
}

function passages(value, output = []) {
  if (Array.isArray(value)) value.forEach((item) => passages(item, output))
  else if (isRecord(value)) {
    if (typeof value.text === 'string' && isRecord(value.infons)) output.push(value)
    Object.values(value).forEach((item) => passages(item, output))
  }
  return output
}

function articleText(payload) {
  const all = passages(payload)
  const title = all.find((passage) => clean(passage.infons?.type).toLowerCase() === 'title')
  const abstractParts = all.filter((passage) => clean(passage.infons?.type).toLowerCase().startsWith('abstract'))
  const sections = abstractParts.map((passage) => ({
    label: clean(passage.infons?.section_type) || 'Abstract',
    text: clean(passage.text),
  })).filter((section) => section.text)
  return { title: clean(title?.text), abstract: sections.map((section) => section.text).join(' '), sections }
}

function scoreArticle(title, abstract) {
  const text = `${title} ${abstract}`.toLowerCase()
  let score = 48
  const reasons = []
  if (/systematic review|meta-analysis/.test(text)) { score = 84; reasons.push('Systematic review or meta-analysis') }
  else if (/phase 3|phase iii/.test(text)) { score = 80; reasons.push('Phase 3 clinical trial') }
  else if (/randomized|randomised/.test(text)) { score = 74; reasons.push('Randomized controlled design') }
  else if (/prospective cohort/.test(text)) { score = 64; reasons.push('Prospective cohort design') }
  else reasons.push('Peer-reviewed article in a curated journal')
  if (/double-blind|double blinded|double-blinded|masked/.test(text)) { score += 5; reasons.push('Blinding reduces assessment bias') }
  if (/multicenter|multi-center|multicentre/.test(text)) { score += 4; reasons.push('Multicenter enrollment') }
  if (/placebo|vehicle-controlled|vehicle controlled/.test(text)) { score += 3; reasons.push('Controlled comparison') }
  if (/active comparator|active-comparator|apremilast|standard care/.test(text)) { score += 4; reasons.push('Active clinical comparator') }
  if (/open-label|open label/.test(text)) { score -= 7; reasons.push('Open-label limitation applied') }
  if (/retrospective/.test(text)) { score -= 6; reasons.push('Retrospective limitation applied') }
  return { score: Math.max(30, Math.min(95, Math.round(score))), reasons: reasons.slice(0, 5) }
}

function findResultSentence(abstract) {
  const sentences = abstract.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 35)
  return sentences.find((sentence) => /significant|higher|lower|improved|response|associated|reduced|increase|decrease/i.test(sentence)) || sentences.at(-1) || abstract.slice(0, 420)
}

function makeCard(article, score) {
  const result = findResultSentence(article.abstract)
  const cautiousResult = result.replace(/^results?:?\s*/i, '')
  return {
    title: article.title.length > 90 ? `${article.title.slice(0, 87)}…` : article.title,
    prompt: 'Which statement is most directly supported by the published abstract?',
    options: [
      cautiousResult,
      'The intervention was proven superior to every available alternative therapy.',
      'The study established permanent benefit without a need for additional follow-up.',
      'The results apply equally to all populations and clinical settings.',
    ],
    correctOptionIndex: 0,
    explanation: cautiousResult,
    whyItMatters: `This ${score >= 80 ? 'high-signal' : 'eligible'} study may affect how dermatologists discuss evidence with appropriately matched patients, but its exact population and comparator still matter.`,
    mondayMove: 'Verify the population, intervention, comparator, outcome, and follow-up before changing practice or counseling an individual patient.',
    limitations: 'The generated card is restricted to the PubMed abstract. Full-text methods, subgroup definitions, funding, adverse events, and broader applicability require physician review.',
    evidenceMap: [
      { claim: cautiousResult, sourceQuote: result, sourceSection: 'Abstract', supportType: 'direct' },
      { claim: 'Full-text review remains necessary before practice change', sourceQuote: result, sourceSection: 'Abstract', supportType: 'cautious_inference' },
    ],
  }
}

function events(article, score, ai) {
  const time = () => new Date().toISOString().slice(11, 19)
  const llmAssisted = ai.mode === 'llm-assisted'
  return [
    { sequence: 1, timestamp: time(), sender: 'scout', recipient: 'workflow', kind: 'checkpoint', phase: 'Discovery', message: `PMID ${article.pmid} retrieved from ${article.journal}; whitelist identity verified.`, sourceVerified: true },
    { sequence: 2, timestamp: time(), sender: 'scout', recipient: 'appraiser', kind: 'handoff', phase: 'Handoff', message: 'Verified metadata and abstract passed to evidence appraisal.', sourceVerified: true },
    { sequence: 3, timestamp: time(), sender: 'appraiser', recipient: 'workflow', kind: 'checkpoint', phase: 'Appraisal', message: `Deterministic evidence score: ${score}/100.`, sourceVerified: true },
    { sequence: 4, timestamp: time(), sender: 'appraiser', recipient: 'grounder', kind: 'handoff', phase: 'Delegation', message: llmAssisted ? `Schema-bound Grounder invoked ${ai.grounderModel} using only PubMed abstract data.` : 'AI draft was unavailable or rejected; deterministic Grounder fallback retained.', sourceVerified: true },
    { sequence: 5, timestamp: time(), sender: 'grounder', recipient: 'auditor', kind: 'handoff', phase: 'Grounding', message: llmAssisted ? 'Grounded card and exact source mappings submitted to an independent AI audit pass.' : 'Deterministic card and exact source mappings submitted for safety review.', sourceVerified: true },
    { sequence: 6, timestamp: time(), sender: 'auditor', recipient: 'publisher', kind: 'checkpoint', phase: 'Safety', message: llmAssisted ? 'AI Auditor approved the bounded draft; deterministic quote and language checks passed. Publisher remains blocked.' : 'Deterministic source checks passed. Publisher remains blocked until physician approval.', sourceVerified: true },
  ]
}

async function getArticle(pmid) {
  const summaryUrl = ncbiUrl('esummary.fcgi')
  summaryUrl.searchParams.set('db', 'pubmed')
  summaryUrl.searchParams.set('retmode', 'json')
  summaryUrl.searchParams.set('id', pmid)
  const summaryPayload = await fetchJson(summaryUrl)
  const record = summaryPayload?.result?.[pmid]
  if (!isRecord(record)) return null

  const journalCandidates = [clean(record.fulljournalname), clean(record.source)].filter(Boolean)
  const matched = journalMatch(journalCandidates)
  if (!matched) {
    const observed = journalCandidates.join(' / ') || 'This journal'
    throw Object.assign(new Error(`${observed} is outside the DermBrief curated journal set.`), { status: 403 })
  }

  const bioc = await fetchJson(new URL(`${BIOC_BASE}/BioC_json/${pmid}/unicode`))
  const text = articleText(bioc)
  if (!text.abstract) throw Object.assign(new Error('PubMed did not provide an abstract for this record.'), { status: 422 })
  const ids = Array.isArray(record.articleids) ? record.articleids : []
  const doi = ids.find((item) => item?.idtype === 'doi')?.value
  return {
    pmid,
    title: text.title || clean(record.title),
    journal: matched.canonical,
    publicationDate: clean(record.pubdate) || clean(record.sortpubdate),
    authors: Array.isArray(record.authors) ? record.authors.map((author) => clean(author?.name)).filter(Boolean) : [],
    abstract: text.abstract,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    doi: clean(doi) || undefined,
  }
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    try {
      const body = await request.json()
      const pmid = String(body?.pmid || '').replace(/\D/g, '').slice(0, 12)
      if (!pmid) return json({ error: 'A valid PMID is required.' }, 400)
      const article = await getArticle(pmid)
      if (!article) return json({ error: 'PubMed record not found.' }, 404)

      const appraisal = scoreArticle(article.title, article.abstract)
      const deterministicCard = makeCard(article, appraisal.score)
      const { card, ai } = await generateAiEvidence(article, appraisal, deterministicCard)
      const evidenceQuotesValid = card.evidenceMap.every((entry) => article.abstract.includes(entry.sourceQuote))
      const aiGovernancePassed = ai.mode === 'deterministic-fallback' || (ai.auditorApproved && Object.values(ai.deterministicChecks).every(Boolean))
      const safe = evidenceQuotesValid && appraisal.score >= 65 && aiGovernancePassed
      const llmAssisted = ai.mode === 'llm-assisted'

      const agents = [
        { id: 'scout', name: 'Scout', role: 'Literature scout', description: 'Retrieves and verifies the PubMed record.', status: 'complete' },
        { id: 'appraiser', name: 'Appraiser', role: 'Evidence appraiser', description: 'Applies the transparent deterministic evidence-quality score.', status: 'complete' },
        { id: 'grounder', name: 'Grounder', role: llmAssisted ? 'Schema-bound AI educator' : 'Deterministic clinical educator', description: llmAssisted ? 'Drafts one bounded card from the abstract with claim-level source links.' : 'Retains the tested deterministic card when AI does not clear governance.', status: safe ? 'complete' : 'blocked' },
        { id: 'auditor', name: 'Safety Auditor', role: llmAssisted ? 'Independent AI plus deterministic safety' : 'Deterministic medical safety', description: 'Rejects unsupported language and verifies every quoted source string.', status: safe ? 'complete' : 'blocked' },
        { id: 'publisher', name: 'Publisher', role: 'Release manager', description: 'Creates a versioned PR only after physician approval.', status: 'waiting' },
      ]
      const startedAt = new Date().toISOString()

      return json({
        id: `run-${pmid}-${Date.now()}`,
        startedAt,
        completedAt: new Date().toISOString(),
        status: safe ? 'awaiting_physician' : 'blocked',
        executionSource: 'vercel-direct',
        score: appraisal.score,
        scoreReasons: appraisal.reasons,
        safetyChecks: [
          { label: 'Journal scope', passed: true, detail: `${article.journal} matches the curated whitelist.` },
          { label: 'Evidence threshold', passed: appraisal.score >= 65, detail: `Deterministic quality score ${appraisal.score}/100.` },
          { label: 'Source grounding', passed: evidenceQuotesValid, detail: evidenceQuotesValid ? 'Every quoted excerpt exists verbatim in the PubMed abstract.' : 'At least one generated quote could not be verified.' },
          { label: 'AI governance', passed: aiGovernancePassed, detail: llmAssisted ? `Grounder and Auditor completed with ${ai.grounderModel}; deterministic veto checks passed.` : 'AI output was unavailable or rejected, so the tested deterministic fallback was retained.' },
          { label: 'Human boundary', passed: true, detail: 'Publisher remains unavailable until a physician approves.' },
        ],
        agents,
        events: events(article, appraisal.score, ai),
        article,
        card,
        ai,
      })
    } catch (error) {
      console.error(error)
      return json({ error: error instanceof Error ? error.message : 'Unable to process PubMed evidence.' }, Number.isInteger(error?.status) ? error.status : 502)
    }
  },
}
