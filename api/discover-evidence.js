const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const TOOL = 'dermbrief-evidenceops'
const EMAIL = 'patrick@trandermatology.com'

const JOURNALS = {
  jaad: 'Journal of the American Academy of Dermatology[Journal]',
  'jama-dermatology': 'JAMA Dermatology[Journal]',
  bjd: 'British Journal of Dermatology[Journal]',
  jeadv: 'Journal of the European Academy of Dermatology and Venereology[Journal]',
  'jaad-international': 'JAAD International[Journal]',
  jid: 'Journal of Investigative Dermatology[Journal]',
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
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

function clean(value) {
  return typeof value === 'string' ? value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    try {
      const body = await request.json()
      const journalId = String(body?.journal || 'jaad')
      const journalQuery = JOURNALS[journalId]
      if (!journalQuery) return json({ error: 'Unknown curated journal.' }, 400)

      const topic = clean(body?.topic).slice(0, 120)
      const term = `(${journalQuery}) AND hasabstract${topic ? ` AND (${topic}[Title/Abstract])` : ''}`
      const searchUrl = ncbiUrl('esearch.fcgi')
      searchUrl.searchParams.set('db', 'pubmed')
      searchUrl.searchParams.set('retmode', 'json')
      searchUrl.searchParams.set('sort', 'pub date')
      searchUrl.searchParams.set('retmax', '8')
      searchUrl.searchParams.set('term', term)

      const searchPayload = await fetchJson(searchUrl)
      const ids = Array.isArray(searchPayload?.esearchresult?.idlist) ? searchPayload.esearchresult.idlist : []
      if (ids.length === 0) return json({ journal: journalId, articles: [] })

      const summaryUrl = ncbiUrl('esummary.fcgi')
      summaryUrl.searchParams.set('db', 'pubmed')
      summaryUrl.searchParams.set('retmode', 'json')
      summaryUrl.searchParams.set('id', ids.join(','))
      const summaryPayload = await fetchJson(summaryUrl)

      const articles = ids.flatMap((pmid) => {
        const record = summaryPayload?.result?.[pmid]
        if (!record) return []
        return [{
          pmid,
          title: clean(record.title),
          journal: clean(record.fulljournalname) || clean(record.source),
          publicationDate: clean(record.pubdate) || clean(record.sortpubdate),
          authors: Array.isArray(record.authors)
            ? record.authors.slice(0, 4).map((author) => clean(author?.name)).filter(Boolean)
            : [],
        }]
      })

      return json({ journal: journalId, articles })
    } catch (error) {
      console.error(error)
      return json({ error: error instanceof Error ? error.message : 'Unable to discover recent evidence.' }, 502)
    }
  },
}
