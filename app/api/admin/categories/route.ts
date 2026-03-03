import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { jsonNoStore } from '@/lib/security/http'
import { writeAdminAuditLog, requestAuditMeta } from '@/lib/security/admin-audit-log'
import { checkDistributedAdminRateLimit } from '@/lib/security/admin-rate-limit'
import { isValidAdminCsrf } from '@/lib/security/csrf'

export const dynamic = 'force-dynamic'

const ADMIN_RATE_WINDOW_MS = 60_000
const ADMIN_RATE_MAX_REQUESTS = 120

type RateState = {
  count: number
  resetAt: number
}

type AdminContextOk = {
  ok: true
  adminSupabase: SupabaseClient
  adminUserId: string
}

type AdminContextFail = {
  ok: false
  response: NextResponse
}

type AdminContext = AdminContextOk | AdminContextFail

type ActionBody = {
  action?: 'save_category' | 'delete_category' | 'save_feature' | 'delete_feature'
  categoryId?: string
  featureId?: string
  name?: string
  slug?: string
  is_global?: boolean
  feature_category_id?: string | null
}

const globalRateStore = globalThis as typeof globalThis & {
  __adminCategoriesRateStore?: Map<string, RateState>
}

function cleanUuid(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanText(value: unknown, max = 120): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
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


function isTrustedFetchSite(request: Request): boolean {
  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true
  }

  const site = (request.headers.get('sec-fetch-site') || '').trim().toLowerCase()
  if (!site) return true
  return site === 'same-origin' || site === 'same-site' || site === 'none'
}

async function checkRateLimit(request: Request): Promise<{ ok: boolean; retryAfter: number }> {
  const distributed = await checkDistributedAdminRateLimit(request, {
    namespace: 'admin_categories',
    windowMs: ADMIN_RATE_WINDOW_MS,
    maxRequests: ADMIN_RATE_MAX_REQUESTS,
  })
  if (distributed) return distributed

  const now = Date.now()
  const path = new URL(request.url).pathname
  const key = `${path}:${getRequestIp(request)}`

  if (!globalRateStore.__adminCategoriesRateStore) {
    globalRateStore.__adminCategoriesRateStore = new Map<string, RateState>()
  }

  const store = globalRateStore.__adminCategoriesRateStore
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
      response: jsonNoStore({ error: 'Supabase bağlantı ayarları eksik.' }, { status: 500 }),
    }
  }

  if (!serviceRoleKey) {
    return {
      ok: false,
      response: jsonNoStore(
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
      response: jsonNoStore({ error: 'Oturum bulunamadı.' }, { status: 401 }),
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
      response: jsonNoStore({ error: 'Bu işlem için admin yetkisi gerekli.' }, { status: 403 }),
    }
  }

  return { ok: true, adminSupabase, adminUserId: user.id }
}

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return jsonNoStore({ error: 'Geçersiz istek kaynağı.' }, { status: 403 })
  }

  if (!isTrustedFetchSite(request)) {
    return jsonNoStore({ error: 'Geçersiz istek bağlamı.' }, { status: 403 })
  }

  if (!isValidAdminCsrf(request)) {
    return jsonNoStore({ error: 'Güvenlik doğrulaması başarısız. Sayfayı yenileyip tekrar deneyin.' }, { status: 403 })
  }

  const rate = await checkRateLimit(request)
  if (!rate.ok) {
    return jsonNoStore(
      { error: 'Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
    )
  }

  const ctx = await resolveAdminContext()
  if (!ctx.ok) return ctx.response
  const auditMeta = requestAuditMeta(request)

  let body: ActionBody | null = null
  try {
    body = (await request.json()) as ActionBody
  } catch {
    return jsonNoStore({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const action = body?.action
  if (!action) {
    return jsonNoStore({ error: 'Eksik işlem tipi.' }, { status: 400 })
  }

  if (action === 'save_category') {
    const name = cleanText(body?.name, 120)
    const slug = cleanText(body?.slug, 120)
    const categoryId = cleanUuid(body?.categoryId)
    if (!name || !slug) {
      return jsonNoStore({ error: 'Kategori adı ve slug zorunludur.' }, { status: 400 })
    }

    const payload = { name, slug }
    const res = categoryId
      ? await ctx.adminSupabase.from('categories').update(payload).eq('id', categoryId)
      : await ctx.adminSupabase.from('categories').insert(payload)

    if (res.error) {
      return jsonNoStore({ error: res.error.message || 'Kategori kaydedilemedi.' }, { status: 500 })
    }

    await writeAdminAuditLog(ctx.adminSupabase, {
      actorId: ctx.adminUserId,
      scope: 'admin.categories',
      action,
      targetId: categoryId || slug,
      targetTable: 'categories',
      metadata: { name, slug },
      ...auditMeta,
    })

    return jsonNoStore({ ok: true })
  }

  if (action === 'delete_category') {
    const categoryId = cleanUuid(body?.categoryId)
    if (!categoryId) {
      return jsonNoStore({ error: 'Geçersiz categoryId.' }, { status: 400 })
    }

    const featureReset = await ctx.adminSupabase
      .from('features')
      .update({ category_id: null, is_global: true })
      .eq('category_id', categoryId)

    if (featureReset.error) {
      return jsonNoStore({ error: featureReset.error.message || 'Özellikler taşınamadı.' }, { status: 500 })
    }

    const businessCategoryDelete = await ctx.adminSupabase.from('business_categories').delete().eq('category_id', categoryId)
    if (businessCategoryDelete.error) {
      return jsonNoStore({ error: businessCategoryDelete.error.message || 'Kategori ilişkileri silinemedi.' }, { status: 500 })
    }

    const deleteRes = await ctx.adminSupabase.from('categories').delete().eq('id', categoryId)
    if (deleteRes.error) {
      return jsonNoStore({ error: deleteRes.error.message || 'Kategori silinemedi.' }, { status: 500 })
    }

    await writeAdminAuditLog(ctx.adminSupabase, {
      actorId: ctx.adminUserId,
      scope: 'admin.categories',
      action,
      targetId: categoryId,
      targetTable: 'categories',
      metadata: { deleted: true },
      ...auditMeta,
    })

    return jsonNoStore({ ok: true })
  }

  if (action === 'save_feature') {
    const name = cleanText(body?.name, 160)
    const featureId = cleanUuid(body?.featureId)
    const targetCategoryId = cleanUuid(body?.feature_category_id)
    const isGlobal = Boolean(body?.is_global)
    if (!name) {
      return jsonNoStore({ error: 'Özellik adı zorunludur.' }, { status: 400 })
    }
    if (!isGlobal && !targetCategoryId) {
      return jsonNoStore({ error: 'Kategoriye bağlı özellik için kategori seçilmelidir.' }, { status: 400 })
    }

    const payload = {
      name,
      is_global: isGlobal,
      category_id: isGlobal ? null : targetCategoryId,
    }

    const res = featureId
      ? await ctx.adminSupabase.from('features').update(payload).eq('id', featureId)
      : await ctx.adminSupabase.from('features').insert(payload)

    if (res.error) {
      return jsonNoStore({ error: res.error.message || 'Özellik kaydedilemedi.' }, { status: 500 })
    }

    await writeAdminAuditLog(ctx.adminSupabase, {
      actorId: ctx.adminUserId,
      scope: 'admin.categories',
      action,
      targetId: featureId || name,
      targetTable: 'features',
      metadata: { name, isGlobal, targetCategoryId: isGlobal ? null : targetCategoryId },
      ...auditMeta,
    })

    return jsonNoStore({ ok: true })
  }

  if (action === 'delete_feature') {
    const featureId = cleanUuid(body?.featureId)
    if (!featureId) {
      return jsonNoStore({ error: 'Geçersiz featureId.' }, { status: 400 })
    }

    const relationDelete = await ctx.adminSupabase.from('business_features').delete().eq('feature_id', featureId)
    if (relationDelete.error) {
      return jsonNoStore({ error: relationDelete.error.message || 'Özellik ilişkileri silinemedi.' }, { status: 500 })
    }

    const deleteRes = await ctx.adminSupabase.from('features').delete().eq('id', featureId)
    if (deleteRes.error) {
      return jsonNoStore({ error: deleteRes.error.message || 'Özellik silinemedi.' }, { status: 500 })
    }

    await writeAdminAuditLog(ctx.adminSupabase, {
      actorId: ctx.adminUserId,
      scope: 'admin.categories',
      action,
      targetId: featureId,
      targetTable: 'features',
      metadata: { deleted: true },
      ...auditMeta,
    })

    return jsonNoStore({ ok: true })
  }

  return jsonNoStore({ error: 'Desteklenmeyen işlem tipi.' }, { status: 400 })
}
