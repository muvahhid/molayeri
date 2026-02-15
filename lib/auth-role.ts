import type { SupabaseClient } from '@supabase/supabase-js'

export type ProfileRole = 'admin' | 'isletmeci' | 'pending_business' | 'user' | string

const MERCHANT_ROLE_SET = new Set(['isletmeci', 'pending_business'])

export function normalizeRole(role: string | null | undefined): ProfileRole {
  return (role || 'user').toLowerCase()
}

export function isAdminRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === 'admin'
}

export function isMerchantRole(role: string | null | undefined): boolean {
  return MERCHANT_ROLE_SET.has(normalizeRole(role))
}

export function getDashboardPathForRole(role: string | null | undefined): string {
  const normalized = normalizeRole(role)

  if (normalized === 'admin') {
    return '/admin/dashboard'
  }

  if (isMerchantRole(normalized)) {
    return '/merchant/dashboard'
  }

  return '/'
}

export async function fetchUserRoleById(
  supabase: SupabaseClient,
  userId: string,
  fallbackRole?: string | null
): Promise<ProfileRole> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    return normalizeRole((data as { role?: string | null } | null)?.role || fallbackRole)
  } catch {
    return normalizeRole(fallbackRole)
  }
}
