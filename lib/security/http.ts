import { NextResponse } from 'next/server'

function mergeHeaders(input?: HeadersInit): Headers {
  const headers = new Headers(input)
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
  }
  if (!headers.has('Pragma')) {
    headers.set('Pragma', 'no-cache')
  }
  if (!headers.has('Expires')) {
    headers.set('Expires', '0')
  }
  if (!headers.has('X-Content-Type-Options')) {
    headers.set('X-Content-Type-Options', 'nosniff')
  }
  return headers
}

export function jsonNoStore(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: mergeHeaders(init?.headers),
  })
}
