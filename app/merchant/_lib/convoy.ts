import type { SupabaseClient } from '@supabase/supabase-js'

export type ConvoyHeadcountStats = {
  max_headcount: number
  leader_party_size: number
  confirmed_headcount: number
  pending_headcount: number
  available_headcount: number
}

function safeInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value)
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed)
    }
  }

  return fallback
}

function normalizeHeadcountRow(row: Record<string, unknown>): ConvoyHeadcountStats {
  const maxHeadcount = Math.max(1, safeInt(row.max_headcount, 1))
  const leaderPartySize = Math.max(1, safeInt(row.leader_party_size, 1))
  const confirmedHeadcount = Math.max(leaderPartySize, safeInt(row.confirmed_headcount, leaderPartySize))
  const pendingHeadcount = Math.max(0, safeInt(row.pending_headcount, 0))
  const availableHeadcount = Math.max(
    0,
    safeInt(row.available_headcount, maxHeadcount - confirmedHeadcount)
  )

  return {
    max_headcount: maxHeadcount,
    leader_party_size: leaderPartySize,
    confirmed_headcount: confirmedHeadcount,
    pending_headcount: pendingHeadcount,
    available_headcount: availableHeadcount,
  }
}

async function getConvoyHeadcountStatsFallback(
  supabase: SupabaseClient,
  convoyId: string
): Promise<ConvoyHeadcountStats> {
  let convoyRow: Record<string, unknown> | null = null

  try {
    const { data } = await supabase
      .from('convoys')
      .select('max_headcount, max_vehicles, leader_party_size')
      .eq('id', convoyId)
      .maybeSingle()
    convoyRow = (data as Record<string, unknown> | null) || null
  } catch {
    const { data } = await supabase
      .from('convoys')
      .select('max_vehicles')
      .eq('id', convoyId)
      .maybeSingle()
    convoyRow = (data as Record<string, unknown> | null) || null
  }

  if (!convoyRow) {
    return {
      max_headcount: 1,
      leader_party_size: 1,
      confirmed_headcount: 1,
      pending_headcount: 0,
      available_headcount: 0,
    }
  }

  const { data: memberRows } = await supabase
    .from('convoy_members')
    .select('status, role, party_size')
    .eq('convoy_id', convoyId)

  const rows = (memberRows || []) as Record<string, unknown>[]

  const leaderPartySize = Math.max(1, safeInt(convoyRow.leader_party_size, 1))
  const maxHeadcount = Math.max(
    leaderPartySize,
    safeInt(convoyRow.max_headcount ?? convoyRow.max_vehicles, leaderPartySize)
  )

  const confirmedMembers = rows
    .filter((row) => {
      const role = String(row.role || 'member')
      const status = String(row.status || '')
      return role !== 'leader' && ['active', 'accepted_waiting_confirmation'].includes(status)
    })
    .reduce((sum, row) => sum + Math.max(1, safeInt(row.party_size, 1)), 0)

  const pendingMembers = rows
    .filter((row) => {
      const role = String(row.role || 'member')
      const status = String(row.status || '')
      return role !== 'leader' && status === 'pending'
    })
    .reduce((sum, row) => sum + Math.max(1, safeInt(row.party_size, 1)), 0)

  const confirmedHeadcount = leaderPartySize + confirmedMembers

  return {
    max_headcount: maxHeadcount,
    leader_party_size: leaderPartySize,
    confirmed_headcount: confirmedHeadcount,
    pending_headcount: pendingMembers,
    available_headcount: Math.max(0, maxHeadcount - confirmedHeadcount),
  }
}

export async function getConvoyHeadcountBulk(
  supabase: SupabaseClient,
  convoyIds: string[]
): Promise<Record<string, ConvoyHeadcountStats>> {
  const ids = Array.from(new Set(convoyIds.map((id) => id.trim()).filter(Boolean)))

  if (ids.length === 0) {
    return {}
  }

  try {
    const { data } = await supabase.rpc('get_convoy_headcount_bulk_v1', {
      p_convoy_ids: ids,
    })

    const rows = Array.isArray(data)
      ? (data as Record<string, unknown>[])
      : data && typeof data === 'object'
        ? [data as Record<string, unknown>]
        : []

    if (rows.length > 0) {
      const mapped: Record<string, ConvoyHeadcountStats> = {}

      for (const row of rows) {
        const convoyId = String(row.convoy_id || '')
        if (!convoyId) {
          continue
        }
        mapped[convoyId] = normalizeHeadcountRow(row)
      }

      return mapped
    }
  } catch {
    // fall back below
  }

  const fallback: Record<string, ConvoyHeadcountStats> = {}
  for (const convoyId of ids) {
    fallback[convoyId] = await getConvoyHeadcountStatsFallback(supabase, convoyId)
  }

  return fallback
}

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'))
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

export function distanceKmBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earthRadiusKm = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusKm * c
}
