import { useEffect, useState } from 'react'
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
import './daily-brief.css'

type RankingBreakdown = {
  design: number
  additionalSignals: number
  recency: number
  journalInfluence: number
  abstractCompleteness: number
  baseline: number
}

type BriefArticle = {
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

type BriefPayload = {
  articles: BriefArticle[]
  scannedJournals: number
  scannedAt: string
  topic: string
  lookbackDays: number
  rankingMethod: string
}

function isBriefPayload(value: unknown): value is BriefPayload {
  return Boolean(
    value
      && typeof value === 'object'
      && 'articles' in value
      && Array.isArray((value as BriefPayload).articles),
  )
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  if (setter) setter.call(input, value)
  else input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

export default function DailyBriefInbox() {
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [payload, setPayload] = useState<BriefPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const scan = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/daily-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      const result: unknown = await response.json()

      if (!response.ok || !isBriefPayload(result)) {
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
    if (!payload && !loading) void scan()
  }

  const launchEvidenceOps = (article: BriefArticle) => {
    const input = document.querySelector<HTMLInputElement>('.run-control input[inputmode="numeric"]')
    if (!input) {
      setError('The PMID control is unavailable. Refresh the page and try again.')
      return
    }

    setReactInputValue(input, article.pmid)
    setOpen(false)

    window.setTimeout(() => {
      document.getElementById('top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const runButton = document.querySelector<HTMLButtonElement>('.run-control .run-button')
      if (runButton && !runButton.disabled) runButton.click()
      else input.focus()
    }, 240)
  }

  const topScore = payload?.articles[0]?.rankingScore ?? 0
  const representedJournals = new Set(payload?.articles.map((article) => article.journalShort) ?? []).size

  return (
    <>
      <button className="brief-launcher" type="button" onClick={openInbox} aria-label="Open Today’s DermBrief">
        <span><Inbox size={20} /></span>
        <div>
          <strong>Today&apos;s DermBrief</strong>
          <small>{payload ? `${payload.articles.length} papers prioritized` : 'Scan all six journals'}</small>
        </div>
        <ChevronRight size={17} />
      </button>

      {open && (
        <div className="brief-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <section className="brief-modal" role="dialog" aria-modal="true" aria-labelledby="daily-brief-title">
            <header className="brief-header">
              <div className="brief-title-row">
                <span className="brief-icon"><Sparkles size={23} /></span>
                <div>
                  <p>Cross-journal evidence triage</p>
                  <h2 id="daily-brief-title">Today&apos;s Dermatology Evidence Inbox</h2>
                  <small>Recent PubMed papers prioritized for physician review, never autonomous publication.</small>
                </div>
              </div>
              <button className="brief-close" type="button" onClick={() => setOpen(false)} aria-label="Close Today’s DermBrief"><X size={19} /></button>
            </header>

            <div className="brief-journal-strip">
              {curatedJournals.map((journal) => <span key={journal.id}>{journal.shortName}</span>)}
            </div>

            <div className="brief-controls">
              <label>
                <span>Optional clinical topic</span>
                <div>
                  <Search size={17} />
                  <input
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter' && !loading) void scan() }}
                    placeholder="psoriasis, melanoma, hidradenitis…"
                  />
                </div>
              </label>
              <button type="button" onClick={() => void scan()} disabled={loading}>
                {loading ? <LoaderCircle className="spin" size={18} /> : <RefreshCw size={18} />}
                {loading ? 'Scanning journals' : payload ? 'Refresh inbox' : 'Scan all journals'}
              </button>
            </div>

            {error && <div className="brief-error"><X size={16} /><span>{error}</span><button type="button" onClick={() => void scan()}>Retry</button></div>}

            {loading && !payload ? (
              <div className="brief-loading">
                <LoaderCircle className="spin" size={32} />
                <strong>Reading the dermatology literature stream</strong>
                <p>Scanning six journals, deduplicating PubMed records, and ranking the strongest review candidates.</p>
              </div>
            ) : payload && payload.articles.length > 0 ? (
              <>
                <div className="brief-metrics">
                  <div><strong>{payload.articles.length}</strong><span>prioritized papers</span></div>
                  <div><strong>{representedJournals}/{payload.scannedJournals}</strong><span>journals represented</span></div>
                  <div><strong>{topScore}</strong><span>top triage score</span></div>
                  <div><strong>{payload.topic || 'All topics'}</strong><span>active filter</span></div>
                </div>

                <div className="brief-list">
                  {payload.articles.map((article, index) => (
                    <article className={index === 0 ? 'brief-paper top-paper' : 'brief-paper'} key={article.pmid}>
                      <div className="brief-rank">{String(index + 1).padStart(2, '0')}</div>
                      <div className="brief-paper-copy">
                        <div className="brief-paper-meta">
                          <span>{article.journalShort}</span>
                          <span><CalendarDays size={12} /> {article.publicationDate}</span>
                          <span>PMID {article.pmid}</span>
                        </div>
                        <h3>{article.title}</h3>
                        <p>{article.authors.join(', ')}</p>
                        <div className="brief-reasons">
                          <strong><BookOpenCheck size={13} /> {article.studyType}</strong>
                          {article.rankingReasons.map((reason) => <span key={reason}>{reason}</span>)}
                        </div>
                        <small className="brief-breakdown">
                          Score components: design {article.rankingBreakdown.design} · recency {article.rankingBreakdown.recency} · journal {article.rankingBreakdown.journalInfluence} · other signals {article.rankingBreakdown.additionalSignals}
                        </small>
                      </div>
                      <div className="brief-paper-action">
                        <div className="brief-score"><strong>{article.rankingScore}</strong><span>triage</span></div>
                        <button type="button" onClick={() => launchEvidenceOps(article)}>Run EvidenceOps <ChevronRight size={15} /></button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : payload ? (
              <div className="brief-loading"><Inbox size={32} /><strong>No recent matching papers</strong><p>Broaden the topic or refresh the unfiltered inbox.</p></div>
            ) : null}

            <footer className="brief-footer">
              <span>Triage scores rank review priority from PubMed metadata and abstracts. They are not evidence-quality scores or clinical recommendations.</span>
              {payload?.scannedAt && <small>{payload.lookbackDays}-day window · scanned {new Date(payload.scannedAt).toLocaleString()}</small>}
            </footer>
          </section>
        </div>
      )}
    </>
  )
}
