import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { fileURLToPath } from 'node:url'
import { createApp } from '../src/app.js'
import * as schema from '../src/db/schema.js'
import type { Role } from '../src/domain/types.js'
import { SEED_USERS, seed } from '../src/seed.js'

/** A real app on an in-memory Postgres, migrated and seeded exactly like production. */
export async function createTestApp() {
  const db = drizzle(new PGlite(), { schema })
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) })
  await seed(db)

  const app = createApp({ db, jwtSecret: 'test-secret-test-secret-test-secret-1234', cookieSecure: false })

  /** Calls the API in-process, optionally with a session cookie. */
  const client = (cookie = '') => {
    const send = (method: string, path: string, body?: unknown) =>
      app.request(`/api${path}`, {
        method,
        headers: { ...(body !== undefined && { 'content-type': 'application/json' }), ...(cookie && { cookie }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    return {
      get: (path: string) => send('GET', path),
      post: (path: string, body?: unknown) => send('POST', path, body),
      patch: (path: string, body: unknown) => send('PATCH', path, body),
      delete: (path: string) => send('DELETE', path),
    }
  }

  /** Logs in and returns a client that carries the session cookie. */
  const loginAs = async (email: string, password: string) => {
    const res = await client().post('/auth/login', { email, password })
    const cookie = res.headers.get('set-cookie')?.split(';')[0] ?? ''
    return { res, cookie, api: client(cookie) }
  }

  /** Shortcut: log in as the seeded user of a role. */
  const as = async (role: Role) => {
    const user = SEED_USERS.find((u) => u.role === role)!
    return (await loginAs(user.email, user.password)).api
  }

  return { db, client, loginAs, as }
}

export const validRequest = { machineId: 'TEST-01', description: 'Something is wrong', priority: 'medium' }
