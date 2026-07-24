# Audit integrity manifests

DermBrief exposes `POST /api/audit-manifest` to create a deterministic SHA-256 integrity receipt for an evidence run.

## Protected fields

The header commits to the run ID, PubMed ID, workflow status, start and completion timestamps, event count, and AI execution mode when present.

Each event digest commits to its sequence, timestamp, sender, recipient, kind, phase, message, source-verification state, and the previous digest. Sequence numbers must be contiguous and begin at 1.

The transient `persisted` flag is excluded because it can change when an otherwise identical event moves from local state to durable storage.

## Minimal output

The manifest contains identifiers and hashes. It does not include the article abstract, source quotations, learning-card text, or event messages. Verification therefore requires both the original run and its manifest.

## Endpoint behavior

The endpoint:

- accepts `POST` only
- enforces a 512 KB declared and actual body limit
- returns stable JSON error codes for malformed JSON and invalid run structure
- sends `Cache-Control: no-store`

## Verification

`verifyAuditManifest(run, manifest)` recomputes the complete chain and compares the result deterministically.

A successful verification means the supplied run matches the supplied manifest under manifest version 1. It does not prove authorship, approval authority, source sufficiency, or the time at which either artifact was created. A deployment that needs those guarantees should bind the final digest to its own authenticated signing and durable-record systems.
