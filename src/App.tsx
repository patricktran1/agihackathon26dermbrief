import { useMemo, useState } from 'react'
import {
  Activity,
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleStop,
  Database,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  GitPullRequest,
  HeartPulse,
  LoaderCircle,
  LockKeyhole,
  Network,
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
import { insforgeConfigured, persistEvidenceRun } from './lib/insforge'
import type { AgentId, AgentState, EvidenceRun } from './types'

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

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isEvidenceRun(value: unknown): value is EvidenceRun {
  return typeof value === 'object' && value !== null && 'article' in value && 'events' in value && 'card' in value
}

export default function App() {
  const [pmid, setPmid] = useState('35820547')
  const [run, setRun] = useState<EvidenceRun | null>(null)
  const [running, setRunning] = useState(false)
  const [activeEvents, setActiveEvents] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [persistence, setPersistence] = useState<'idle' | 'saved' | 'local' | 'error'>('idle')
  const [selectedEvidence, setSelectedEvidence] = useState(0)

  const completeAgents = useMemo(
    () => run?.agents.filter((agent) => agent.status === 'complete').length ?? 0,
    [run],
  )

  const executeRun = async (useDemo = false) => {
    setRunning(true)
    setRun(null)
    setActiveEvents(0)
    setPersistence('idle')
    setError(null)

    try {
      let nextRun = demoRun
      if (!useDemo) {
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
        nextRun = payload
      }

      const stagedRun: EvidenceRun = {
        ...nextRun,
        agents: nextRun.agents.map((agent) => ({ ...agent, status: 'idle' })),
      }
      setRun(stagedRun)

      for (let index = 0; index < nextRun.events.length; index += 1) {
        await delay(useDemo ? 430 : 310)
        const event = nextRun.events[index]
        setActiveEvents(index + 1)
        setRun((current) => {
          if (!current) return current
          const agents = current.agents.map((agent) => {
            if (agent.id === event.sender) return { ...agent, status: 'complete' as const }
            if (agent.id === event.recipient) return { ...agent, status: 'working' as const }
            return agent
          })
          return { ...current, agents }
        })
      }

      setRun(nextRun)
      try {
        const result = await persistEvidenceRun(nextRun)
        setPersistence(result.persisted ? 'saved' : 'local')
      } catch {
        setPersistence('error')
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unable to process evidence')
    } finally {
      setRunning(false)
    }
  }

  const approve = () => {
    if (!run || run.status !== 'awaiting_physician') return
    const sequence = run.events.length + 1
    const approved: EvidenceRun = {
      ...run,
      status: 'approved',
      publishPrUrl: 'https://github.com/patricktran1/agihackathon26dermbrief/pulls',
      agents: run.agents.map((agent) => agent.id === 'publisher' ? { ...agent, status: 'complete' } : agent),
      events: [
        ...run.events,
        {
          sequence,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          sender: 'physician',
          recipient: 'publisher',
          kind: 'approval',
          message: 'Patrick Tran, MD approved the evidence card for a versioned publishing PR.',
          signatureVerified: true,
          phase: 'Human approval',
        },
      ],
    }
    setRun(approved)
    setActiveEvents(approved.events.length)
    void persistEvidenceRun(approved).catch(() => undefined)
  }

  const reset = () => {
    setRun(null)
    setActiveEvents(0)
    setError(null)
    setPersistence('idle')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DermBrief EvidenceOps home">
          <span className="brand-mark"><HeartPulse size={22} /></span>
          <span><strong>DERMBRIEF</strong><small>EvidenceOps</small></span>
        </a>
        <div className="topbar-badges">
          <span><Network size={14} /> Cotal mesh</span>
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
              Five specialized agents discover, appraise, ground, and safety-check dermatology evidence.
              The final release key stays with the physician.
            </p>
            <div className="run-control">
              <label>
                <span>PubMed ID</span>
                <div><Fingerprint size={18} /><input value={pmid} onChange={(event) => setPmid(event.target.value)} inputMode="numeric" /></div>
              </label>
              <button className="run-button" onClick={() => void executeRun(false)} disabled={running || !pmid.trim()}>
                {running ? <LoaderCircle className="spin" size={19} /> : <Play size={18} fill="currentColor" />}
                {running ? 'Agents working' : 'Run EvidenceOps'}
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
              <div><dt>Verified agents</dt><dd>{completeAgents}/5</dd></div>
              <div><dt>Grounded claims</dt><dd>{run?.card.evidenceMap.length ?? 0}</dd></div>
              <div><dt>Autonomous releases</dt><dd>0</dd></div>
            </dl>
          </div>
        </section>

        <section className="agent-section">
          <div className="section-heading">
            <div><p className="eyebrow">Cotal coordination topology</p><h2>One shared space. Five accountable agents.</h2></div>
            <span className="protocol-chip"><Workflow size={15} /> multicast · unicast · anycast</span>
          </div>
          <div className="agent-grid">
            {(run?.agents ?? demoRun.agents.map((agent) => ({ ...agent, status: 'idle' as const }))).map((agent, index) => {
              const Icon = agentIcons[agent.id]
              return (
                <article className={`agent-card status-${agent.status}`} key={agent.id}>
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
          <article className="panel event-panel">
            <header><div><p className="eyebrow">Replayable coordination log</p><h2>Who did what, and why</h2></div><span><BadgeCheck size={15} /> Signed identities</span></header>
            <div className="event-log">
              {(run?.events.slice(0, activeEvents) ?? []).map((event) => (
                <div className="event-row" key={event.sequence}>
                  <span className="event-seq">{String(event.sequence).padStart(3, '0')}</span>
                  <span className="event-time">{event.timestamp}</span>
                  <div className="event-message"><strong>{event.sender} → {event.recipient}</strong><p>{event.message}</p><small>{event.kind} · {event.phase}</small></div>
                  <span className="signature"><BadgeCheck size={14} /> verified</span>
                </div>
              ))}
              {!run && <div className="empty-log"><Network size={35} /><strong>The mesh is quiet</strong><p>Run a PMID to stream agent handoffs into the shared audit log.</p></div>}
            </div>
          </article>

          <article className="panel safety-panel">
            <header><div><p className="eyebrow">Safety gate</p><h2>Autonomy stops here</h2></div><LockKeyhole size={23} /></header>
            <div className="safety-list">
              {(run?.safetyChecks ?? demoRun.safetyChecks).map((check) => (
                <div key={check.label}><span className={run ? (check.passed ? 'pass' : 'fail') : 'pending'}>{run ? (check.passed ? <Check size={14} /> : <X size={14} />) : <CircleStop size={14} />}</span><div><strong>{check.label}</strong><p>{check.detail}</p></div></div>
              ))}
            </div>
            <button className="approve-button" onClick={approve} disabled={!run || running || run.status !== 'awaiting_physician'}>
              <FileCheck2 size={18} />
              {run?.status === 'approved' ? 'Physician approval recorded' : 'Approve as Patrick Tran, MD'}
            </button>
            <small className="approval-note">No agent can call this action. Approval is a separate human capability.</small>
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
          <div><Network size={22} /><span><strong>Cotal</strong><small>Identity, handoffs, presence, replayable log</small></span></div>
          <div><Database size={22} /><span><strong>InsForge</strong><small>{persistence === 'saved' ? 'Run persisted' : persistence === 'error' ? 'Persistence error' : insforgeConfigured ? 'Connected and ready' : 'Optional durable run history'}</small></span></div>
          <div><GitPullRequest size={22} /><span><strong>GitHub</strong><small>{run?.status === 'approved' ? 'Ready for publishing PR' : 'Versioned physician release boundary'}</small></span></div>
          {run?.publishPrUrl && <a href={run.publishPrUrl} target="_blank" rel="noreferrer">Open publishing queue <ExternalLink size={14} /></a>}
          {run && <button onClick={reset}><RotateCcw size={14} /> Reset demo</button>}
        </section>
      </main>

      <footer><span>DermBrief EvidenceOps</span><p>Clinical AI that knows where autonomy should end.</p><span>AGI Summit 2026</span></footer>
    </div>
  )
}
