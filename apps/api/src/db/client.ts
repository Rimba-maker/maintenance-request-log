import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import type * as schema from './schema.js'

/**
 * Driver-agnostic database type: node-postgres in production,
 * PGlite (in-memory Postgres) in tests.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>
