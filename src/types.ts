export type AgentId = 'scout' | 'appraiser' | 'grounder' | 'auditor' | 'publisher'
export type AgentStatus = 'idle' | 'working' | 'complete' | 'blocked' | 'waiting'

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
  status: 'awaiting_physician' | 'approved' | 'blocked'
  score: number
  scoreReasons: string[]
  safetyChecks: { label: string; passed: boolean; detail: string }[]
  agents: AgentState[]
  events: CoordinationEvent[]
  article: ArticleRecord
  card: LearningCard
  publishPrUrl?: string
}
