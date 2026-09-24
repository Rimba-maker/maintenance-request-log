import type { MiddlewareHandler } from 'hono'
import { tooManyRequests } from '../../shared/errors.js'

const WINDOW_MS = 5 * 60_000
const MAX_ATTEMPTS = 20
const SWEEP_ABOVE = 5000

// ponytail: single in-memory Map, fine for one instance; move to Redis if the API ever scales horizontally.
const hits = new Map<string, { count: number; resetAt: number }>()

// nginx's $proxy_add_x_forwarded_for APPENDS to whatever the client sent, it never overwrites — so the
// last entry is the one nginx itself added (the real peer), everything before it is client-controlled
// and spoofable. The api container is unreachable except through nginx (no `ports:` on it), so that last
// hop can be trusted; picking the first entry instead would let an attacker bypass the limiter entirely.
const clientIp = (xff: string | undefined) => {
  const hops = xff?.split(',').map((s) => s.trim()).filter(Boolean)
  return hops?.at(-1) ?? 'unknown'
}

// Only ever grows from expired entries once traffic is steady; sweep them out past a size threshold so a
// flood of distinct real IPs (the one growth path an attacker can't spoof away) can't grow this forever.
const sweep = (now: number) => {
  if (hits.size < SWEEP_ABOVE) return
  for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key)
}

/** Sliding-window limiter keyed by client IP (set by nginx as X-Forwarded-For). Meant for /auth/login only. */
export const loginRateLimit: MiddlewareHandler = async (c, next) => {
  const key = clientIp(c.req.header('x-forwarded-for'))
  const now = Date.now()
  sweep(now)
  const entry = hits.get(key)

  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return next()
  }
  if (entry.count >= MAX_ATTEMPTS) {
    c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
    throw tooManyRequests('Too many login attempts, try again later')
  }
  entry.count += 1
  return next()
}
