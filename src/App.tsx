import { useMemo, useRef, useState } from 'react'
import {
  Activity,
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleStop,
  Cloud,
  Database,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  GitPullRequest,
  HeartPulse,
  LoaderCircle,
  LockKeyhole,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Workflow,
  X,
} from 'lucide-react'
import { demoRun } from './demo'
import {
  appendAgentEvent,
  beginEvidenceRun,
  finalizeEvidenceRun,
  insforgeConfigured,
  persistEvidenceRun,
} from './lib/insforge'
import type { AgentId, AgentState, CoordinationEvent, EvidenceRun } from './types'

const agentIcons: Record<AgentId, typeof Search> = {
  scout: Search,
  appraiser: BrainCircuit,
  grounder: BookOpenCheck,
  auditor: ShieldCheck,
  publisher: GitPullRequest,
}

const statusLabels: Record<AgentState['status'], string> = {
  idle: 'Idle',
  working: 'Working',
  complete: 'Complete',
  blocked: 'Blocked',
  waiting: 'Awaiting physician',
}

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

function isEvidenceRun(value: unknown): value is EvidenceRun {
  return typeof value === 'object' && value !== null && 'article' in value && 'events' in value && 'card' in value
}

function normalizeRun(run: EvidenceRun, source: EvidenceRun['executionSource']): EvidenceRun {
  return {
    ...run,
    executionSource: source,
    events: run.events.map((event) => ({
      ...event,
      sourceVerified: event.sourceVerified ?? true,
      persisted: false,
    })),
  }
}

export default function App() {
  const [pmid, setPmid] = useState('35820547')
  const [run, setRun] = useState<EvidenceRun | null>(null)
  const [running, setRunning] = useState(false)
  const [activeEvents, setActiveEvents] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [persistence, setPersistence] = useState<'idle' | 'saved' | 'local' | 'error'>('idle')
  const [approvalState, setApprovalState] = useState<'idle' | 'saving' | 'saved' | 'local' | 'error'>('idle')
  const [selectedEvidence, setSelectedEvidence] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const pmidInputRef = useRef<HTMLInputElement>(null)
  const toastTimerRef = useRef<number | undefined>(undefined)

  const completeAgents = useMemo(
    () => run?.agents.filter((agent) => agent.status === 'complete').length ?? 0,
    [run],
  )

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3600)
  }

  const animateAndPersist = async (nextRun: EvidenceRun, useDemo: boolean) => {
    const stagedRun: EvidenceRun = {
      ...nextRun,
      status: 'processing',
      agents: nextRun.agents.map((agent) => ({ ...agent, status: 'idle' })),
      events: nextRun.events.map((event) => ({ ...event, persisted: false })),
    }
    const displayedEvents = stagedRun.events.map((event) => ({ ...event }))
    let databaseHealthy = insforgeConfigured

    setRun(stagedRun)

    if (insforgeConfigured) {
      try {
        await beginEvidenceRun(stagedRun)
      } catch {
        databaseHealthy = false
        setPersistence('error')
      }
    }

    for (let index = 0; index < nextRun.events.length; index += 1) {
      await delay(useDemo ? 420 : 300)
      const event = nextRun.events[index]
      let persisted = false

      if (databaseHealthy) {
        try {
          const result = await appendAgentEvent(nextRun.id, event)
          persisted = result.persisted
        } catch {
          databaseHealthy = false
          setPersistence('error')
        }
      }

      displayedEvents[index] = { ...event, persisted }
      setActiveEvents(index + 1)
      setRun((current) => {
        if (!current) return current
        const agents = current.agents.map((agent) => {
          if (agent.id === event.sender) return { ...agent, status: 'complete' as const }
          if (agent.id === event.recipient) return { ...agent, status: 'working' as const }
          return agent
        })
        return { ...current, agents, events: displayedEvents.map((item) => ({ ...item })) }
      })
    }

    const completedRun: EvidenceRun = {
      ...nextRun,
      events: displayedEvents,
    }

    if (databaseHealthy) {
      try {
        await finalizeEvidenceRun(completedRun)
        setPersistence('saved')
      } catch {
        setPersistence('error')
      }
    } else if (!insforgeConfigured) {
      setPersistence('local')
    }

    setRun(completedRun)
  }

  const fetchProcessedRun = async () => {
    const response = await fetch('/api/process-evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pmid: pmid.replace(/\D/g, '') }),
    })
    const payload: unknown = await response.json()
    if (!response.ok || !isEvidenceRun(payload)) {
      const message = typeof payload === 'object' && payload && 'error' in payload
        ? String(payload.error)
        : 'Evidence processing failed'
      throw new Error(message)
    }
    return payload
  }

  const executeRun = async (useDemo = false) => {
    setRunning(true)
    setRun(null)
    setActiveEvents(0)
    setPersistence('idle')
    setApprovalState('idle')
    setError(null)
    setToast(null)
    setSelectedEvidence(0)

    try {
      if (useDemo) {
        await animateAndPersist(normalizeRun(demoRun, 'stage-demo'), true)
      } else {
        const processed = await fetchProcessedRun()
        await animateAndPersist(
          normalizeRun(processed, insforgeConfigured ? 'insforge-live' : 'vercel-direct'),
          false,
        )
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unable to process evidence')
    } finally {
      setRunning(false)
    }
  }

  const approve = async () => {
    if (!run || run.status !== 'awaiting_physician') return

    const approvalEvent: CoordinationEvent = {
      sequence: run.events.length + 1,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      sender: 'physician',
      recipient: 'publisher',
      kind: 'approval',
      message: 'Patrick Tran, MD approved the evidence card for a versioned publishing PR.',
      sourceVerified: true,
      persisted: false,
      phase: 'Human approval',
    }

    const approved: EvidenceRun = {
      ...run,
      status: 'approved',
      publishPrUrl: 'https://github.com/patricktran1/agihackathon26dermbrief/pulls',
      agents: run.agents.map((agent) => agent.id === 'publisher' ? { ...agent, status: 'complete' } : agent),
      events: [...run.events, approvalEvent],
    }

    setApprovalState(insforgeConfigured ? 'saving' : 'local')
    setRun(approved)
    setActiveEvents(approved.events.length)
    showToast('Evidence card approved. Publisher unlocked.')

    window.setTimeout(() => {
      document.getElementById('publisher-stage')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 180)

    if (!insforgeConfigured) return

    try {
      await appendAgentEvent(approved.id, approvalEvent)
      const persistedApproval = { ...approvalEvent, persisted: true }
      const persistedRun = { ...approved, events: [...run.events, persistedApproval] }
      await persistEvidenceRun(persistedRun)
      setRun(persistedRun)
      setPersistence('saved')
      setApprovalState('saved')
    } catch {
      setPersistence('error')
      setApprovalState('error')
      showToast('Approval completed, but InsForge did not confirm the write.')
    }
  }

  const reset = () => {
    setRun(null)
    setActiveEvents(0)
    setError(null)
    setPersistence('idle')
    setApprovalState('idle')
    setSelectedEvidence(0)
  }

  const reviewAnother = () => {
    reset()
    setPmid('')
    setToast(null)
    window.setTimeout(() => {
      document.getElementById('top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      pmidInputRef.current?.focus()
    }, 50)
  }

  const viewAuditTrail = () => {
    document.getElementById('audit-trail')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const executionLabel = run?.executionSource === 'insforge-live'
    ? 'InsForge live'
    : run?.executionSource === 'vercel-direct'
      ? 'Local fallback'
      : run?.executionSource === 'stage-demo'
        ? 'Stage demo'
        : 'Ready'

  const approvalCopy = approvalState === 'saving'
    ? 'Publisher is unlocked. Saving the physician approval to InsForge…'
    : approvalState === 'saved'
      ? 'Publisher is unlocked. Approval is recorded in the InsForge audit trail.'
      : approvalState === 'error'
        ? 'Publisher is unlocked. Approval completed, but InsForge did not confirm the write.'
        : 'Publisher is unlocked. Approval is recorded for this session.'

  return (
    <div className="app-shell">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 88,
            right: 24,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            maxWidth: 390,
            padding: '13px 15px',
            border: '1px solid rgba(122,240,176,.34)',
            borderRadius: 12,
            color: '#dff9e9',
            background: 'rgba(12,31,21,.96)',
            boxShadow: '0 20px 60px rgba(0,0,0,.35)',
          }}
        >
          <BadgeCheck size={18} color="#7af0b0" />
          <strong style={{ flex: 1, fontSize: 13 }}>{toast}</strong>
          <button
            aria-label="Dismiss confirmation"
            onClick={() => setToast(null)}
            style={{ display: 'grid', placeItems: 'center', padding: 2, border: 0, color: '#94a69c', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <header className="topbar">
        <a className="brand" href="#top" aria-label="DermBrief EvidenceOps home">
          <span className="brand-mark"><HeartPulse size={22} /></span>
          <span><strong>DERMBRIEF</strong><small>EvidenceOps</small></span>
        </a>
        <div className="topbar-badges">
          <span className={insforgeConfigured ? 'connected' : ''}><Database size={14} /> InsForge {insforgeConfigured ? 'connected' : 'ready'}</span>
          <span><LockKeyhole size={14} /> Human approval</span>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles size={15} /> AGI Summit 2026 Hackathon build</p>
            <h1>From new research to an<br /><em>auditable clinical decision.</em></h1>
            <p className="hero-description">
              Five accountable stages discover, appraise, ground, and safety-check dermatology evidence.
              InsForge records every checkpoint, while the final release key stays with the physician.
            </p>
            <div className="run-control">
              <label>
                <span>PubMed ID</span>
                <div><Fingerprint size={18} /><input ref={pmidInputRef} value={pmid} onChange={(event) => setPmid(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !running && pmid.trim()) void executeRun(false) }} inputMode="numeric" /></div>
              </label>
              <button className="run-button" onClick={() => void executeRun(false)} disabled={running || !pmid.trim()}>
                {running ? <LoaderCircle className="spin" size={19} /> : <Play size={18} fill="currentColor" />}
                {running ? (insforgeConfigured ? 'Recording workflow' : 'Processing evidence') : 'Run EvidenceOps'}
              </button>
              <button className="demo-button" onClick={() => void executeRun(true)} disabled={running}>Use stage demo</button>
            </div>
            {error && <div className="error-banner"><X size={17} /> {error}<button onClick={() => setError(null)}>Dismiss</button></div>}
          </div>

          <div className="hero-system-card">
            <div className="system-card-heading">
              <span><Activity size={17} /> LIVE SYSTEM</span>
              <strong>{run ? (running ? 'PROCESSING' : run.status.replaceAll('_', ' ').toUpperCase()) : 'READY'}</strong>
            </div>
            <div className="system-rings">
              <div className={running ? 'pulse-ring active' : 'pulse-ring'}>
                <div><Stethoscope size={34} /><strong>{run?.score ?? '--'}</strong><span>Evidence score</span></div>
              </div>
            </div>
            <dl>
              <div><dt>Completed stages</dt><dd>{completeAgents}/5</dd></div>
              <div><dt>Execution</dt><dd>{executionLabel}</dd></div>
              <div><dt>Autonomous releases</dt><dd>0</dd></div>
            </dl>
          </div>
        </section>

        <section className="agent-section">
          <div className="section-heading">
            <div><p className="eyebrow">InsForge workflow ledger</p><h2>One durable record. Five accountable stages.</h2></div>
            <span className="protocol-chip"><Workflow size={15} /> database · checkpoints · approval</span>
          </div>
          <div className="agent-grid">
            {(run?.agents ?? demoRun.agents.map((agent) => ({ ...agent, status: 'idle' as const }))).map((agent, index) => {
              const Icon = agentIcons[agent.id]
              return (
                <article id={agent.id === 'publisher' ? 'publisher-stage' : undefined} className={`agent-card status-${agent.status}`} key={agent.id}>
                  <div className="agent-index">0{index + 1}</div>
                  <div className="agent-icon"><Icon size={21} /></div>
                  <div className="agent-copy"><h3>{agent.name}</h3><strong>{agent.role}</strong><p>{agent.description}</p></div>
                  <span className="agent-status">{agent.status === 'working' && <LoaderCircle className="spin" size={13} />}{agent.status === 'complete' && <Check size={13} />}{statusLabels[agent.status]}</span>
                  {index < 4 && <ChevronRight className="agent-arrow" size={18} />}
                </article>
              )
            })}
          </div>
        </section>

        <section className="workspace-grid">
          <article id="audit-trail" className="panel event-panel">
            <header><div><p className="eyebrow">InsForge audit trail</p><h2>Who did what, and why</h2></div><span><BadgeCheck size={15} /> Durable checkpoints</span></header>
            <div className="event-log">
              {(run?.events.slice(0, activeEvents) ?? []).map((event) => (
                <div className="event-row" key={event.sequence}>
                  <span className="event-seq">{String(event.sequence).padStart(3, '0')}</span>
                  <span className="event-time">{event.timestamp}</span>
                  <div className="event-message"><strong>{event.sender} → {event.recipient}</strong><p>{event.message}</p><small>{event.kind} · {event.phase}</small></div>
                  <span className="signature">
                    {event.persisted ? <Database size={14} /> : <CircleStop size={14} />}
                    {event.persisted ? 'persisted' : 'local'}
                  </span>
                </div>
              ))}
              {!run && <div className="empty-log"><Database size={35} /><strong>The audit trail is empty</strong><p>Run a PMID to record each workflow checkpoint in InsForge.</p></div>}
            </div>
          </article>

          <article className="panel safety-panel">
            <header><div><p className="eyebrow">Safety gate</p><h2>Autonomy stops here</h2></div><LockKeyhole size={23} /></header>
            <div className="safety-list">
              {(run?.safetyChecks ?? demoRun.safetyChecks).map((check) => (
                <div key={check.label}><span className={run ? (check.passed ? 'pass' : 'fail') : 'pending'}>{run ? (check.passed ? <Check size={14} /> : <X size={14} />) : <CircleStop size={14} />}</span><div><strong>{check.label}</strong><p>{check.detail}</p></div></div>
              ))}
            </div>

            {run?.status === 'approved' ? (
              <div
                role="status"
                aria-live="polite"
                style={{ marginTop: 20, padding: 18, border: '1px solid rgba(122,240,176,.3)', borderRadius: 14, background: 'rgba(122,240,176,.055)' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr', alignItems: 'start', gap: 12 }}>
                  <span style={{ display: 'grid', width: 42, height: 42, placeItems: 'center', borderRadius: 12, color: '#08140d', background: '#7af0b0' }}><BadgeCheck size={23} /></span>
                  <div>
                    <p className="eyebrow" style={{ marginBottom: 7 }}>Evidence card approved</p>
                    <h3 style={{ margin: 0, font: '700 20px/1.25 Manrope, sans-serif' }}>Publisher is unlocked.</h3>
                    <p style={{ margin: '7px 0 0', color: '#8fa398', fontSize: 11, lineHeight: 1.55 }}>{approvalCopy}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
                  <button className="approve-button" style={{ marginTop: 0 }} onClick={reviewAnother}><Search size={18} /> Review another PMID</button>
                  <button className="demo-button" style={{ width: '100%' }} onClick={viewAuditTrail}><Database size={17} /> View completed audit trail</button>
                </div>
              </div>
            ) : (
              <>
                <button className="approve-button" onClick={() => void approve()} disabled={!run || running || run.status !== 'awaiting_physician'}>
                  <FileCheck2 size={18} />
                  Approve as Patrick Tran, MD
                </button>
                <small className="approval-note">Approval is a separate human action and is written to the same InsForge audit trail.</small>
              </>
            )}
          </article>
        </section>

        {run && (
          <section className="result-grid">
            <article className="panel article-panel">
              <header><div><p className="eyebrow">Verified source</p><h2>{run.article.journal}</h2></div><a href={run.article.url} target="_blank" rel="noreferrer">PubMed <ExternalLink size={14} /></a></header>
              <h3>{run.article.title}</h3>
              <p className="article-meta">PMID {run.article.pmid} · {run.article.publicationDate} · {run.article.authors.slice(0, 4).join(', ')}</p>
              <p className="abstract">{run.article.abstract}</p>
              <div className="score-reasons">{run.scoreReasons.map((reason) => <span key={reason}><Check size={12} /> {reason}</span>)}</div>
            </article>

            <article className="panel card-panel">
              <header><div><p className="eyebrow">Grounded learning card</p><h2>{run.card.title}</h2></div><span className="quality-score">{run.score}</span></header>
              <h3>{run.card.prompt}</h3>
              <div className="answer-list">
                {run.card.options.map((option, index) => <div className={index === run.card.correctOptionIndex ? 'correct-answer' : ''} key={option}><span>{String.fromCharCode(65 + index)}</span><p>{option}</p>{index === run.card.correctOptionIndex && <Check size={17} />}</div>)}
              </div>
              <div className="card-copy"><strong>Why it matters</strong><p>{run.card.whyItMatters}</p><strong>Monday Move</strong><p>{run.card.mondayMove}</p></div>
            </article>
          </section>
        )}

        {run && (
          <section className="evidence-map panel">
            <header><div><p className="eyebrow">Claim-level grounding</p><h2>Every claim has a receipt</h2></div><span>{run.card.evidenceMap.length} mappings</span></header>
            <div className="evidence-tabs">{run.card.evidenceMap.map((entry, index) => <button className={selectedEvidence === index ? 'active' : ''} onClick={() => setSelectedEvidence(index)} key={`${entry.claim}-${index}`}>Claim {index + 1}</button>)}</div>
            <div className="evidence-comparison">
              <div><span>LEARNER-FACING CLAIM</span><p>{run.card.evidenceMap[selectedEvidence]?.claim}</p></div>
              <ChevronRight size={24} />
              <div><span>VERBATIM SOURCE · {run.card.evidenceMap[selectedEvidence]?.sourceSection}</span><blockquote>“{run.card.evidenceMap[selectedEvidence]?.sourceQuote}”</blockquote><small>{run.card.evidenceMap[selectedEvidence]?.supportType.replace('_', ' ')}</small></div>
            </div>
          </section>
        )}

        <section className="integration-strip">
          <div><Database size={22} /><span><strong>InsForge</strong><small>{persistence === 'saved' ? 'Run and audit trail persisted' : persistence === 'error' ? 'Persistence error' : insforgeConfigured ? 'Connected workflow database' : 'Add credentials for durable history'}</small></span></div>
          <div><Cloud size={22} /><span><strong>Vercel</strong><small>PubMed processing and public cockpit</small></span></div>
          <div><GitPullRequest size={22} /><span><strong>GitHub</strong><small>{run?.status === 'approved' ? 'Ready for publishing PR' : 'Versioned physician release boundary'}</small></span></div>
          {run?.publishPrUrl && <a href={run.publishPrUrl} target="_blank" rel="noreferrer">Open publishing queue <ExternalLink size={14} /></a>}
          {run && <button onClick={reviewAnother}><RotateCcw size={14} /> Review another</button>}
        </section>
      </main>

      <footer><span>DermBrief EvidenceOps</span><p>Clinical AI that knows where autonomy should end.</p><span>AGI Summit 2026</span></footer>
    </div>
  )
}
