import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ADMIN_RATE_WINDOW_MS = 60_000
const ADMIN_RATE_MAX_REQUESTS = 120
const BULK_CHUNK_SIZE = 250

const ALLOWED_STATUSES = new Set(['active', 'passive', 'pending', 'rejected'])
const ALLOWED_FEATURE_WRITE_MODES = new Set(['id', 'name', 'mixed'])

type GenericRow = Record<string, unknown>

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

type SaveBusinessPayload = {
  name?: string
  description?: string | null
  phone?: string | null
  address_text?: string | null
  type?: string | null
  status?: string | null
  lat?: number | null
  lng?: number | null
  road_name?: string | null
  road_note?: string | null
  road_type?: string | null
  road_place_id?: string | null
  image_url?: string | null
  menu_description?: string | null
  is_open?: boolean
}

type ActionBody = {
  action?: 'save_business' | 'delete_business' | 'bulk_status' | 'bulk_delete'
  businessId?: string
  businessIds?: string[]
  bulkStatus?: string
  payload?: SaveBusinessPayload
  categoryIds?: string[]
  featureIds?: string[]
  featureLegacyNames?: string[]
  featureWriteMode?: 'id' | 'name' | 'mixed'
}

const globalRateStore = globalThis as typeof globalThis & {
  __adminBusinessesRateStore?: Map<string, RateState>
}

function cleanUuid(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanUuidArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map((item) => cleanUuid(item)).filter((id) => id.length > 0)))
}

function cleanText(value: unknown, max = 1000): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function cleanNameList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim().slice(0, 160) : ''))
        .filter((item) => item.length > 0)
    )
  )
}

function cleanStatus(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return ALLOWED_STATUSES.has(normalized) ? normalized : null
}

function cleanFeatureWriteMode(value: unknown): 'id' | 'name' | 'mixed' {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (ALLOWED_FEATURE_WRITE_MODES.has(normalized)) {
    return normalized as 'id' | 'name' | 'mixed'
  }
  return 'id'
}

function cleanNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed)) return parsed
  }
  return null
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

  if (!globalRateStore.__adminBusinessesRateStore) {
    globalRateStore.__adminBusinessesRateStore = new Map<string, RateState>()
  }

  const store = globalRateStore.__adminBusinessesRateStore
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

function splitChunks<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
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

async function insertBusinessFeaturesRows(
  adminSupabase: SupabaseClient,
  rows: Array<Record<string, unknown>>
): Promise<void> {
  if (rows.length === 0) return
  const res = await adminSupabase.from('business_features').insert(rows)
  if (res.error) throw new Error(res.error.message)
}

async function writeCategories(adminSupabase: SupabaseClient, businessId: string, categoryIds: string[]): Promise<void> {
  const delRes = await adminSupabase.from('business_categories').delete().eq('business_id', businessId)
  if (delRes.error) throw new Error(delRes.error.message)

  if (categoryIds.length === 0) return
  const inserts = categoryIds.map((categoryId) => ({ business_id: businessId, category_id: categoryId }))
  const insertRes = await adminSupabase.from('business_categories').insert(inserts)
  if (insertRes.error) throw new Error(insertRes.error.message)
}

async function writeFeatures(
  adminSupabase: SupabaseClient,
  businessId: string,
  selectedFeatureIds: string[],
  legacyNames: string[],
  writeMode: 'id' | 'name' | 'mixed'
): Promise<void> {
  const deleteRes = await adminSupabase.from('business_features').delete().eq('business_id', businessId)
  if (deleteRes.error) throw new Error(deleteRes.error.message)

  const uniqueIds = Array.from(new Set(selectedFeatureIds.filter((id) => id.trim().length > 0)))
  const uniqueLegacyNames = Array.from(new Set(legacyNames.map((v) => v.trim()).filter((v) => v.length > 0)))

  const namesFromIds: string[] = []
  if (uniqueIds.length > 0) {
    const featureRowsRes = await adminSupabase.from('features').select('id,name').in('id', uniqueIds)
    if (!featureRowsRes.error && featureRowsRes.data) {
      const map = new Map<string, string>()
      for (const row of featureRowsRes.data as Array<{ id?: string | null; name?: string | null }>) {
        const id = (row.id || '').trim()
        const name = (row.name || '').trim()
        if (id && name) map.set(id, name)
      }
      for (const id of uniqueIds) {
        const name = map.get(id)
        if (name) namesFromIds.push(name)
      }
    }
  }

  const uniqueNames = Array.from(
    new Set([...namesFromIds, ...uniqueLegacyNames].map((v) => v.trim()).filter((v) => v.length > 0))
  )

  if (uniqueIds.length === 0 && uniqueNames.length === 0) return

  if (writeMode === 'name') {
    if (uniqueNames.length > 0) {
      await insertBusinessFeaturesRows(
        adminSupabase,
        uniqueNames.map((feature_name) => ({ business_id: businessId, feature_name }))
      )
    }
    return
  }

  if (uniqueIds.length > 0) {
    try {
      await insertBusinessFeaturesRows(
        adminSupabase,
        uniqueIds.map((feature_id) => ({ business_id: businessId, feature_id }))
      )
      if (writeMode === 'mixed' && uniqueNames.length > 0) {
        await insertBusinessFeaturesRows(
          adminSupabase,
          uniqueNames.map((feature_name) => ({ business_id: businessId, feature_name }))
        )
      }
      return
    } catch {
      // Fallback to name mode for schema-compatibility.
    }
  }

  if (uniqueNames.length > 0) {
    await insertBusinessFeaturesRows(
      adminSupabase,
      uniqueNames.map((feature_name) => ({ business_id: businessId, feature_name }))
    )
  }
}

function buildBusinessPatch(payload: SaveBusinessPayload | undefined): GenericRow {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Geçersiz işletme payload.')
  }

  const name = cleanText(payload.name, 160)
  if (!name) {
    throw new Error('İşletme adı zorunludur.')
  }

  const status = payload.status === null ? null : cleanStatus(payload.status)
  if (payload.status !== undefined && payload.status !== null && !status) {
    throw new Error('Geçersiz işletme durumu.')
  }

  const patch: GenericRow = {
    name,
    description: cleanText(payload.description, 2000),
    phone: cleanText(payload.phone, 64),
    address_text: cleanText(payload.address_text, 500),
    type: cleanText(payload.type, 120),
    status,
    lat: cleanNumber(payload.lat),
    lng: cleanNumber(payload.lng),
    road_name: cleanText(payload.road_name, 120),
    road_note: cleanText(payload.road_note, 500),
    road_type: cleanText(payload.road_type, 120),
    road_place_id: cleanText(payload.road_place_id, 128),
    image_url: cleanText(payload.image_url, 2048),
    menu_description: cleanText(payload.menu_description, 4000),
    is_open: payload.is_open === false ? false : true,
  }

  return patch
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

  if (action === 'save_business') {
    const businessId = cleanUuid(body?.businessId)
    if (!businessId) {
      return NextResponse.json({ error: 'Geçersiz businessId.' }, { status: 400 })
    }

    try {
      const patch = buildBusinessPatch(body?.payload)
      const updateRes = await ctx.adminSupabase.from('businesses').update(patch).eq('id', businessId)
      if (updateRes.error) {
        return NextResponse.json({ error: updateRes.error.message || 'İşletme güncellenemedi.' }, { status: 500 })
      }

      const categoryIds = cleanUuidArray(body?.categoryIds)
      const featureIds = cleanUuidArray(body?.featureIds)
      const featureLegacyNames = cleanNameList(body?.featureLegacyNames)
      const featureWriteMode = cleanFeatureWriteMode(body?.featureWriteMode)

      await writeCategories(ctx.adminSupabase, businessId, categoryIds)
      await writeFeatures(ctx.adminSupabase, businessId, featureIds, featureLegacyNames, featureWriteMode)

      return NextResponse.json({ ok: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'İşletme kaydedilemedi.'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  if (action === 'delete_business') {
    const businessId = cleanUuid(body?.businessId)
    if (!businessId) {
      return NextResponse.json({ error: 'Geçersiz businessId.' }, { status: 400 })
    }

    const deleteRes = await ctx.adminSupabase.from('businesses').delete().eq('id', businessId)
    if (deleteRes.error) {
      return NextResponse.json({ error: deleteRes.error.message || 'İşletme silinemedi.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'bulk_status') {
    const businessIds = cleanUuidArray(body?.businessIds)
    const status = cleanStatus(body?.bulkStatus)
    if (businessIds.length === 0) {
      return NextResponse.json({ error: 'En az bir işletme seçilmelidir.' }, { status: 400 })
    }
    if (!status) {
      return NextResponse.json({ error: 'Geçersiz toplu durum değeri.' }, { status: 400 })
    }

    for (const chunk of splitChunks(businessIds, BULK_CHUNK_SIZE)) {
      const res = await ctx.adminSupabase.from('businesses').update({ status }).in('id', chunk)
      if (res.error) {
        return NextResponse.json({ error: res.error.message || 'Toplu durum güncellemesi başarısız.' }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, affected: businessIds.length })
  }

  if (action === 'bulk_delete') {
    const businessIds = cleanUuidArray(body?.businessIds)
    if (businessIds.length === 0) {
      return NextResponse.json({ error: 'En az bir işletme seçilmelidir.' }, { status: 400 })
    }

    for (const chunk of splitChunks(businessIds, BULK_CHUNK_SIZE)) {
      const res = await ctx.adminSupabase.from('businesses').delete().in('id', chunk)
      if (res.error) {
        return NextResponse.json({ error: res.error.message || 'Toplu silme başarısız.' }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, affected: businessIds.length })
  }

  return NextResponse.json({ error: 'Desteklenmeyen işlem tipi.' }, { status: 400 })
}
