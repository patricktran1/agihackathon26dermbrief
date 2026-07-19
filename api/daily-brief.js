const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const TOOL = 'dermbrief-evidenceops'
const EMAIL = 'patrick@trandermatology.com'
const LOOKBACK_DAYS = 180
const MAX_RESULTS = 24

export const JOURNALS = [
  {
    id: 'jaad',
    name: 'Journal of the American Academy of Dermatology',
    shortName: 'JAAD',
    impactFactor: 12.3,
    metricYear: 2025,
    aliases: ['journal of the american academy of dermatology', 'j am acad dermatol'],
  },
  {
    id: 'ajcd',
    name: 'American Journal of Clinical Dermatology',
    shortName: 'AJCD',
    impactFactor: 11.4,
    metricYear: 2025,
    aliases: ['american journal of clinical dermatology', 'am j clin dermatol'],
  },
  {
    id: 'jama-dermatology',
    name: 'JAMA Dermatology',
    shortName: 'JAMA Derm',
    impactFactor: 10.9,
    metricYear: 2025,
    aliases: ['jama dermatology', 'jama dermatol'],
  },
  {
    id: 'bjd',
    name: 'British Journal of Dermatology',
    shortName: 'BJD',
    impactFactor: 8.2,
    metricYear: 2025,
    aliases: ['british journal of dermatology', 'br j dermatol'],
  },
  {
    id: 'jeadv',
    name: 'Journal of the European Academy of Dermatology and Venereology',
    shortName: 'JEADV',
    impactFactor: 8.0,
    metricYear: 2025,
    aliases: ['journal of the european academy of dermatology and venereology', 'j eur acad dermatol venereol'],
  },
  {
    id: 'jid',
    name: 'Journal of Investigative Dermatology',
    shortName: 'JID',
    impactFactor: 5.7,
    metricYear: 2025,
    aliases: ['journal of investigative dermatology', 'j invest dermatol'],
  },
]

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=1800' } })
}

function ncbiUrl(path) {
  const url = new URL(`${EUTILS_BASE}/${path}`)
  url.searchParams.set('tool', TOOL)
  url.searchParams.set('email', EMAIL)
  if (process.env.NCBI_API_KEY) url.searchParams.set('api_key', process.env.NCBI_API_KEY)
  return url
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': `${TOOL}/1.0 (${EMAIL})` } })
  if (!response.ok) throw new Error(`NCBI request failed with ${response.status}`)
  return response.text()
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': `${TOOL}/1.0 (${EMAIL})` } })
  if (!response.ok) throw new Error(`NCBI request failed with ${response.status}`)
  return response.json()
}

function decodeEntities(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
}

function clean(value) {
  return typeof value === 'string'
    ? decodeEntities(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : ''
}

function normalizeJournal(value) {
  return clean(value)
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function matchJournal(fullName, source) {
  const candidates = [fullName, source].map(normalizeJournal).filter(Boolean)
  return JOURNALS.find((journal) => {
    const aliases = [journal.name, ...journal.aliases].map(normalizeJournal)
    return candidates.some((candidate) => aliases.includes(candidate))
  }) ?? null
}

function extractAbstracts(xml) {
  const abstracts = new Map()
  const articlePattern = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g
  let articleMatch

  while ((articleMatch = articlePattern.exec(xml)) !== null) {
    const block = articleMatch[1]
    const pmid = block.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1]
    if (!pmid) continue

    const parts = []
    const abstractPattern = /<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g
    let abstractMatch
    while ((abstractMatch = abstractPattern.exec(block)) !== null) {
      const label = clean(abstractMatch[1].match(/Label="([^"]+)"/)?.[1] ?? '')
      const text = clean(abstractMatch[2])
      if (text) parts.push(label ? `${label}: ${text}` : text)
    }
    abstracts.set(pmid, parts.join(' '))
  }

  return abstracts
}

function parsePublicationDate(value) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp) : null
}

export function classifyStudy(title, abstract) {
  const text = `${title} ${abstract}`.toLowerCase()
  const signals = []
  let studyType = 'Recent journal article'
  let designScore = 8

  if (/systematic review|meta-analysis|meta analysis/.test(text)) {
    studyType = 'Systematic review / meta-analysis'
    designScore = 32
    signals.push('Systematic review or meta-analysis language')
  } else if (/phase\s*(?:iii|3)\b/.test(text)) {
    studyType = 'Phase 3 trial'
    designScore = 30
    signals.push('Phase 3 trial language')
  } else if (/randomi[sz]ed|random allocation|double-blind|double blind/.test(text)) {
    studyType = 'Randomized trial'
    designScore = 26
    signals.push('Randomized trial language')
  } else if (/clinical practice guideline|guideline|consensus statement|expert consensus/.test(text)) {
    studyType = 'Guideline / consensus'
    designScore = 24
    signals.push('Guideline or consensus language')
  } else if (/prospective (?:cohort|study)|longitudinal cohort/.test(text)) {
    studyType = 'Prospective cohort'
    designScore = 18
    signals.push('Prospective cohort language')
  } else if (/cohort study|retrospective cohort/.test(text)) {
    studyType = 'Cohort study'
    designScore = 14
    signals.push('Cohort study language')
  }

  let otherScore = 0
  if (/multicentre|multicenter/.test(text)) {
    otherScore += 8
    signals.push('Multicenter design language')
  }
  if (/controlled|comparator|versus|placebo/.test(text)) {
    otherScore += 6
    signals.push('Controlled comparator language')
  }
  if (/pragmatic|real-world|real world/.test(text)) {
    otherScore += 4
    signals.push('Pragmatic or real-world signal')
  }

  return { studyType, designScore, otherScore, signals }
}

export function rankArticle({ title, abstract, publicationDate, journal }) {
  const classification = classifyStudy(title, abstract)
  const published = parsePublicationDate(publicationDate)
  const ageDays = published ? Math.max(0, Math.floor((Date.now() - published.getTime()) / 86_400_000)) : LOOKBACK_DAYS
  const recencyScore = Math.max(0, Math.round(18 * (1 - Math.min(ageDays, LOOKBACK_DAYS) / LOOKBACK_DAYS)))
  const journalInfluenceScore = Math.round((journal.impactFactor / 12.3) * 16)
  const abstractScore = abstract.length >= 300 ? 6 : abstract.length >= 120 ? 3 : 0
  const rankingScore = Math.min(100, classification.designScore + classification.otherScore + recencyScore + journalInfluenceScore + abstractScore + 20)

  const rankingReasons = [
    ...classification.signals,
    ageDays <= 14 ? 'Published within 14 days' : ageDays <= 60 ? 'Published within 60 days' : 'Recent within the 180-day scan window',
    `${journal.metricYear} JIF ≈ ${journal.impactFactor.toFixed(1)}`,
  ].slice(0, 4)

  return {
    studyType: classification.studyType,
    rankingScore,
    rankingReasons,
    rankingBreakdown: {
      design: classification.designScore,
      additionalSignals: classification.otherScore,
      recency: recencyScore,
      journalInfluence: journalInfluenceScore,
      abstractCompleteness: abstractScore,
      baseline: 20,
    },
  }
}

export default {
  async fetch(request) {
    if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed' }, 405)

    try {
      const body = request.method === 'POST' ? await request.json() : null
      const topic = clean(body?.topic ?? new URL(request.url).searchParams.get('topic')).slice(0, 120)
      const journalClause = JOURNALS.map((journal) => `"${journal.name}"[Journal]`).join(' OR ')
      const term = `(${journalClause}) AND hasabstract AND ("last ${LOOKBACK_DAYS} days"[PDat])${topic ? ` AND (${topic}[Title/Abstract])` : ''}`

      const searchUrl = ncbiUrl('esearch.fcgi')
      searchUrl.searchParams.set('db', 'pubmed')
      searchUrl.searchParams.set('retmode', 'json')
      searchUrl.searchParams.set('sort', 'pub date')
      searchUrl.searchParams.set('retmax', '40')
      searchUrl.searchParams.set('term', term)

      const searchPayload = await fetchJson(searchUrl)
      const rawIds = Array.isArray(searchPayload?.esearchresult?.idlist) ? searchPayload.esearchresult.idlist : []
      const ids = [...new Set(rawIds.map(String).filter((id) => /^\d+$/.test(id)))]
      if (ids.length === 0) {
        return json({ articles: [], scannedJournals: JOURNALS.length, scannedAt: new Date().toISOString(), topic, lookbackDays: LOOKBACK_DAYS })
      }

      const summaryUrl = ncbiUrl('esummary.fcgi')
      summaryUrl.searchParams.set('db', 'pubmed')
      summaryUrl.searchParams.set('retmode', 'json')
      summaryUrl.searchParams.set('id', ids.join(','))

      const abstractUrl = ncbiUrl('efetch.fcgi')
      abstractUrl.searchParams.set('db', 'pubmed')
      abstractUrl.searchParams.set('retmode', 'xml')
      abstractUrl.searchParams.set('id', ids.join(','))

      const [summaryPayload, abstractXml] = await Promise.all([fetchJson(summaryUrl), fetchText(abstractUrl)])
      const abstracts = extractAbstracts(abstractXml)

      const articles = ids.flatMap((pmid) => {
        const record = summaryPayload?.result?.[pmid]
        if (!record) return []

        const journal = matchJournal(record.fulljournalname, record.source)
        const abstract = abstracts.get(pmid) ?? ''
        if (!journal || !abstract) return []

        const title = clean(record.title)
        const publicationDate = clean(record.pubdate) || clean(record.sortpubdate)
        const ranking = rankArticle({ title, abstract, publicationDate, journal })

        return [{
          pmid,
          title,
          journal: journal.name,
          journalShort: journal.shortName,
          publicationDate,
          authors: Array.isArray(record.authors)
            ? record.authors.slice(0, 4).map((author) => clean(author?.name)).filter(Boolean)
            : [],
          studyType: ranking.studyType,
          rankingScore: ranking.rankingScore,
          rankingReasons: ranking.rankingReasons,
          rankingBreakdown: ranking.rankingBreakdown,
          impactFactor: journal.impactFactor,
          metricYear: journal.metricYear,
          abstractScope: 'PubMed abstract and metadata',
        }]
      })
        .sort((a, b) => b.rankingScore - a.rankingScore || Number(b.pmid) - Number(a.pmid))
        .slice(0, MAX_RESULTS)

      return json({
        articles,
        scannedJournals: JOURNALS.length,
        scannedAt: new Date().toISOString(),
        topic,
        lookbackDays: LOOKBACK_DAYS,
        rankingMethod: 'Deterministic abstract-and-metadata triage',
      })
    } catch (error) {
      console.error(error)
      return json({ error: error instanceof Error ? error.message : 'Unable to build today\'s evidence inbox.' }, 502)
    }
  },
}
