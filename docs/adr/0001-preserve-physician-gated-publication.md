# ADR 0001: Preserve physician-gated publication

- Status: Accepted
- Date: 2026-07-23

## Context

DermBrief uses models to propose and audit an educational learning card derived from a PubMed abstract. Model completion is not equivalent to clinical validation, and an automated workflow should not silently convert evidence summarization into a practice recommendation or publication decision.

## Decision

The Publisher stage remains a separate capability that is blocked until an identified physician explicitly approves the card.

Upstream agent completion may prepare a reviewable artifact, but it cannot authorize publication. Model output also cannot modify the deterministic evidence-quality score or override source-grounding vetoes.

## Consequences

### Positive

- Human accountability remains visible and auditable.
- The interface cannot imply that agent consensus equals physician approval.
- Model failure or disagreement does not pressure the system to lower its safety threshold.
- Release events can be attributed to an explicit human action.

### Tradeoffs

- The workflow cannot publish fully autonomously.
- Physician review creates latency and limits throughput.
- Approval identity and audit persistence become operational requirements.

## Invariants

A change violates this decision if it:

- marks Publisher complete before physician approval
- treats workflow completion as approval
- allows a model to self-approve its own output
- obscures who authorized release
- removes the ability to block an unsupported card
