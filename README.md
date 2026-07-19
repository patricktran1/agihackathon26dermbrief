# DermBrief EvidenceOps

**Clinical AI that knows where autonomy should end.**

DermBrief EvidenceOps is a physician-gated clinical evidence workflow for dermatology. Today’s DermBrief scans six curated journals for recent PubMed papers with abstracts, prioritizes them using transparent deterministic triage signals, and launches a physician-selected PMID into five accountable stages: Scout, Appraiser, Grounder, Safety Auditor, and Publisher.

Every substantive learning-card claim maps to an exact source excerpt. Publisher remains blocked until explicit physician approval.

**Autonomous releases: 0**

Built for the AGI Summit 2026 Hackathon in San Francisco.

## Live product

- Production: https://agihackathon26dermbrief.vercel.app
- Submission package: [`SUBMISSION.md`](./SUBMISSION.md)

## Product flow

### 1. Today’s DermBrief

One action scans the six primary journals:

- Journal of the American Academy of Dermatology
- American Journal of Clinical Dermatology
- JAMA Dermatology
- British Journal of Dermatology
- Journal of the European Academy of Dermatology and Venereology
- Journal of Investigative Dermatology

The inbox:

- requires a PubMed abstract
- accepts an optional topic filter
- deduplicates by PMID
- displays journal, PMID, date, study type, and ranking rationale
- decomposes the deterministic triage score into visible signals
- launches any candidate directly into EvidenceOps

The triage score is not the later evidence-quality score and is not presented as a clinical recommendation.

### 2. Five accountable stages

1. **Scout** retrieves and verifies the PubMed record and curated journal identity.
2. **Appraiser** applies a separate deterministic evidence-quality score.
3. **Grounder** creates one bounded learning card and maps every substantive claim to a source excerpt.
4. **Safety Auditor** checks source grounding, evidence thresholds, journal scope, and unsupported language.
5. **Publisher** remains locked until a physician explicitly approves the card.

### 3. Durable evidence history

When InsForge is configured, the evidence run, ordered checkpoints, and physician approval are written to the same durable audit trail. The public physician experience does not expose infrastructure setup.

## Architecture

```text
Browser
  |-- Today’s DermBrief
  |     `-- /api/daily-brief -> PubMed search, metadata, abstracts, deterministic ranking
  |
  |-- EvidenceOps
  |     `-- /api/process-evidence -> Scout -> Appraiser -> Grounder -> Safety Auditor -> Publisher
  |
  |-- InsForge
  |     `-- evidence runs + ordered audit events + physician approval
  |
  `-- GitHub
        `-- versioned release boundary
```

There is no worker, local daemon, NATS server, Cotal dependency, or second coordination platform.

## Safety design

- Six primary dermatology journals are explicitly allowlisted.
- JAAD International remains accepted as a secondary backward-compatible source.
- Full PubMed journal names and common NLM abbreviations are normalized.
- Unrelated journals remain blocked.
- Daily ranking requires a PubMed abstract.
- Ranking is deterministic, visible, and labeled as triage.
- Evidence-quality appraisal is a separate later score.
- Source excerpts must exist in the available PubMed abstract.
- No patient data is required.
- Workflow completion never equals physician approval.
- Publication remains human-authorized.

## Demo

1. Open **Today’s DermBrief**.
2. Show recent papers across multiple journals.
3. Explain why the top paper was prioritized.
4. Click **Run EvidenceOps**.
5. Watch the five accountable stages.
6. Inspect the evidence-quality score and claim-level source mappings.
7. Show that Publisher is blocked.
8. Point to **Autonomous releases: 0**.
9. Approve as Patrick Tran, MD.
10. Show Publisher complete and review another PMID.

Use **Stage Demo** as the venue-network fallback. It follows the same physician approval boundary and is persisted when InsForge is connected.

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run test:journals
npm run test:inbox
npm run check
npm run build
```

## Backend configuration

Apply:

```text
insforge/migrations/001_evidenceops.sql
```

For a project that previously used the bridge schema, also apply:

```text
insforge/migrations/002_insforge_only_cleanup.sql
```

Set these variables in Vercel Preview and Production:

```text
VITE_INSFORGE_BASE_URL
VITE_INSFORGE_ANON_KEY
```

`NCBI_API_KEY` is optional.

The included row-level security policies are permissive for the hackathon and should be tightened before production use.

## Repository map

```text
api/daily-brief.js             cross-journal PubMed triage
api/process-evidence.js        five-stage evidence processing
src/TodaysDermBrief.tsx        daily inbox experience
src/App.tsx                    EvidenceOps cockpit
src/lib/insforge.ts            durable run and event persistence
scripts/test-daily-brief.mjs   ranking regressions
scripts/test-journals.mjs      journal alias regressions
SUBMISSION.md                  pitch, demo, rubric, and checklist
```
