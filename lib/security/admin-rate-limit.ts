type RateLimitResult = {
  ok: boolean
  retryAfter: number
}

type DistributedRateLimitInput = {
  namespace: string
  windowMs: number
  maxRequests: number
}

type RedisPipelineResult = {
  result?: unknown
  error?: string
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

function sanitizeNumber(input: unknown, fallback: number): number {
  const value = typeof input === 'number' ? input : Number(input)
  if (!Number.isFinite(value)) return fallback
  return Math.max(0, value)
}

function parsePipelineResult(payload: unknown): RedisPipelineResult[] {
  if (!Array.isArray(payload)) return []
  return payload.map((item) => {
    if (item && typeof item === 'object') {
      return item as RedisPipelineResult
    }
    return { result: item }
  })
}

export async function checkDistributedAdminRateLimit(
  request: Request,
  input: DistributedRateLimitInput
): Promise<RateLimitResult | null> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()

  if (!redisUrl || !redisToken) {
    return null
  }

  try {
    const path = new URL(request.url).pathname
    const ip = getRequestIp(request)
    const key = `rl:${input.namespace}:${path}:${ip}`

    const response = await fetch(`${redisUrl.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['PEXPIRE', key, input.windowMs, 'NX'],
        ['PTTL', key],
      ]),
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const raw = await response.json().catch(() => null)
    const results = parsePipelineResult(raw)
    const count = sanitizeNumber(results[0]?.result, 0)
    const ttlMs = sanitizeNumber(results[2]?.result, input.windowMs)

    if (count <= 0) {
      return null
    }

    if (count > input.maxRequests) {
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil(ttlMs / 1000)),
      }
    }

    return { ok: true, retryAfter: 0 }
  } catch {
    return null
  }
}
