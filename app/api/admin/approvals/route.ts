import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ADMIN_RATE_WINDOW_MS = 60_000
const ADMIN_RATE_MAX_REQUESTS = 120
const ALLOWED_DECISIONS = new Set(['active', 'rejected'])

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
  action?: 'set_decision'
  businessId?: string
  decision?: 'active' | 'rejected'
}

type BusinessOwnerRow = {
  id: string
  owner_id: string | null
}

const globalRateStore = globalThis as typeof globalThis & {
  __adminApprovalsRateStore?: Map<string, RateState>
}

function cleanUuid(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanDecision(value: unknown): 'active' | 'rejected' | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (!ALLOWED_DECISIONS.has(normalized)) return null
  return normalized as 'active' | 'rejected'
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
  const allowed = new Set<string>([`https://${host}`, `http://${host}`, proto ? `${proto}://${host}` : ''])

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

  if (!globalRateStore.__adminApprovalsRateStore) {
    globalRateStore.__adminApprovalsRateStore = new Map<string, RateState>()
  }

  const store = globalRateStore.__adminApprovalsRateStore
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

  if (body?.action !== 'set_decision') {
    return NextResponse.json({ error: 'Desteklenmeyen işlem tipi.' }, { status: 400 })
  }

  const businessId = cleanUuid(body.businessId)
  const decision = cleanDecision(body.decision)
  if (!businessId || !decision) {
    return NextResponse.json({ error: 'Eksik veya geçersiz parametre.' }, { status: 400 })
  }

  const businessRes = await ctx.adminSupabase
    .from('businesses')
    .select('id,owner_id')
    .eq('id', businessId)
    .maybeSingle()

  if (businessRes.error || !businessRes.data) {
    return NextResponse.json({ error: 'İşletme kaydı bulunamadı.' }, { status: 404 })
  }

  const business = businessRes.data as BusinessOwnerRow

  const updateRes = await ctx.adminSupabase.from('businesses').update({ status: decision }).eq('id', businessId)
  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message || 'İşlem yapılamadı.' }, { status: 500 })
  }

  const ownerId = cleanUuid(business.owner_id)
  if (ownerId) {
    if (decision === 'active') {
      const ownerRes = await ctx.adminSupabase
        .from('profiles')
        .update({ role: 'isletmeci', status: 'active' })
        .eq('id', ownerId)
        .neq('role', 'admin')

      if (ownerRes.error) {
        return NextResponse.json({ error: ownerRes.error.message || 'Sahip profili güncellenemedi.' }, { status: 500 })
      }
    } else {
      const remainingRes = await ctx.adminSupabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', ownerId)
        .in('status', ['active', 'pending'])

      if (remainingRes.error) {
        return NextResponse.json({ error: remainingRes.error.message || 'Sahip işletmeleri kontrol edilemedi.' }, { status: 500 })
      }

      if ((remainingRes.count || 0) === 0) {
        const demoteRes = await ctx.adminSupabase
          .from('profiles')
          .update({ role: 'user' })
          .eq('id', ownerId)
          .eq('role', 'pending_business')

        if (demoteRes.error) {
          return NextResponse.json({ error: demoteRes.error.message || 'Sahip rolü güncellenemedi.' }, { status: 500 })
        }
      }
    }
  }

  return NextResponse.json({ ok: true, businessId, decision })
}
