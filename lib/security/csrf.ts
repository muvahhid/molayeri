import { NextResponse, type NextRequest } from 'next/server'

export const ADMIN_CSRF_COOKIE_NAME = 'molayeri_admin_csrf'
export const ADMIN_CSRF_HEADER_NAME = 'x-admin-csrf'

const CSRF_TOKEN_TTL_SECONDS = 60 * 60 * 12

function shouldAttachAdminCsrf(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/merchant') || pathname.startsWith('/login')
}

function buildCsrfToken(): string {
  const base = crypto.randomUUID().replaceAll('-', '')
  const suffix = Math.random().toString(36).slice(2)
  return `${base}${suffix}`.slice(0, 64)
}

function parseCookie(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) return null

  const chunks = cookieHeader.split(';')
  for (const chunk of chunks) {
    const [rawName, ...rawValue] = chunk.trim().split('=')
    if (rawName !== cookieName) continue
    const value = rawValue.join('=').trim()
    if (!value) return null
    try {
      return decodeURIComponent(value)
    } catch {
      return null
    }
  }

  return null
}

export function ensureAdminCsrfCookie(request: NextRequest, response: NextResponse): NextResponse {
  if (!shouldAttachAdminCsrf(request.nextUrl.pathname)) {
    return response
  }

  const existingToken = request.cookies.get(ADMIN_CSRF_COOKIE_NAME)?.value
  if (existingToken && existingToken.length >= 24) {
    return response
  }

  response.cookies.set({
    name: ADMIN_CSRF_COOKIE_NAME,
    value: buildCsrfToken(),
    path: '/',
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
    maxAge: CSRF_TOKEN_TTL_SECONDS,
  })

  return response
}

export function isValidAdminCsrf(request: Request): boolean {
  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true
  }

  const cookieToken = parseCookie(request.headers.get('cookie'), ADMIN_CSRF_COOKIE_NAME)
  const headerToken = (request.headers.get(ADMIN_CSRF_HEADER_NAME) || '').trim()

  if (!cookieToken || !headerToken) {
    return false
  }

  if (cookieToken.length < 24 || headerToken.length < 24) {
    return false
  }

  return cookieToken === headerToken
}
