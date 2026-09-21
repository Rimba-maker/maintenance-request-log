// Development only: runs the API on an in-memory PostgreSQL (PGlite), so no Docker or
// Postgres install is needed. Data is lost on restart. Never used in production.
import { serve } from '@hono/node-server'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { fileURLToPath } from 'node:url'
import { createApp } from '../src/app.js'
import * as schema from '../src/db/schema.js'
import { seed } from '../src/seed.js'

const db = drizzle(new PGlite(), { schema })
await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) })
await seed(db)

const app = createApp({ db, jwtSecret: 'dev-only-secret-dev-only-secret-1234', cookieSecure: false })

serve({ fetch: app.fetch, port: 3000 }, ({ port }) => console.log(`API (in-memory DB) on http://localhost:${port}`))
