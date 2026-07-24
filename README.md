# DermBrief EvidenceOps

[![CI](https://github.com/patricktran1/agihackathon26dermbrief/actions/workflows/ci.yml/badge.svg)](https://github.com/patricktran1/agihackathon26dermbrief/actions/workflows/ci.yml)
[![CodeQL](https://github.com/patricktran1/agihackathon26dermbrief/actions/workflows/codeql.yml/badge.svg)](https://github.com/patricktran1/agihackathon26dermbrief/actions/workflows/codeql.yml)
[![Dependency Review](https://github.com/patricktran1/agihackathon26dermbrief/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/patricktran1/agihackathon26dermbrief/actions/workflows/dependency-review.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/patricktran1/agihackathon26dermbrief/badge)](https://scorecard.dev/viewer/?uri=github.com/patricktran1/agihackathon26dermbrief)

**Clinical AI that knows where autonomy should end.**

DermBrief EvidenceOps is a physician-gated clinical evidence workflow for dermatology. Today’s DermBrief scans six curated journals for recent PubMed papers with abstracts, prioritizes them using transparent deterministic triage signals, and launches a physician-selected PMID into five accountable stages: Scout, Appraiser, Grounder, Safety Auditor, and Publisher.

The Grounder now uses a schema-bound LLM to propose one learning card, while a separate AI Auditor reviews every mapped claim. Deterministic code still controls journal eligibility, evidence scoring, exact-quote verification, unsupported-certainty vetoes, and the final physician release boundary.

Every substantive learning-card claim maps to an exact source excerpt. Publisher remains blocked until explicit physician approval.

**Autonomous releases: 0**

Built for the AGI Summit 2026 Hackathon in San Francisco.

## Live product

- Production: https://agihackathon26dermbrief.vercel.app
- Submission package: [`SUBMISSION.md`](./SUBMISSION.md)
- Governed AI design: [`AI_ARCHITECTURE.md`](./AI_ARCHITECTURE.md)

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

1. **Scout** deterministically retrieves and verifies the PubMed record and curated journal identity.
2. **Appraiser** applies a separate deterministic evidence-quality score.
3. **Grounder** uses schema-bound LLM generation to propose one bounded learning card with claim-level source links.
4. **Safety Auditor** runs a separate LLM review, followed by deterministic quote, mapping, language, and source-scope vetoes.
5. **Publisher** remains locked until a physician explicitly approves the card.

If either model call fails or any governance check rejects the draft, DermBrief automatically retains the tested deterministic learning card. The workflow therefore remains usable without model availability and never lowers its safety threshold to preserve a demo.

### 3. Durable evidence history

When InsForge is configured, the evidence run, ordered checkpoints, AI mode, audit verdict, fallback reasons, and physician approval are written to the same durable audit trail. The public physician experience does not expose infrastructure setup.

## Architecture

```text
Browser
  |-- Today’s DermBrief
  |     `-- /api/daily-brief -> PubMed search, metadata, abstracts, deterministic ranking
  |
  |-- EvidenceOps
  |     `-- /api/process-evidence
  |           |-- Scout: deterministic PubMed and journal verification
  |           |-- Appraiser: deterministic evidence-quality score
  |           |-- Grounder: Vercel AI SDK structured generation
  |           |-- Safety Auditor: separate structured AI audit
  |           |-- deterministic exact-quote and language vetoes
  |           `-- Publisher: physician-gated release
  |
  |-- Vercel AI Gateway
  |     `-- production OIDC authentication + configurable models
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
- Evidence-quality appraisal is a separate deterministic score.
- LLM responses must match a strict learning-card or audit schema.
- Every AI-generated source excerpt must exist exactly in the PubMed abstract.
- The correct answer must be mapped verbatim as a learner-facing claim.
- Asserted content is rejected for prohibited certainty or practice-changing language.
- Limitations must explicitly disclose that only the abstract was processed.
- A separate AI Auditor must approve all mapped claims.
- Any AI failure or rejection triggers the deterministic fallback.
- No patient data is required.
- Workflow completion never equals physician approval.
- Publication remains human-authorized.

## Demo

1. Open **Today’s DermBrief**.
2. Show recent papers across multiple journals.
3. Explain why the top paper was prioritized.
4. Click **Run EvidenceOps**.
5. Show Scout and Appraiser remain deterministic.
6. Show Grounder using schema-bound AI and Safety Auditor performing a separate review pass.
7. Inspect the evidence-quality score and claim-level source mappings.
8. Show the deterministic AI-governance safety check and blocked Publisher.
9. Point to **Autonomous releases: 0**.
10. Approve as Patrick Tran, MD and show Publisher complete.

Use **Stage Demo** as the venue-network fallback. It follows the same physician approval boundary and is persisted when InsForge is connected.

## Automated quality and supply-chain policy

The repository treats GitHub Actions as executable evidence rather than decorative badges:

- Node.js 22 and a committed npm lockfile make dependency installation reproducible through `npm ci`.
- CI enforces source-only coverage floors of **65% lines**, **70% functions**, and **75% branches** across deterministic API code.
- Grounder and Auditor execution tests prove disabled-model behavior, Grounder rejection, Auditor rejection, governed fallback, redacted infrastructure failures, and the successful two-model path.
- Deterministic process tests cover nested BioC parsing, journal-evidence scoring, conservative penalties, result selection, card construction, and workflow-event generation.
- Every pull request runs a moderate-or-higher dependency review across runtime and development dependencies.
- The local dependency policy requires npm-registry resolution, SHA-512 integrity, approved licenses, and exact version-pinned evidence for any metadata override.
- CI separately blocks high-severity npm audit findings.
- CodeQL performs extended JavaScript and TypeScript security analysis.
- OpenSSF Scorecard runs on the default branch and weekly, publishes results through OIDC, retains SARIF, and uploads findings to GitHub code scanning.
- CI retains coverage, audit, dependency-review, and production-build Playwright evidence for review.
- The Playwright flow proves Publisher remains blocked until physician approval and that autonomous releases remain zero.

These controls establish tested software and supply-chain boundaries. They do not establish clinical validity, regulatory clearance, HIPAA compliance, or autonomous publication safety.

## Local development

```bash
npm ci
npm run dev
```

Vercel production deployments can authenticate to AI Gateway through the automatically provisioned OIDC token. Local AI calls can use `AI_GATEWAY_API_KEY`. Do not commit credentials or expose them in the public UI.

Optional model controls:

```text
DERMBRIEF_AI_MODEL
DERMBRIEF_GROUNDER_MODEL
DERMBRIEF_AUDITOR_MODEL
DERMBRIEF_DISABLE_AI=1
```

The default Grounder and Auditor model is `openai/gpt-5.4-mini` through Vercel AI Gateway.

## Validation

```bash
npm run lint
npm test
npm run test:coverage
npm run test:journals
npm run test:inbox
npm run test:ai
npm run check
npm run build
npm run test:e2e
```

All regression suites run automatically before every production build. Pull requests also run dependency review, CodeQL, source-coverage enforcement, and the production-build physician-release browser flow.

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
api/daily-brief.js                    cross-journal PubMed triage
api/process-evidence.js               five-stage evidence processing and deterministic helpers
api/ai-evidence.js                    schema-bound Grounder, Auditor, and deterministic vetoes
src/TodaysDermBrief.tsx               daily inbox experience
src/App.tsx                           EvidenceOps cockpit
src/lib/insforge.ts                   durable run and event persistence
package-lock.json                     reproducible Node 22 dependency graph
scripts/test-daily-brief.mjs          ranking regressions
scripts/test-journals.mjs             journal alias regressions
scripts/test-ai-governance.mjs        AI grounding and safety-veto regressions
scripts/review-dependency-changes.mjs deterministic dependency policy and retained report
test/ai-execution.test.mjs            governed Grounder and Auditor execution states
test/process-domain.test.mjs          BioC, scoring, card, and workflow-event regressions
.github/workflows/ci.yml              build, coverage, audit, and Playwright evidence
.github/workflows/dependency-review.yml pull-request dependency review
.github/workflows/codeql.yml          extended security analysis
.github/workflows/scorecard.yml       OpenSSF publication and SARIF upload
AI_ARCHITECTURE.md                    governed LLM and agent design
SUBMISSION.md                         pitch, demo, rubric, and checklist
```
