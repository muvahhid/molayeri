import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ADMIN_RATE_WINDOW_MS = 60_000
const ADMIN_RATE_MAX_REQUESTS = 120
const BULK_CHUNK_SIZE = 250

const ALLOWED_ROLES = new Set(['user', 'pending_business', 'isletmeci', 'admin'])
const ALLOWED_STATUSES = new Set(['active', 'banned'])

type RateState = {
  count: number
  resetAt: number
}

type AdminContextOk = {
  ok: true
  adminSupabase: SupabaseClient
}

type AdminContextFail = {
  ok: false
  response: NextResponse
}

type AdminContext = AdminContextOk | AdminContextFail

type ActionBody = {
  action?: 'update_user' | 'bulk_role' | 'bulk_status'
  userId?: string
  userIds?: string[]
  full_name?: string | null
  role?: string
  status?: string
}

const globalRateStore = globalThis as typeof globalThis & {
  __adminUsersRateStore?: Map<string, RateState>
}

function cleanUuid(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeRole(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeStatus(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function sanitizeFullName(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 120)
}

function splitChunks<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function getRequestIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  return 'unknown'
}

function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (!host) return false

  const proto = request.headers.get('x-forwarded-proto')
  const allowed = new Set<string>([
    `https://${host}`,
    `http://${host}`,
    proto ? `${proto}://${host}` : '',
  ])

  try {
    return allowed.has(new URL(origin).origin)
  } catch {
    return false
  }
}

function checkRateLimit(request: Request): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const path = new URL(request.url).pathname
  const key = `${path}:${getRequestIp(request)}`

  if (!globalRateStore.__adminUsersRateStore) {
    globalRateStore.__adminUsersRateStore = new Map<string, RateState>()
  }

  const store = globalRateStore.__adminUsersRateStore
  const current = store.get(key)

  if (!current || now > current.resetAt) {
    store.set(key, { count: 1, resetAt: now + ADMIN_RATE_WINDOW_MS })
    return { ok: true, retryAfter: 0 }
  }

  if (current.count >= ADMIN_RATE_MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    return { ok: false, retryAfter }
  }

  current.count += 1
  store.set(key, current)
  return { ok: true, retryAfter: 0 }
}

async function resolveAdminContext(): Promise<AdminContext> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Supabase bağlantı ayarları eksik.' }, { status: 500 }),
    }
  }

  if (!serviceRoleKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Sunucu admin anahtarı eksik. `SUPABASE_SERVICE_ROLE_KEY` veya `SUPABASE_SECRET_KEY` tanımlanmalı.' },
        { status: 500 }
      ),
    }
  }

  const cookieStore = await cookies()
  const userClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options })
      },
    },
  })

  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 }),
    }
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const roleRes = await adminSupabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (roleRes.data as { role?: string | null } | null)?.role || null
  if (role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekli.' }, { status: 403 }),
    }
  }

  return { ok: true, adminSupabase }
}

function cleanUserIds(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return Array.from(new Set(input.map((value) => cleanUuid(value)).filter((id) => id.length > 0)))
}

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Geçersiz istek kaynağı.' }, { status: 403 })
  }

  const rate = checkRateLimit(request)
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
    )
  }

  const ctx = await resolveAdminContext()
  if (!ctx.ok) return ctx.response

  let body: ActionBody | null = null
  try {
    body = (await request.json()) as ActionBody
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const action = body?.action
  if (!action) {
    return NextResponse.json({ error: 'Eksik işlem tipi.' }, { status: 400 })
  }

  if (action === 'update_user') {
    const userId = cleanUuid(body?.userId)
    if (!userId) {
      return NextResponse.json({ error: 'Geçersiz userId.' }, { status: 400 })
    }

    const patch: Record<string, unknown> = {}
    const fullName = sanitizeFullName(body?.full_name)
    if (fullName !== undefined) {
      patch.full_name = fullName
    }

    if (body?.role !== undefined) {
      const role = normalizeRole(body.role)
      if (!ALLOWED_ROLES.has(role)) {
        return NextResponse.json({ error: 'Geçersiz rol değeri.' }, { status: 400 })
      }
      patch.role = role
    }

    if (body?.status !== undefined) {
      const status = normalizeStatus(body.status)
      if (!ALLOWED_STATUSES.has(status)) {
        return NextResponse.json({ error: 'Geçersiz durum değeri.' }, { status: 400 })
      }
      patch.status = status
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan yok.' }, { status: 400 })
    }

    const updateRes = await ctx.adminSupabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select('*')
      .maybeSingle()

    if (updateRes.error) {
      return NextResponse.json({ error: updateRes.error.message || 'Kayıt güncellenemedi.' }, { status: 500 })
    }

    if (!updateRes.data) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, user: updateRes.data })
  }

  if (action === 'bulk_role') {
    const userIds = cleanUserIds(body?.userIds)
    const role = normalizeRole(body?.role)
    if (userIds.length === 0) {
      return NextResponse.json({ error: 'En az bir kullanıcı seçilmelidir.' }, { status: 400 })
    }
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'Geçersiz rol değeri.' }, { status: 400 })
    }

    for (const chunk of splitChunks(userIds, BULK_CHUNK_SIZE)) {
      const res = await ctx.adminSupabase.from('profiles').update({ role }).in('id', chunk)
      if (res.error) {
        return NextResponse.json({ error: res.error.message || 'Toplu rol güncellemesi başarısız.' }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, affected: userIds.length })
  }

  if (action === 'bulk_status') {
    const userIds = cleanUserIds(body?.userIds)
    const status = normalizeStatus(body?.status)
    if (userIds.length === 0) {
      return NextResponse.json({ error: 'En az bir kullanıcı seçilmelidir.' }, { status: 400 })
    }
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Geçersiz durum değeri.' }, { status: 400 })
    }

    for (const chunk of splitChunks(userIds, BULK_CHUNK_SIZE)) {
      const res = await ctx.adminSupabase.from('profiles').update({ status }).in('id', chunk)
      if (res.error) {
        return NextResponse.json({ error: res.error.message || 'Toplu durum güncellemesi başarısız.' }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, affected: userIds.length })
  }

  return NextResponse.json({ error: 'Desteklenmeyen işlem tipi.' }, { status: 400 })
}
