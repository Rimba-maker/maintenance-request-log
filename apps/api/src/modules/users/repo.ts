import { eq } from 'drizzle-orm'
import type { Db } from '../../db/client.js'
import { users } from '../../db/schema.js'

export type UserRecord = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export const createUsersRepo = (db: Db) => ({
  async findById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    return user
  },

  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    return user
  },

  list() {
    return db.select().from(users).orderBy(users.createdAt)
  },

  async insert(values: NewUser) {
    const [user] = await db.insert(users).values(values).returning()
    return user!
  },

  async update(id: string, patch: Partial<NewUser>) {
    const [user] = await db.update(users).set(patch).where(eq(users.id, id)).returning()
    return user
  },
})

export type UsersRepo = ReturnType<typeof createUsersRepo>
