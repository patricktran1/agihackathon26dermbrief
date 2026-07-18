# DermBrief EvidenceOps

An auditable dermatology evidence workflow powered by InsForge.

Built for the AGI Summit 2026 Hackathon in San Francisco.

## Architecture

```text
Browser
  -> PubMed processing function
  -> evidence run stored in InsForge
  -> ordered workflow checkpoints stored in InsForge
  -> physician approval stored in the same audit trail
```

There is no worker, local daemon, NATS server, or second coordination platform.

## Five accountable stages

1. Scout retrieves and verifies the PubMed record.
2. Appraiser scores study design and clinical signal.
3. Grounder creates a learning card with source mappings.
4. Safety Auditor blocks unsupported wording.
5. Publisher remains locked until physician approval.

Autonomous releases remain zero.

## InsForge setup

For a new project, apply:

```text
insforge/migrations/001_evidenceops.sql
```

For a project that previously used the bridge schema, also apply:

```text
insforge/migrations/002_insforge_only_cleanup.sql
```

The backend contains only two tables:

- `evidence_runs` stores the article, appraisal, learning card, workflow state, and approval state.
- `agent_events` stores the ordered checkpoint and handoff audit trail.

The included row-level security policies are permissive for the hackathon and should be tightened before production use.

## Vercel configuration

Add these variables to Production and Preview, then redeploy:

```text
VITE_INSFORGE_BASE_URL
VITE_INSFORGE_ANON_KEY
```

`NCBI_API_KEY` is optional.

When InsForge is configured, Run EvidenceOps writes the run and each visible checkpoint to the database as the workflow advances. Without it, the same interface works without durable history.

## Local development

```bash
npm install
npm run dev
```

## Demo

1. Enter PMID `35820547` and click Run EvidenceOps.
2. Watch each stage receive a persisted InsForge receipt.
3. Inspect the evidence score and source mappings.
4. Approve as Patrick Tran, MD.
5. Show the approval event in the same audit trail.
6. Show Publisher unlocking only after the human action.

Use Stage Demo as the venue-Wi-Fi fallback. It is also persisted when InsForge is connected.

## Safety

- Six curated dermatology journals are accepted.
- Scoring is deterministic and visible.
- Source excerpts must exist verbatim in the abstract.
- No patient data is required.
- Workflow completion never equals physician approval.
- Publication remains human-authorized.

## Repository map

```text
api/process-evidence.js
src/App.tsx
src/lib/insforge.ts
insforge/migrations/001_evidenceops.sql
insforge/migrations/002_insforge_only_cleanup.sql
```

## Pitch

DermBrief converts a PubMed article into a grounded clinical learning card while InsForge records every accountable step in one durable audit trail. The workflow can discover, appraise, ground, and safety-check evidence, but only a physician can authorize release.
