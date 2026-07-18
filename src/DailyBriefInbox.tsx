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

type BriefArticle = {
  pmid: string
  title: string
  journal: string
  journalShort: string
  publicationDate: string
  authors: string[]
  priorityScore: number
  evidenceType: string
  whyFlagged: string[]
  impactFactor: number
}

type BriefPayload = {
  articles: BriefArticle[]
  scannedJournals: number
  scannedAt: string
  topic: string
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
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
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
          : 'Could not build the daily evidence inbox.'
        throw new Error(message)
      }
      setPayload(result)
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Could not build the daily evidence inbox.')
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
    }, 220)
  }

  const topScore = payload?.articles[0]?.priorityScore ?? 0
  const representedJournals = new Set(payload?.articles.map((article) => article.journalShort) ?? []).size

  return (
    <>
      <button className="brief-launcher" type="button" onClick={openInbox} aria-label="Open daily evidence inbox">
        <span><Inbox size={20} /></span>
        <div><strong>Daily Brief</strong><small>{payload ? `${payload.articles.length} ranked papers` : 'Scan all journals'}</small></div>
        <ChevronRight size={17} />
      </button>

      {open && (
        <div className="brief-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <section className="brief-modal" role="dialog" aria-modal="true" aria-labelledby="daily-brief-title">
            <header className="brief-header">
              <div className="brief-title-row">
                <span className="brief-icon"><Sparkles size={23} /></span>
                <div>
                  <p>Cross-journal intelligence</p>
                  <h2 id="daily-brief-title">Today&apos;s Dermatology Evidence Inbox</h2>
                  <small>Recent PubMed papers ranked for physician review, never autonomous publication.</small>
                </div>
              </div>
              <button className="brief-close" type="button" onClick={() => setOpen(false)} aria-label="Close daily evidence inbox"><X size={19} /></button>
            </header>

            <div className="brief-journal-strip">
              {curatedJournals.map((journal) => <span key={journal.id}>{journal.shortName}</span>)}
            </div>

            <div className="brief-controls">
              <label>
                <span>Optional clinical topic</span>
                <div><Search size={17} /><input value={topic} onChange={(event) => setTopic(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !loading) void scan() }} placeholder="psoriasis, melanoma, hidradenitis…" /></div>
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
                <p>Scanning six journals, deduplicating PubMed records, and ranking the strongest signals.</p>
              </div>
            ) : payload && payload.articles.length > 0 ? (
              <>
                <div className="brief-metrics">
                  <div><strong>{payload.articles.length}</strong><span>ranked papers</span></div>
                  <div><strong>{representedJournals}/{payload.scannedJournals}</strong><span>journals represented</span></div>
                  <div><strong>{topScore}</strong><span>top priority score</span></div>
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
                          <strong><BookOpenCheck size={13} /> {article.evidenceType}</strong>
                          {article.whyFlagged.map((reason) => <span key={reason}>{reason}</span>)}
                        </div>
                      </div>
                      <div className="brief-paper-action">
                        <div className="brief-score"><strong>{article.priorityScore}</strong><span>priority</span></div>
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
              <span>Priority scores are deterministic triage signals, not clinical recommendations.</span>
              {payload?.scannedAt && <small>Scanned {new Date(payload.scannedAt).toLocaleString()}</small>}
            </footer>
          </section>
        </div>
      )}
    </>
  )
}
