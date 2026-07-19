# DermBrief EvidenceOps — AGI Summit 2026 Submission Package

## One-sentence project description

DermBrief EvidenceOps scans high-impact dermatology journals, prioritizes new PubMed evidence with transparent deterministic triage, and converts a physician-selected abstract into a claim-mapped learning card that cannot be released until a doctor approves it.

## Core product insight

> Clinical AI that knows where autonomy should end.

The headline safety metric is **Autonomous releases: 0**.

## 90-second pitch

Dermatologists do not have a shortage of research. We have a shortage of time, trust, and accountable translation.

Every day, new papers arrive across multiple journals. Existing AI tools can summarize them, but a fluent summary is not the same as grounded evidence, and an automated output should not silently become physician education.

DermBrief EvidenceOps turns that gap into a governed workflow.

First, Today’s DermBrief scans six high-impact dermatology journals through PubMed. It requires an abstract, removes duplicates, and ranks papers using visible deterministic signals such as study design language, recency, multicenter or controlled-comparator signals, and approximate 2025 journal influence. That score is explicitly labeled **triage**, not clinical appraisal.

A physician selects one paper and launches EvidenceOps. Five accountable stages retrieve the PubMed record, apply a separate evidence-quality score, create one bounded learning card, map every substantive claim to an exact abstract excerpt, and run safety checks. The Publisher remains blocked.

Only after a physician approves the card does the final stage complete. InsForge preserves the evidence run, checkpoints, and approval trail.

The innovation is not another summarizer. It is a clinical AI system with a designed stopping point. Today it produces auditable dermatology learning cards. The same governance model can scale to guidelines, journal clubs, specialty education, and enterprise evidence operations.

## Three-minute demo script

### 0:00–0:20 — Open with the problem and product thesis

**Say:**

“Dermatologists are flooded with new evidence, but speed without traceability creates a trust problem. DermBrief converts new research into a grounded learning card, while preserving the point where AI autonomy must stop.”

Point to **Autonomous releases: 0**.

### 0:20–0:55 — Open Today’s DermBrief

Click **Today’s DermBrief**.

**Say:**

“In one action, the inbox scans six curated dermatology journals for recent PubMed records with abstracts. I can also filter by a clinical topic.”

Show:

- Multiple journals represented
- PMID and publication date
- Study-type label
- Triage score
- Visible reasons and score decomposition

**Say:**

“This is deterministic prioritization, not a hidden model judgment and not a full clinical appraisal. The interface keeps that distinction explicit.”

### 0:55–1:15 — Explain why one paper was prioritized

Select the top candidate.

**Say:**

“This paper was flagged because the abstract contains higher-signal design language, it is recent, and it comes from a curated journal. Each component is visible, so the physician can challenge the ranking.”

Click **Run EvidenceOps**.

### 1:15–1:50 — Show the five accountable stages

**Say:**

“Now the accountable workflow begins. Scout verifies the PubMed source. Appraiser applies a separate evidence-quality score. Grounder creates one bounded learning card. Safety Auditor checks grounding and unsupported language. Publisher remains blocked.”

Let the workflow animate.

### 1:50–2:20 — Show source grounding

Show the article, evidence score, learning card, and claim-level evidence map.

**Say:**

“Every substantive learning-card claim has a receipt. The physician can compare the learner-facing statement directly with the exact PubMed abstract excerpt. We do not claim full-text validation when only the abstract is available.”

### 2:20–2:40 — Show the safety boundary

Point to the blocked Publisher stage and safety checks.

**Say:**

“Workflow completion is not publication approval. The system has done everything it is allowed to do, and then it stops.”

### 2:40–2:55 — Approve as physician

Click **Approve as Patrick Tran, MD**.

**Say:**

“This is a separate physician action. The approval is added to the same durable audit trail, and only then does Publisher complete.”

### 2:55–3:00 — Close

**Say:**

“DermBrief is clinical AI that knows where autonomy should end: faster evidence operations, exact grounding, and zero autonomous releases.”

## Judging-criteria mapping

| Criterion | Weight | What judges can see | Submission language |
|---|---:|---|---|
| Technical Execution & Agentic Depth | 25% | Live PubMed retrieval, abstract parsing, journal normalization, deterministic cross-journal ranking, five accountable stages, durable checkpoints, physician gate, regression tests | “A reliable multi-stage evidence workflow with explicit tool boundaries, deterministic scoring, durable audit events, and a human authorization gate.” |
| Innovation & Originality | 20% | Two deliberately separate scores, claim-to-source receipts, Publisher blocked by design, Autonomous releases: 0 | “The innovation is not autonomous clinical publishing. It is a system that operationalizes where clinical autonomy must stop.” |
| Impact & Usefulness | 20% | One-action literature triage, topic filtering, direct launch into review, bounded learning card | “DermBrief reduces the time between publication and trustworthy physician learning without sacrificing source traceability.” |
| Product Experience / Demo | 20% | Presentation-ready dark interface, visible ranking reasons, animated workflow, approval success state, review-another flow | “A complete three-minute journey from literature discovery to physician-authorized release.” |
| Business Potential & Scalability | 15% | Specialty-specific wedge, no patient data required, reusable governance architecture, durable evidence history | “Start with dermatology education and practice groups, then expand the same evidence-governance layer across specialties and enterprise knowledge workflows.” |

## Technical architecture summary

```text
Physician browser
  |
  |-- GET /api/daily-brief
  |     |-- PubMed ESearch across six curated journals
  |     |-- PubMed ESummary metadata
  |     |-- PubMed EFetch abstracts
  |     |-- journal normalization + deduplication
  |     `-- deterministic triage ranking + visible breakdown
  |
  |-- selected PMID
  |
  |-- POST /api/process-evidence
  |     |-- Scout: source and journal verification
  |     |-- Appraiser: deterministic evidence-quality score
  |     |-- Grounder: bounded learning card + claim mappings
  |     |-- Safety Auditor: grounding and language checks
  |     `-- Publisher: blocked pending physician approval
  |
  |-- InsForge
  |     |-- evidence run state
  |     `-- ordered audit and approval events
  |
  `-- GitHub
        `-- versioned release boundary
```

### Reliability choices

- Six primary journals are explicitly allowlisted.
- Common PubMed/NLM journal abbreviations are normalized.
- Unrelated journals remain blocked.
- Daily ranking requires a PubMed abstract.
- Ranking is deterministic and decomposed into visible signals.
- Triage ranking and evidence-quality appraisal are separate concepts and separate scores.
- Claim grounding is bounded to available PubMed abstract text.
- Publisher cannot complete without a distinct physician approval event.
- The deterministic stage demo remains available as the venue-network fallback.

## Innovation statement

Most clinical AI products optimize for completing more work autonomously. DermBrief treats the autonomy boundary itself as a product primitive.

The system separates three decisions that are often collapsed:

1. **What should a physician review first?** Deterministic cross-journal triage.
2. **What does the available evidence support?** Abstract-bounded appraisal and claim mapping.
3. **What may be released?** A separate physician authorization decision.

That separation creates a more honest and auditable form of agentic clinical software.

## Real-user problem statement

Dermatologists face a continuous stream of trials, reviews, guidelines, cohort studies, and translational research across multiple journals. The practical failure modes are predictable:

- Important papers are missed because discovery is fragmented.
- Generic summaries hide why an article was selected.
- Fluent educational copy can outrun the source.
- There is no durable record of what the AI did, what it cited, or who approved release.

DermBrief was designed from a dermatologist’s workflow perspective: prioritize the literature, show the reasoning, preserve exact source receipts, and keep the final educational release under physician control.

## Business and scalability story

### Initial wedge

Dermatology practices, physician groups, residency programs, journal clubs, and specialty education teams that need a faster but auditable way to convert new research into reviewable learning assets.

### Value proposition

- Reduces manual literature surveillance and first-pass review time
- Produces reusable, source-mapped educational cards
- Creates a durable evidence and approval history
- Requires no patient data for the core workflow
- Gives clinical leaders a visible governance boundary rather than a black-box content generator

### Commercial model hypothesis

- Individual physician subscription for personal evidence inbox and review history
- Practice or residency workspace with shared review queues and approval roles
- Enterprise licensing for specialty societies, education platforms, and life-sciences medical affairs teams with stricter governance and integrations

### Scale path

1. Expand topic taxonomies and personalized journal filters within dermatology.
2. Add team review, assignment, and shared evidence libraries.
3. Integrate with CME, learning-management, and clinical knowledge platforms.
4. Reuse the same governed workflow across other medical specialties.
5. Add full-text processing only where licensing and source access permit, while retaining explicit source-scope labels.

## Submission-ready README opening

> DermBrief EvidenceOps is a physician-gated clinical evidence workflow for dermatology. Today’s DermBrief scans six curated journals for recent PubMed papers with abstracts, prioritizes them using transparent deterministic triage signals, and launches a physician-selected PMID into five accountable stages: Scout, Appraiser, Grounder, Safety Auditor, and Publisher. Every substantive learning-card claim maps to an exact source excerpt, and Publisher remains blocked until explicit physician approval. Autonomous releases: 0.

## Final pre-submission checklist

### Product

- [x] Today’s DermBrief scans all six primary journals
- [x] Optional topic filter works
- [x] Results require abstracts and deduplicate by PMID
- [x] Journal, PMID, date, study type, triage score, and reasons are visible
- [x] Triage score is clearly separate from evidence-quality score
- [x] Candidate launches directly into EvidenceOps
- [x] Five-stage workflow remains intact
- [x] Publisher remains blocked before physician approval
- [x] Approval success state and review-another flow work
- [x] Autonomous releases remains 0

### Safety and honesty

- [x] Abstract-only scope is disclosed
- [x] No full-text validation claim
- [x] No practice-changing claim
- [x] Approximate journal metrics are year-labeled
- [x] Unrelated journals are blocked
- [x] No patient data is required

### Engineering

- [x] Journal alias regression tests pass
- [x] Daily ranking regression tests pass
- [x] TypeScript validation passes in Vercel build
- [x] Production build passes
- [x] Vercel preview is green
- [x] Production deployment is green
- [ ] Manually open production on the presentation laptop
- [ ] Run one live inbox scan on venue Wi-Fi
- [ ] Confirm one candidate completes the live EvidenceOps path
- [ ] Keep Stage Demo ready as the network fallback

### Presentation

- [ ] Browser zoom set for projector readability
- [ ] Notifications and password-manager overlays disabled
- [ ] Production tab preloaded
- [ ] Backup tab opened to Stage Demo
- [ ] Demo PMID copied to clipboard
- [ ] Ninety-second pitch rehearsed under time
- [ ] Three-minute demo rehearsed twice without narration drift
- [ ] Final submission form includes production URL and GitHub repository
