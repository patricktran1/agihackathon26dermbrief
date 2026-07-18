# DermBrief EvidenceOps

**An autonomous, auditable multi-agent workflow that converts new dermatology research into physician-reviewed clinical learning.**

Built for the **AGI Summit 2026 Hackathon** in San Francisco.

## The problem

Clinical AI often collapses discovery, interpretation, writing, safety review, and publication into one opaque model call. That is the wrong autonomy boundary for medical education.

DermBrief EvidenceOps separates the work across accountable agents and preserves a hard physician release gate:

1. **Scout** retrieves a PubMed record and verifies the journal.
2. **Appraiser** scores study design, bias signals, and clinical relevance.
3. **Grounder** builds a learning card with claim-level source excerpts.
4. **Safety Auditor** blocks unsupported wording and ambiguous answers.
5. **Publisher** remains unavailable until a physician approves.

## Hackathon demo

1. Enter a PMID or click **Use stage demo**.
2. Watch five agents coordinate through a Cotal-shaped shared event stream.
3. Inspect the deterministic evidence score and safety gate.
4. Compare each learner-facing claim with its verbatim source excerpt.
5. Approve as the physician.
6. Show the Publisher unlocking for a versioned GitHub release.

The most important metric on the screen is **Autonomous releases: 0**.

## Sponsor integrations

### Cotal

The repo includes an actual Cotal mesh demo using `@cotal-ai/core`.

```bash
npx cotal-ai setup
cotal up --open --detach
npm run cotal:demo
cotal console
```

The script starts five named Cotal endpoints and demonstrates multicast, unicast, and anycast handoffs in one replayable space.

### InsForge

The web app uses the official `@insforge/sdk`. When the two browser-safe environment values are present, complete runs and agent events are persisted to InsForge Postgres.

```bash
cp .env.example .env.local
```

Apply `insforge/migrations/001_evidenceops.sql`, then set:

```text
VITE_INSFORGE_BASE_URL=https://your-project.insforge.app
VITE_INSFORGE_ANON_KEY=your-anon-key
```

The app still works without InsForge and labels persistence as local/demo mode.

## Run locally

```bash
npm install
npm run dev
```

The stage-demo path is fully deterministic. The real-PubMed path is implemented as the Vercel Function `api/process-evidence.js` and is available after deployment.

## Deploy

Import the repository into Vercel. No required secret is needed for the deterministic pipeline. `NCBI_API_KEY` is optional for higher PubMed request limits.

## Safety architecture

- Only six curated high-impact dermatology journals are accepted.
- The score is deterministic and visible.
- Every generated source quote must be found verbatim in the abstract.
- The system never claims CME accreditation.
- No patient data is accepted or required.
- Agent completion never equals physician approval.
- Publication is represented as a separate human-authorized capability.

## Repository map

```text
api/process-evidence.js                  Real PubMed ingestion and deterministic agents
src/App.tsx                              Hackathon cockpit and physician approval gate
src/lib/insforge.ts                      Optional durable InsForge persistence
scripts/cotal-demo.mjs                   Actual five-endpoint Cotal coordination demo
insforge/migrations/001_evidenceops.sql  InsForge database schema
```

## Pitch

> Clinical AI should not autonomously publish medical education. DermBrief EvidenceOps uses a coordinated team of agents to discover, appraise, ground, and audit new dermatology evidence, while preserving a hard physician approval boundary. Every claim traces to a source excerpt, every agent action is replayable, and every release remains attributable to a physician.
