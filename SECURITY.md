# Security Policy

## Supported version

Security fixes are applied to the current `main` branch. Tagged releases may be patched when the issue affects a published version.

## Reporting a vulnerability

Do not open a public issue for suspected vulnerabilities, exposed credentials, patient-data risks, prompt-injection paths, authorization bypasses, or weaknesses that could allow unsupported clinical content to be published.

Report privately through GitHub's private vulnerability reporting feature when available. Include:

- affected route, file, or workflow
- reproduction steps
- expected and observed behavior
- potential impact
- any suggested remediation

Please avoid accessing data that is not yours, degrading the service, or publishing exploit details before a fix is available.

## Clinical AI security priorities

DermBrief treats the following as security-relevant:

- bypassing physician approval
- falsifying or detaching source quotations
- changing deterministic evidence scores through model output
- concealing abstract-only limitations
- exposing secrets or backend credentials
- introducing patient-identifiable information
- weakening journal allowlisting or audit records

## Response process

Reports will be assessed for reproducibility, clinical impact, exploitability, and scope. Confirmed issues will receive a remediation plan and coordinated disclosure decision.
