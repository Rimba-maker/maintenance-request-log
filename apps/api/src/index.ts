import { serve } from '@hono/node-server'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import { createApp } from './app.js'
import { loadEnv } from './config/env.js'
import * as schema from './db/schema.js'
import { seed } from './seed.js'

const env = loadEnv()

const db = drizzle(new Pool({ connectionString: env.DATABASE_URL }), { schema })

// Runs on every start so `docker compose up` needs no manual database step.
await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) })
await seed(db)

const app = createApp({ db, jwtSecret: env.JWT_SECRET, cookieSecure: env.COOKIE_SECURE })

serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => console.log(`API listening on :${port}`))
