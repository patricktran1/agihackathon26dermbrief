# DermBrief Governed AI Architecture

DermBrief uses an LLM where language reasoning adds value and deterministic code where clinical reliability requires a hard boundary.

## What is genuinely AI-powered

### Grounder

The Grounder receives only:

- PubMed title
- journal and publication metadata
- PubMed abstract
- deterministic evidence-quality score and reasons

Using Vercel AI SDK structured output, it drafts one physician-learning card with four answer options, bounded takeaways, explicit limitations, and claim-to-source mappings.

### Safety Auditor

A separate LLM call reviews the Grounder draft against the same PubMed abstract. It must return a structured verdict, issues, and support determination for each mapped claim.

The Auditor is an independent pass, not a continuation of the same chat transcript. Grounder and Auditor models can be configured separately.

## What remains deterministic

- PMID sanitation
- PubMed retrieval
- curated journal matching and alias normalization
- evidence-quality scoring
- evidence threshold
- exact source-quote verification
- correct-answer-to-claim mapping
- prohibited certainty and practice-changing language checks
- abstract-only scope requirement
- Publisher lock
- physician approval

The LLM cannot change the deterministic evidence score or authorize release.

## Acceptance logic

```text
PubMed article
  -> deterministic Scout verification
  -> deterministic Appraiser score
  -> schema-bound LLM Grounder draft
  -> exact-quote and language veto checks
  -> independent LLM Safety Auditor
  -> deterministic veto checks confirmed
  -> physician review
  -> Publisher unlocks only after approval
```

An AI draft is accepted only when all of the following are true:

1. The response matches the learning-card schema.
2. Every quoted excerpt exists exactly in the PubMed abstract.
3. The correct answer is mapped verbatim as a learner-facing claim.
4. Asserted content avoids prohibited certainty and practice-changing language.
5. Limitations explicitly disclose that only the PubMed abstract was processed.
6. The Safety Auditor approves every mapped claim.

If any condition fails, DermBrief discards the AI draft and uses the existing tested deterministic card.

## Resilience

The app remains operational when:

- AI Gateway is unavailable
- authentication or billing is unavailable
- a model times out
- structured output is malformed
- the Grounder fabricates a quotation
- the Safety Auditor rejects a claim
- deterministic governance checks fail

The resulting evidence run records whether the accepted card was `llm-assisted` or a `deterministic-fallback`, along with model identifiers, the audit verdict, and fallback reasons.

## Runtime stack

- Vercel AI SDK 6
- Vercel AI Gateway
- production authentication through Vercel OIDC
- default model: `openai/gpt-5.4-mini`
- optional overrides:
  - `DERMBRIEF_AI_MODEL`
  - `DERMBRIEF_GROUNDER_MODEL`
  - `DERMBRIEF_AUDITOR_MODEL`
  - `DERMBRIEF_DISABLE_AI=1`

Vercel deployments receive `VERCEL_OIDC_TOKEN` automatically. Local development can use `AI_GATEWAY_API_KEY`; credentials should never be placed in the public UI or committed to the repository.

## Why this is agentic

The five stages are accountable agents with explicit authority limits rather than free-roaming chatbots:

- Scout can retrieve and verify.
- Appraiser can score with transparent rules.
- Grounder can propose language.
- Safety Auditor can reject language.
- Publisher cannot act until a physician approves.

The product innovation is the authority graph. Each stage can do useful work, but no stage can silently inherit the authority of the next one.

**Autonomous releases: 0**
