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

export async function POST(request: Request) {
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
