# Quality Gates

DermBrief uses visible, independently named checks so reviewers can distinguish test failures, type failures, and build failures.

## Pull request gate

Every pull request runs:

1. JavaScript syntax checks for the serverless evidence routes.
2. Node 22 native regression tests.
3. Native test coverage collection with a downloadable summary artifact.
4. TypeScript project validation.
5. The production Vite build, including the legacy regression suites invoked by `prebuild`.
6. CodeQL analysis for JavaScript and TypeScript.

## Local command

```bash
npm install --no-audit --no-fund
npm run lint
npm test
npm run test:coverage
npm run check
npm run build
```

## Coverage policy

This hardening release establishes a reproducible coverage baseline without introducing a new test framework or dependency lock transition. The next quality milestone is to isolate the pure evidence-governance functions into smaller modules, then enforce coverage thresholds on those safety-critical units.

Target thresholds for extracted core modules:

- lines: 80%
- functions: 80%
- branches: 70%

Coverage should improve by adding meaningful failure-path tests, not by excluding clinically important code.

## Merge policy

Recommended branch protection for `main`:

- require the CI and CodeQL checks to pass
- require at least one approving review
- dismiss stale approvals after new commits
- require conversation resolution
- block force pushes and branch deletion

Repository settings must be configured in GitHub after this pull request merges.
