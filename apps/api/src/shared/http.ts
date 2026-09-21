import type { Actor } from '../domain/types.js'

/** Hono environment: what auth middleware puts on the request context. */
export type AppEnv = { Variables: { actor: Actor } }
