export const ADMIN_CSRF_COOKIE_NAME = 'molayeri_admin_csrf'
export const ADMIN_CSRF_HEADER_NAME = 'x-admin-csrf'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  const parts = document.cookie ? document.cookie.split(';') : []
  for (const part of parts) {
    const [rawName, ...rawValue] = part.trim().split('=')
    if (rawName !== name) continue
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

export function adminJsonHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const token = readCookie(ADMIN_CSRF_COOKIE_NAME)
  if (token) {
    headers[ADMIN_CSRF_HEADER_NAME] = token
  }

  return headers
}
