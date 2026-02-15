import type { SupabaseClient } from '@supabase/supabase-js'
import type { MerchantBusiness } from './helpers'

export async function requireCurrentUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id || null
}

export async function fetchOwnedBusinesses(
  supabase: SupabaseClient,
  ownerId: string
): Promise<MerchantBusiness[]> {
  const { data } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  return ((data || []) as MerchantBusiness[]).map((business) => ({
    ...business,
    is_open: business.is_open ?? true,
  }))
}

export async function fetchBusinessCategoryNames(
  supabase: SupabaseClient,
  businessId: string
): Promise<string[]> {
  const { data: relRows } = await supabase
    .from('business_categories')
    .select('category_id')
    .eq('business_id', businessId)

  const categoryIds = (relRows || [])
    .map((row) => (row as { category_id?: string | null }).category_id)
    .filter((id): id is string => Boolean(id))

  if (categoryIds.length === 0) {
    return []
  }

  const { data: categoryRows } = await supabase
    .from('categories')
    .select('name')
    .in('id', categoryIds)

  return (categoryRows || [])
    .map((row) => (row as { name?: string | null }).name)
    .filter((name): name is string => Boolean(name))
}
