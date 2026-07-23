# Contributing to DermBrief EvidenceOps

Thank you for helping improve a physician-gated clinical evidence workflow.

## Clinical safety boundary

DermBrief is an educational evidence-operations tool. Contributions must preserve these invariants:

- Publisher remains blocked until explicit physician approval.
- Every substantive generated claim maps to an exact source excerpt.
- Abstract-only processing is disclosed as a limitation.
- Deterministic checks retain veto power over model output.
- No patient-identifiable information is required or accepted.

Changes that weaken these boundaries will not be merged.

## Development workflow

1. Create a focused branch from `main`.
2. Make the smallest coherent change that solves the issue.
3. Add or update tests for behavior changes.
4. Run the complete local quality gate:

```bash
npm install --no-audit --no-fund
npm run lint
npm test
npm run test:coverage
npm run check
npm run build
```

5. Open a pull request using the repository template.

## Pull request expectations

A strong pull request explains:

- the problem and intended user outcome
- the clinical or product safety impact
- the implementation approach
- validation performed
- screenshots for visible interface changes
- rollback or fallback behavior when relevant

Keep pull requests reviewable. Separate architecture changes, interface changes, and documentation-only changes when practical.

## Commit messages

Use concise, imperative messages such as:

- `Add exact-quote regression cases`
- `Harden PubMed journal normalization`
- `Document physician release boundary`

Avoid generic messages such as `update`, `fix stuff`, or `changes`.

## Issues and feature requests

Use the issue templates. For clinical workflow proposals, describe the intended user, evidence source, failure mode, and required human checkpoint.

## Scope

Useful contributions include test coverage, accessibility, evidence provenance, deterministic validation, documentation, journal normalization, auditability, and developer experience.
