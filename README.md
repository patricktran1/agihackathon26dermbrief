# DermBrief EvidenceOps

**A live, auditable multi-agent workflow that converts dermatology research into physician-reviewed clinical learning.**

Built for the **AGI Summit 2026 Hackathon** in San Francisco.

## What changed in the live engine

The sponsor integrations now form one execution path instead of two adjacent demos:

```text
Vercel browser
  → creates an InsForge run request
  → local bridge worker claims the request
  → five real Cotal endpoints emit the handoffs
  → every Cotal envelope is written to InsForge
  → browser follows the persisted run and event trail
  → physician approval updates the same durable record
```

The direct Vercel path and deterministic stage demo remain available as fallbacks.

## Five accountable agents

1. **Scout** retrieves a PubMed record and verifies the journal.
2. **Appraiser** scores study design, bias signals, and clinical relevance.
3. **Grounder** builds a learning card with claim-level source excerpts.
4. **Safety Auditor** blocks unsupported wording and ambiguous answers.
5. **Publisher** remains unavailable until a physician approves.

The most important metric on the screen is **Autonomous releases: 0**.

## Live Cotal + InsForge setup

### 1. Create the InsForge backend

Apply:

```text
insforge/migrations/001_evidenceops.sql
```

For a project that already used the earlier schema, apply:

```text
insforge/migrations/002_live_cotal_engine.sql
```

The backend contains:

- `run_requests`: durable queue between the Vercel UI and bridge worker
- `evidence_runs`: full evidence payload and workflow state
- `agent_events`: append-only Cotal handoff receipts

The included row-level security policies are intentionally permissive for the hackathon. Tighten them before production.

### 2. Configure Vercel

Add these browser-safe values and redeploy:

```text
VITE_INSFORGE_BASE_URL=https://your-project.insforge.app
VITE_INSFORGE_ANON_KEY=your-anon-key
```

With those values present, **Run EvidenceOps** creates an InsForge queue item and waits for the live bridge. Without them, the app uses the direct Vercel fallback.

### 3. Start Cotal on the demo laptop

Follow the official Cotal setup at `docs.cotal.ai`:

```bash
npx cotal-ai setup
cotal up --open
```

Keep either observer open:

```bash
cotal web
# or
cotal console
```

The open mesh is loopback-only and frictionless for a stage demo. For authenticated identities, configure a Cotal token or user/password pair through the worker environment.

### 4. Start the bridge worker

Create `.env.local` from `.env.example`, then provide:

```text
INSFORGE_BASE_URL
INSFORGE_ANON_KEY
DERMBRIEF_API_URL
COTAL_SERVER
COTAL_SPACE
```

Run:

```bash
npm install
npm run worker
```

The worker:

- claims the oldest queued PMID
- calls the deployed PubMed evidence endpoint
- emits multicast, unicast, and anycast messages through real `CotalEndpoint` instances
- stores each Cotal message ID in InsForge
- updates the run after every handoff
- stops at the physician release boundary

Use `npm run worker:once` to process one queued request and exit.

## Demo sequence

1. Open the deployed Vercel site.
2. Keep `cotal web` visible beside it.
3. Enter PMID `35820547` and click **Run EvidenceOps**.
4. Watch the request move through InsForge while Cotal messages appear in the mesh.
5. Inspect the Cotal message receipts and claim-to-source mappings.
6. Approve as Patrick Tran, MD.
7. Show that the Publisher only unlocks after the human action.

Use **Use stage demo** as the venue-Wi-Fi fallback.

## Safety architecture

- Only six curated high-impact dermatology journals are accepted.
- The score is deterministic and visible.
- Every generated source quote must be found verbatim in the abstract.
- The system never claims CME accreditation.
- No patient data is accepted or required.
- Agent completion never equals physician approval.
- Publication remains a separate human-authorized capability.

## Repository map

```text
api/process-evidence.js                       PubMed ingestion and deterministic appraisal
src/App.tsx                                   Live queue UI and physician approval gate
src/lib/insforge.ts                           Queue, polling, persistence, and approval updates
scripts/cotal-insforge-worker.mjs             Real Cotal-to-InsForge bridge
scripts/cotal-demo.mjs                        Standalone Cotal protocol demonstration
insforge/migrations/001_evidenceops.sql       Fresh backend schema
insforge/migrations/002_live_cotal_engine.sql Existing-project upgrade
```

## Pitch

> Clinical AI should not autonomously publish medical education. Cotal coordinates accountable agents, InsForge preserves their audit trail, and DermBrief keeps the final release capability with a physician.
