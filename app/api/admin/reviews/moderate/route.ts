import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const REMOVED_REVIEW_TEXT = 'Yorum yönetim tarafından kaldırıldı.'

type ModerateBody = {
  reviewId?: string
  mode?: 'close' | 'remove'
}

type ReviewRow = {
  id: string
  business_id: string | null
  is_reported: boolean | null
  comment: string | null
}

type BusinessRow = {
  id: string
  name: string | null
  owner_id: string | null
}

const ADMIN_RATE_WINDOW_MS = 60_000
const ADMIN_RATE_MAX_REQUESTS = 120

type RateState = {
  count: number
  resetAt: number
}

const globalRateStore = globalThis as typeof globalThis & {
  __adminReviewsRateStore?: Map<string, RateState>
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
}

function buildOwnerMessage(input: { mode: 'close' | 'remove'; businessName: string; reviewId: string }) {
  if (input.mode === 'remove') {
    return {
      subject: `Yorum moderasyonu uygulandı • ${input.businessName}`,
      content: `Bildirilen yorum moderasyon nedeniyle kaldırıldı.\nYorum ID: ${input.reviewId}`,
    }
  }

  return {
    subject: `Yorum inceleme tamamlandı • ${input.businessName}`,
    content: `Bildirilen yorum incelendi ve rapor kapatıldı.\nYorum ID: ${input.reviewId}`,
  }
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

  if (!globalRateStore.__adminReviewsRateStore) {
    globalRateStore.__adminReviewsRateStore = new Map<string, RateState>()
  }

  const store = globalRateStore.__adminReviewsRateStore
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase bağlantı ayarları eksik.' }, { status: 500 })
  }

  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'Sunucu moderasyon anahtarı eksik. `SUPABASE_SERVICE_ROLE_KEY` veya `SUPABASE_SECRET_KEY` tanımlanmalı.' },
      { status: 500 }
    )
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
    return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 })
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const adminRoleRes = await adminSupabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (adminRoleRes.data as { role?: string | null } | null)?.role || null
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekli.' }, { status: 403 })
  }

  let body: ModerateBody | null = null
  try {
    body = (await request.json()) as ModerateBody
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const reviewId = (body?.reviewId || '').trim()
  const mode = body?.mode

  if (!reviewId || (mode !== 'close' && mode !== 'remove')) {
    return NextResponse.json({ error: 'Eksik veya geçersiz parametre.' }, { status: 400 })
  }

  const reviewRes = await adminSupabase
    .from('business_reviews')
    .select('id,business_id,is_reported,comment')
    .eq('id', reviewId)
    .maybeSingle()

  if (reviewRes.error || !reviewRes.data) {
    return NextResponse.json({ error: 'Yorum kaydı bulunamadı.' }, { status: 404 })
  }

  const review = reviewRes.data as ReviewRow
  const nowIso = new Date().toISOString()

  const basePayload =
    mode === 'remove' ? { is_reported: false, comment: REMOVED_REVIEW_TEXT } : { is_reported: false }

  const updateRes = await adminSupabase
    .from('business_reviews')
    .update(basePayload)
    .eq('id', reviewId)
    .select('id,is_reported,comment')
    .maybeSingle()

  if (updateRes.error || !updateRes.data) {
    return NextResponse.json(
      { error: `Moderasyon yazımı başarısız: ${updateRes.error?.message || 'Bilinmeyen hata'}` },
      { status: 500 }
    )
  }

  const updated = updateRes.data as { is_reported?: boolean | null; comment?: string | null }
  if (updated.is_reported !== false) {
    return NextResponse.json({ error: 'İşlem tamamlanamadı: rapor durumu kapanmadı.' }, { status: 500 })
  }

  if (
    mode === 'remove' &&
    normalizeText(updated.comment || '') !== normalizeText(REMOVED_REVIEW_TEXT)
  ) {
    return NextResponse.json({ error: 'İşlem tamamlanamadı: yorum metni güncellenmedi.' }, { status: 500 })
  }

  // Optional audit fields. Missing column errors are ignored to keep backward compatibility.
  const optionalPatches: Array<Record<string, unknown>> = [
    { reviewed_at: nowIso },
    { report_status: mode === 'remove' ? 'removed' : 'resolved' },
    { reviewed_by: user.id },
  ]

  for (const patch of optionalPatches) {
    const patchRes = await adminSupabase.from('business_reviews').update(patch).eq('id', reviewId)
    if (patchRes.error) {
      const code = patchRes.error.code || ''
      // 42703 => undefined_column. Ignore only schema mismatch cases.
      if (code !== '42703') {
        // no-op: moderation succeeded already, do not fail the request here
      }
    }
  }

  let businessName = 'İşletme'
  let ownerId: string | null = null
  const businessId = (review.business_id || '').trim()
  if (businessId) {
    const businessRes = await adminSupabase
      .from('businesses')
      .select('id,name,owner_id')
      .eq('id', businessId)
      .maybeSingle()

    if (!businessRes.error && businessRes.data) {
      const business = businessRes.data as BusinessRow
      businessName = business.name || businessName
      ownerId = business.owner_id || null
    }
  }

  if (ownerId) {
    const ownerMessage = buildOwnerMessage({ mode, businessName, reviewId })
    await adminSupabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: ownerId,
      subject: ownerMessage.subject,
      content: ownerMessage.content,
      message_type: 'admin_signal',
      is_read: false,
    })
  }

  return NextResponse.json({
    ok: true,
    reviewId,
    mode,
  })
}
