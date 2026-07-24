import { createAuditManifest } from './audit-integrity.js'

const MAX_BODY_BYTES = 512_000

function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return json(
        { error: { code: 'method_not_allowed', message: 'Use POST to create an audit manifest.' } },
        405,
        { Allow: 'POST' },
      )
    }

    const declaredLength = Number(request.headers.get('content-length') ?? 0)
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return json(
        { error: { code: 'payload_too_large', message: 'The evidence run exceeds the manifest input limit.' } },
        413,
      )
    }

    let run
    try {
      const text = await request.text()
      if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) {
        return json(
          { error: { code: 'payload_too_large', message: 'The evidence run exceeds the manifest input limit.' } },
          413,
        )
      }
      run = JSON.parse(text)
    } catch {
      return json(
        { error: { code: 'invalid_json', message: 'The request body must contain valid JSON.' } },
        400,
      )
    }

    try {
      const manifest = createAuditManifest(run)
      return json({ manifest })
    } catch (error) {
      return json(
        {
          error: {
            code: 'invalid_audit_run',
            message: error instanceof Error ? error.message : 'The evidence run is invalid.',
          },
        },
        400,
      )
    }
  },
}
