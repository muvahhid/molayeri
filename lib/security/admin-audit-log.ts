import type { SupabaseClient } from '@supabase/supabase-js'

type AuditMeta = {
  ip: string
  userAgent: string | null
}

type AdminAuditInput = {
  actorId?: string | null
  scope: string
  action: string
  targetId?: string | null
  targetTable?: string | null
  metadata?: Record<string, unknown> | null
  ip?: string | null
  userAgent?: string | null
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

function isMissingAuditTableError(error: { code?: string | null; message?: string | null } | null): boolean {
  if (!error) return false
  if (error.code === '42P01' || error.code === '42703') return true
  const message = (error.message || '').toLowerCase()
  return message.includes('admin_audit_logs') && (message.includes('does not exist') || message.includes('column'))
}

export function requestAuditMeta(request: Request): AuditMeta {
  return {
    ip: getRequestIp(request),
    userAgent: request.headers.get('user-agent')?.slice(0, 512) || null,
  }
}

export async function writeAdminAuditLog(adminSupabase: SupabaseClient, input: AdminAuditInput): Promise<void> {
  const payload = {
    actor_id: input.actorId || null,
    scope: input.scope,
    action: input.action,
    target_id: input.targetId || null,
    target_table: input.targetTable || null,
    metadata: input.metadata || {},
    ip: input.ip || null,
    user_agent: input.userAgent || null,
  }

  try {
    const { error } = await adminSupabase.from('admin_audit_logs').insert(payload)
    if (isMissingAuditTableError(error)) {
      return
    }
  } catch {
    // no-op: audit log should never block admin actions
  }
}
