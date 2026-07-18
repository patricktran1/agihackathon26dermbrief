export type AgentId = 'scout' | 'appraiser' | 'grounder' | 'auditor' | 'publisher'
export type AgentStatus = 'idle' | 'working' | 'complete' | 'blocked' | 'waiting'
export type RunStatus = 'queued' | 'processing' | 'awaiting_physician' | 'approved' | 'blocked'
export type ExecutionSource = 'stage-demo' | 'vercel-direct' | 'cotal-live'
export type MeshAuthMode = 'simulated' | 'open-loopback' | 'authenticated'

export type AgentState = {
  id: AgentId
  name: string
  role: string
  description: string
  status: AgentStatus
}

export type CoordinationEvent = {
  sequence: number
  timestamp: string
  sender: AgentId | 'physician'
  recipient: AgentId | 'physician' | '#evidenceops'
  kind: 'multicast' | 'unicast' | 'anycast' | 'approval'
  message: string
  signatureVerified: boolean
  deliveryVerified?: boolean
  cotalMessageId?: string
  phase: string
}

export type ArticleRecord = {
  pmid: string
  title: string
  journal: string
  publicationDate: string
  authors: string[]
  abstract: string
  url: string
  doi?: string
}

export type EvidenceMapEntry = {
  claim: string
  sourceQuote: string
  sourceSection: string
  supportType: 'direct' | 'cautious_inference'
}

export type LearningCard = {
  title: string
  prompt: string
  options: string[]
  correctOptionIndex: number
  explanation: string
  whyItMatters: string
  mondayMove: string
  limitations: string
  evidenceMap: EvidenceMapEntry[]
}

export type EvidenceRun = {
  id: string
  startedAt: string
  completedAt: string
  status: RunStatus
  executionSource?: ExecutionSource
  meshAuthMode?: MeshAuthMode
  requestId?: string
  score: number
  scoreReasons: string[]
  safetyChecks: { label: string; passed: boolean; detail: string }[]
  agents: AgentState[]
  events: CoordinationEvent[]
  article: ArticleRecord
  card: LearningCard
  publishPrUrl?: string
}

export type EvidenceRunRequest = {
  id: string
  pmid: string
  status: 'queued' | 'processing' | 'complete' | 'error'
  requested_at: string
  claimed_at?: string | null
  completed_at?: string | null
  result_run_id?: string | null
  error?: string | null
  worker_id?: string | null
}
