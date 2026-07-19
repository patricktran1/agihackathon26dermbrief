import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  Inbox,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { curatedJournals } from './journals'
import './todays-dermbrief.css'

type RankingBreakdown = {
  design: number
  additionalSignals: number
  recency: number
  journalInfluence: number
  abstractCompleteness: number
  baseline: number
}

type InboxArticle = {
  pmid: string
  title: string
  journal: string
  journalShort: string
  publicationDate: string
  authors: string[]
  studyType: string
  rankingScore: number
  rankingReasons: string[]
  rankingBreakdown: RankingBreakdown
  impactFactor: number
  metricYear: number
  abstractScope: string
}

type InboxPayload = {
  articles: InboxArticle[]
  scannedJournals: number
  scannedAt: string
  topic: string
  lookbackDays: number
  rankingMethod: string
}

function isInboxPayload(value: unknown): value is InboxPayload {
  return Boolean(
    value
      && typeof value === 'object'
      && 'articles' in value
      && Array.isArray((value as InboxPayload).articles),
  )
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  if (setter) setter.call(input, value)
  else input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

export default function TodaysDermBrief() {
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [payload, setPayload] = useState<InboxPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const scan = async (requestedTopic = topic.trim()) => {
    setLoading(true)
    setError(null)
    try {
      const query = requestedTopic ? `?topic=${encodeURIComponent(requestedTopic)}` : ''
      const response = await fetch(`/api/daily-brief${query}`)
      const result: unknown = await response.json()
      if (!response.ok || !isInboxPayload(result)) {
        const message = typeof result === 'object' && result && 'error' in result
          ? String(result.error)
          : 'Could not build today’s evidence inbox.'
        throw new Error(message)
      }
      setPayload(result)
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Could not build today’s evidence inbox.')
    } finally {
      setLoading(false)
    }
  }

  const openInbox = () => {
    setOpen(true)
    if (!payload && !loading) void scan('')
  }

  const launchEvidenceOps = (article: InboxArticle) => {
    const input = document.querySelector<HTMLInputElement>('.run-control input[inputmode="numeric"]')
    const runButton = document.querySelector<HTMLButtonElement>('.run-control .run-button')
    if (!input || !runButton) {
      setError('The EvidenceOps PMID control is unavailable. Refresh the page and try again.')
      return
    }

    setReactInputValue(input, article.pmid)
    setOpen(false)
    window.setTimeout(() => {
      document.getElementById('top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.setTimeout(() => {
        if (!runButton.disabled) runButton.click()
        else input.focus()
      }, 160)
    }, 120)
  }

  const representedJournals = useMemo(
    () => new Set(payload?.articles.map((article) => article.journalShort) ?? []).size,
    [payload],
  )
  const topScore = payload?.articles[0]?.rankingScore ?? 0

  return (
    <>
      <button className="today-launcher" type="button" onClick={openInbox} aria-label="Open today’s dermatology evidence inbox">
        <span><Inbox size={20} /></span>
        <div>
          <strong>Today’s DermBrief</strong>
          <small>{payload ? `${payload.articles.length} papers prioritized` : 'Scan six journals'}</small>
        </div>
        <ChevronRight size={17} />
      </button>

      {open && (
        <div className="today-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <section className="today-modal" role="dialog" aria-modal="true" aria-labelledby="today-dermbrief-title">
            <header className="today-header">
              <div className="today-title-row">
                <span className="today-icon"><Sparkles size={23} /></span>
                <div>
                  <p>Cross-journal evidence triage</p>
                  <h2 id="today-dermbrief-title">Today’s Dermatology Evidence Inbox</h2>
                  <small>PubMed abstracts and metadata prioritized for physician review. No autonomous release.</small>
                </div>
              </div>
              <button ref={closeButtonRef} className="today-close" type="button" onClick={() => setOpen(false)} aria-label="Close today’s dermatology evidence inbox"><X size={19} /></button>
            </header>

            <div className="today-journal-strip" aria-label="Curated journals">
              {curatedJournals.map((journal) => <span key={journal.id}>{journal.shortName}</span>)}
            </div>

            <div className="today-controls">
              <label>
                <span>Optional clinical topic</span>
                <div><Search size={17} /><input value={topic} onChange={(event) => setTopic(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !loading) void scan() }} placeholder="psoriasis, melanoma, hidradenitis…" /></div>
              </label>
              <button type="button" onClick={() => void scan()} disabled={loading}>
                {loading ? <LoaderCircle className="today-spin" size={18} /> : <RefreshCw size={18} />}
                {loading ? 'Scanning six journals' : payload ? 'Refresh inbox' : 'Scan all journals'}
              </button>
            </div>

            {error && <div className="today-error"><X size={16} /><span>{error}</span><button type="button" onClick={() => void scan()}>Retry</button></div>}

            {loading && !payload ? (
              <div className="today-loading">
                <LoaderCircle className="today-spin" size={34} />
                <strong>Reading the dermatology literature stream</strong>
                <p>Scanning six curated journals, requiring abstracts, deduplicating PubMed records, and applying transparent triage signals.</p>
              </div>
            ) : payload && payload.articles.length > 0 ? (
              <>
                <div className="today-metrics">
                  <div><strong>{payload.articles.length}</strong><span>prioritized papers</span></div>
                  <div><strong>{representedJournals}/{payload.scannedJournals}</strong><span>journals represented</span></div>
                  <div><strong>{topScore}</strong><span>top triage score</span></div>
                  <div><strong>{payload.topic || 'All topics'}</strong><span>active filter</span></div>
                </div>

                <div className="today-list">
                  {payload.articles.map((article, index) => (
                    <article className={index === 0 ? 'today-paper top-paper' : 'today-paper'} key={article.pmid}>
                      <div className="today-rank">{String(index + 1).padStart(2, '0')}</div>
                      <div className="today-paper-copy">
                        <div className="today-paper-meta">
                          <span>{article.journalShort}</span>
                          <span><CalendarDays size={12} /> {article.publicationDate}</span>
                          <span>PMID {article.pmid}</span>
                        </div>
                        <h3>{article.title}</h3>
                        <p>{article.authors.join(', ') || 'Author metadata unavailable'}</p>
                        <div className="today-reasons">
                          <strong><BookOpenCheck size={13} /> {article.studyType}</strong>
                          {article.rankingReasons.map((reason) => <span key={reason}>{reason}</span>)}
                        </div>
                        <div className="today-breakdown" aria-label="Deterministic ranking score breakdown">
                          Design {article.rankingBreakdown.design}
                          <b>+</b> signals {article.rankingBreakdown.additionalSignals}
                          <b>+</b> recency {article.rankingBreakdown.recency}
                          <b>+</b> journal {article.rankingBreakdown.journalInfluence}
                          <b>+</b> abstract {article.rankingBreakdown.abstractCompleteness}
                          <b>+</b> baseline {article.rankingBreakdown.baseline}
                        </div>
                      </div>
                      <div className="today-paper-action">
                        <div className="today-score"><strong>{article.rankingScore}</strong><span>triage score</span></div>
                        <button type="button" onClick={() => launchEvidenceOps(article)}>Run EvidenceOps <ChevronRight size={15} /></button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : payload ? (
              <div className="today-loading"><Inbox size={34} /><strong>No recent matching papers</strong><p>Broaden the topic or refresh the unfiltered inbox.</p></div>
            ) : null}

            <footer className="today-footer">
              <span>Triage score ≠ evidence-quality score. Ranking uses abstract and metadata signals only.</span>
              {payload?.scannedAt && <small>Scanned {new Date(payload.scannedAt).toLocaleString()} · {payload.lookbackDays}-day window</small>}
            </footer>
          </section>
        </div>
      )}
    </>
  )
}
