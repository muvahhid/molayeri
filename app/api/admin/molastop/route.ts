import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type CountResponse = {
  count: number | null
  error: { message?: string; code?: string } | null
}

type ProfileMini = {
  id: string
  full_name: string | null
  email: string | null
}

type TripPostRow = {
  id: string
  owner_id: string
  owner_name: string | null
  post_type: string | null
  title: string | null
  origin_text: string | null
  destination_text: string | null
  is_active: boolean | null
  created_at: string
  updated_at: string
}

type RideRequestRow = {
  id: string
  post_id: string
  post_owner_id: string
  requester_id: string
  requester_name: string | null
  status: string | null
  pickup_text: string | null
  dropoff_text: string | null
  created_at: string
  updated_at: string
}

type MatchRow = {
  id: string
  request_id: string
  post_id: string
  driver_id: string
  rider_id: string
  status: string | null
  created_at: string
  updated_at: string
}

type ChannelRow = {
  id: string
  created_by: string
  name: string | null
  topic: string | null
  is_active: boolean | null
  created_at: string
  updated_at: string
}

type ChannelMessageRow = {
  id: number
  channel_id: string
  sender_id: string
  sender_name: string | null
  message: string | null
  created_at: string
}

type ActionBody = {
  action?:
    | 'deactivate_post'
    | 'activate_post'
    | 'cancel_request'
    | 'reject_request'
    | 'cancel_match'
    | 'complete_match'
    | 'deactivate_channel'
    | 'activate_channel'
    | 'delete_channel_message'
  postId?: string
  requestId?: string
  matchId?: string
  channelId?: string
  messageId?: number | string
  reason?: string
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

function cleanUuid(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanReason(value: unknown): string {
  const reason = typeof value === 'string' ? value.trim() : ''
  return reason.slice(0, 500)
}

function shortId(value: string): string {
  if (!value) return '-'
  if (value.length <= 10) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function isFinalRequestStatus(status: string | null): boolean {
  const n = normalizeText(status || '')
  return n === 'cancelled' || n === 'rejected' || n === 'completed'
}

async function safeCount(query: PromiseLike<CountResponse>): Promise<number> {
  try {
    const { count, error } = await query
    if (error) return 0
    return count || 0
  } catch {
    return 0
  }
}

async function safeRows<T>(query: PromiseLike<{ data: T[] | null; error: { message?: string } | null }>): Promise<T[]> {
  try {
    const { data, error } = await query
    if (error || !data) return []
    return data
  } catch {
    return []
  }
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

  return { ok: true, adminSupabase, adminUserId: user.id }
}

async function sendAdminSignals(
  adminSupabase: SupabaseClient,
  input: { senderId: string; recipientIds: string[]; subject: string; content: string }
) {
  const recipients = Array.from(new Set(input.recipientIds.map((id) => id.trim()).filter((id) => id.length > 0)))
  if (recipients.length === 0) return

  const payload = recipients.map((recipientId) => ({
    sender_id: input.senderId,
    recipient_id: recipientId,
    subject: input.subject,
    content: input.content,
    message_type: 'admin_signal',
    is_read: false,
  }))

  await adminSupabase.from('messages').insert(payload)
}

export async function GET() {
  const ctx = await resolveAdminContext()
  if (!ctx.ok) return ctx.response

  const { adminSupabase } = ctx
  const now = Date.now()
  const dayAgoIso = new Date(now - 24 * 60 * 60 * 1000).toISOString()

  const [
    totalPosts,
    activePosts,
    pendingRequests,
    activeMatches,
    completedMatches24h,
    activeChannels,
    messages24h,
    posts,
    requests,
    matches,
    channels,
    messages,
  ] = await Promise.all([
    safeCount(adminSupabase.from('molastop_trip_posts').select('id', { head: true, count: 'exact' })),
    safeCount(adminSupabase.from('molastop_trip_posts').select('id', { head: true, count: 'exact' }).eq('is_active', true)),
    safeCount(
      adminSupabase
        .from('molastop_ride_requests')
        .select('id', { head: true, count: 'exact' })
        .eq('status', 'pending')
    ),
    safeCount(
      adminSupabase
        .from('molastop_trip_matches')
        .select('id', { head: true, count: 'exact' })
        .eq('status', 'active')
    ),
    safeCount(
      adminSupabase
        .from('molastop_trip_matches')
        .select('id', { head: true, count: 'exact' })
        .eq('status', 'completed')
        .gte('updated_at', dayAgoIso)
    ),
    safeCount(adminSupabase.from('molastop_channels').select('id', { head: true, count: 'exact' }).eq('is_active', true)),
    safeCount(adminSupabase.from('molastop_channel_messages').select('id', { head: true, count: 'exact' }).gte('created_at', dayAgoIso)),
    safeRows<TripPostRow>(
      adminSupabase
        .from('molastop_trip_posts')
        .select('id,owner_id,owner_name,post_type,title,origin_text,destination_text,is_active,created_at,updated_at')
        .order('updated_at', { ascending: false })
        .limit(18)
    ),
    safeRows<RideRequestRow>(
      adminSupabase
        .from('molastop_ride_requests')
        .select('id,post_id,post_owner_id,requester_id,requester_name,status,pickup_text,dropoff_text,created_at,updated_at')
        .order('updated_at', { ascending: false })
        .limit(18)
    ),
    safeRows<MatchRow>(
      adminSupabase
        .from('molastop_trip_matches')
        .select('id,request_id,post_id,driver_id,rider_id,status,created_at,updated_at')
        .order('updated_at', { ascending: false })
        .limit(18)
    ),
    safeRows<ChannelRow>(
      adminSupabase
        .from('molastop_channels')
        .select('id,created_by,name,topic,is_active,created_at,updated_at')
        .order('updated_at', { ascending: false })
        .limit(14)
    ),
    safeRows<ChannelMessageRow>(
      adminSupabase
        .from('molastop_channel_messages')
        .select('id,channel_id,sender_id,sender_name,message,created_at')
        .order('created_at', { ascending: false })
        .limit(22)
    ),
  ])

  const profileIds = Array.from(
    new Set(
      [
        ...posts.map((item) => cleanUuid(item.owner_id)),
        ...requests.map((item) => cleanUuid(item.requester_id)),
        ...requests.map((item) => cleanUuid(item.post_owner_id)),
        ...matches.map((item) => cleanUuid(item.driver_id)),
        ...matches.map((item) => cleanUuid(item.rider_id)),
        ...channels.map((item) => cleanUuid(item.created_by)),
        ...messages.map((item) => cleanUuid(item.sender_id)),
      ].filter((id) => id.length > 0)
    )
  )

  let profileMap: Record<string, ProfileMini> = {}
  if (profileIds.length > 0) {
    const profileRows = await safeRows<ProfileMini>(
      adminSupabase.from('profiles').select('id,full_name,email').in('id', profileIds)
    )

    profileMap = profileRows.reduce<Record<string, ProfileMini>>((acc, row) => {
      acc[row.id] = row
      return acc
    }, {})
  }

  const resolveName = (id: string, fallback?: string | null) => {
    const profile = profileMap[id]
    if (profile?.full_name?.trim()) return profile.full_name.trim()
    if (profile?.email?.trim()) return profile.email.trim()
    if (fallback?.trim()) return fallback.trim()
    return shortId(id)
  }

  return NextResponse.json({
    ok: true,
    fetchedAt: new Date().toISOString(),
    kpis: {
      totalPosts,
      activePosts,
      pendingRequests,
      activeMatches,
      completedMatches24h,
      activeChannels,
      messages24h,
    },
    feeds: {
      posts: posts.map((row) => ({
        ...row,
        owner_name: resolveName(row.owner_id, row.owner_name),
      })),
      requests: requests.map((row) => ({
        ...row,
        requester_name: resolveName(row.requester_id, row.requester_name),
        owner_name: resolveName(row.post_owner_id, null),
      })),
      matches: matches.map((row) => ({
        ...row,
        driver_name: resolveName(row.driver_id, null),
        rider_name: resolveName(row.rider_id, null),
      })),
      channels: channels.map((row) => ({
        ...row,
        creator_name: resolveName(row.created_by, null),
      })),
      messages: messages.map((row) => ({
        ...row,
        sender_name: resolveName(row.sender_id, row.sender_name),
      })),
    },
  })
}

export async function POST(request: Request) {
  const ctx = await resolveAdminContext()
  if (!ctx.ok) return ctx.response

  const { adminSupabase, adminUserId } = ctx

  let body: ActionBody | null = null
  try {
    body = (await request.json()) as ActionBody
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const action = body?.action
  const reason = cleanReason(body?.reason)

  if (!action) {
    return NextResponse.json({ error: 'Eksik işlem tipi.' }, { status: 400 })
  }

  if (action === 'deactivate_post' || action === 'activate_post') {
    const postId = cleanUuid(body?.postId)
    if (!postId) {
      return NextResponse.json({ error: 'Geçersiz postId.' }, { status: 400 })
    }

    const rowRes = await adminSupabase
      .from('molastop_trip_posts')
      .select('id,owner_id,title,is_active')
      .eq('id', postId)
      .maybeSingle()

    if (rowRes.error || !rowRes.data) {
      return NextResponse.json({ error: 'İlan bulunamadı.' }, { status: 404 })
    }

    const row = rowRes.data as { id: string; owner_id: string; title: string | null; is_active: boolean | null }
    const nextActive = action === 'activate_post'

    if ((row.is_active ?? false) === nextActive) {
      return NextResponse.json({ ok: true, unchanged: true })
    }

    const updateRes = await adminSupabase
      .from('molastop_trip_posts')
      .update({ is_active: nextActive })
      .eq('id', postId)
      .select('id,is_active')
      .maybeSingle()

    if (updateRes.error || !updateRes.data) {
      return NextResponse.json({ error: 'İlan durumu güncellenemedi.' }, { status: 500 })
    }

    const subject = nextActive ? 'MolaStop ilanınız tekrar aktifleştirildi' : 'MolaStop ilanınız admin tarafından pasife alındı'
    const content = `${row.title || 'İlan'} • ${nextActive ? 'Aktif' : 'Pasif'}${reason ? `
Sebep: ${reason}` : ''}`

    await sendAdminSignals(adminSupabase, {
      senderId: adminUserId,
      recipientIds: [row.owner_id],
      subject,
      content,
    })

    return NextResponse.json({ ok: true })
  }

  if (action === 'cancel_request' || action === 'reject_request') {
    const requestId = cleanUuid(body?.requestId)
    if (!requestId) {
      return NextResponse.json({ error: 'Geçersiz requestId.' }, { status: 400 })
    }

    const rowRes = await adminSupabase
      .from('molastop_ride_requests')
      .select('id,post_owner_id,requester_id,status,post_id')
      .eq('id', requestId)
      .maybeSingle()

    if (rowRes.error || !rowRes.data) {
      return NextResponse.json({ error: 'İstek bulunamadı.' }, { status: 404 })
    }

    const row = rowRes.data as {
      id: string
      post_owner_id: string
      requester_id: string
      status: string | null
      post_id: string
    }

    if (isFinalRequestStatus(row.status)) {
      return NextResponse.json({ ok: true, unchanged: true })
    }

    const nextStatus = action === 'reject_request' ? 'rejected' : 'cancelled'

    const updateRes = await adminSupabase
      .from('molastop_ride_requests')
      .update({ status: nextStatus })
      .eq('id', requestId)
      .select('id,status')
      .maybeSingle()

    if (updateRes.error || !updateRes.data) {
      return NextResponse.json({ error: 'İstek güncellenemedi.' }, { status: 500 })
    }

    const subject = `MolaStop isteği ${nextStatus === 'cancelled' ? 'iptal edildi' : 'reddedildi'}`
    const content = `İstek ID: ${requestId}${reason ? `
Sebep: ${reason}` : ''}`

    await sendAdminSignals(adminSupabase, {
      senderId: adminUserId,
      recipientIds: [row.requester_id, row.post_owner_id],
      subject,
      content,
    })

    return NextResponse.json({ ok: true })
  }

  if (action === 'cancel_match' || action === 'complete_match') {
    const matchId = cleanUuid(body?.matchId)
    if (!matchId) {
      return NextResponse.json({ error: 'Geçersiz matchId.' }, { status: 400 })
    }

    const rowRes = await adminSupabase
      .from('molastop_trip_matches')
      .select('id,driver_id,rider_id,status,request_id')
      .eq('id', matchId)
      .maybeSingle()

    if (rowRes.error || !rowRes.data) {
      return NextResponse.json({ error: 'Eşleşme bulunamadı.' }, { status: 404 })
    }

    const row = rowRes.data as {
      id: string
      driver_id: string
      rider_id: string
      status: string | null
      request_id: string
    }

    const nextStatus = action === 'complete_match' ? 'completed' : 'cancelled'

    if (normalizeText(row.status || '') === normalizeText(nextStatus)) {
      return NextResponse.json({ ok: true, unchanged: true })
    }

    const updateRes = await adminSupabase
      .from('molastop_trip_matches')
      .update({ status: nextStatus })
      .eq('id', matchId)
      .select('id,status')
      .maybeSingle()

    if (updateRes.error || !updateRes.data) {
      return NextResponse.json({ error: 'Eşleşme güncellenemedi.' }, { status: 500 })
    }

    const relatedRequestStatus = nextStatus === 'completed' ? 'completed' : 'cancelled'
    await adminSupabase
      .from('molastop_ride_requests')
      .update({ status: relatedRequestStatus })
      .eq('id', row.request_id)

    const subject =
      nextStatus === 'completed'
        ? 'MolaStop yolculuğu admin tarafından tamamlandı'
        : 'MolaStop yolculuğu admin tarafından sonlandırıldı'
    const content = `Eşleşme ID: ${matchId}${reason ? `
Sebep: ${reason}` : ''}`

    await sendAdminSignals(adminSupabase, {
      senderId: adminUserId,
      recipientIds: [row.driver_id, row.rider_id],
      subject,
      content,
    })

    return NextResponse.json({ ok: true })
  }

  if (action === 'deactivate_channel' || action === 'activate_channel') {
    const channelId = cleanUuid(body?.channelId)
    if (!channelId) {
      return NextResponse.json({ error: 'Geçersiz channelId.' }, { status: 400 })
    }

    const rowRes = await adminSupabase
      .from('molastop_channels')
      .select('id,name,created_by,is_active')
      .eq('id', channelId)
      .maybeSingle()

    if (rowRes.error || !rowRes.data) {
      return NextResponse.json({ error: 'Kanal bulunamadı.' }, { status: 404 })
    }

    const row = rowRes.data as { id: string; name: string | null; created_by: string; is_active: boolean | null }
    const nextActive = action === 'activate_channel'

    if ((row.is_active ?? false) === nextActive) {
      return NextResponse.json({ ok: true, unchanged: true })
    }

    const updateRes = await adminSupabase
      .from('molastop_channels')
      .update({ is_active: nextActive })
      .eq('id', channelId)
      .select('id,is_active')
      .maybeSingle()

    if (updateRes.error || !updateRes.data) {
      return NextResponse.json({ error: 'Kanal durumu güncellenemedi.' }, { status: 500 })
    }

    const subject = nextActive ? 'MolaStop kanalınız tekrar açıldı' : 'MolaStop kanalınız admin tarafından donduruldu'
    const content = `${row.name || 'Kanal'}${reason ? `
Sebep: ${reason}` : ''}`

    await sendAdminSignals(adminSupabase, {
      senderId: adminUserId,
      recipientIds: [row.created_by],
      subject,
      content,
    })

    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_channel_message') {
    const rawMessageId = body?.messageId
    const messageId = typeof rawMessageId === 'number' ? rawMessageId : Number(rawMessageId)
    if (!Number.isFinite(messageId)) {
      return NextResponse.json({ error: 'Geçersiz messageId.' }, { status: 400 })
    }

    const rowRes = await adminSupabase
      .from('molastop_channel_messages')
      .select('id,sender_id,channel_id')
      .eq('id', messageId)
      .maybeSingle()

    if (rowRes.error || !rowRes.data) {
      return NextResponse.json({ error: 'Mesaj bulunamadı.' }, { status: 404 })
    }

    const row = rowRes.data as { id: number; sender_id: string; channel_id: string }

    const deleteRes = await adminSupabase.from('molastop_channel_messages').delete().eq('id', messageId)

    if (deleteRes.error) {
      return NextResponse.json({ error: 'Mesaj silinemedi.' }, { status: 500 })
    }

    const subject = 'MolaStop kanal mesajınız kaldırıldı'
    const content = `Mesaj ID: ${messageId} • Kanal: ${shortId(row.channel_id)}${reason ? `
Sebep: ${reason}` : ''}`

    await sendAdminSignals(adminSupabase, {
      senderId: adminUserId,
      recipientIds: [row.sender_id],
      subject,
      content,
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Desteklenmeyen işlem tipi.' }, { status: 400 })
}
