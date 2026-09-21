import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { PRIORITIES, ROLES, STATUSES } from '../domain/types.js'

export const roleEnum = pgEnum('role', ROLES)
export const priorityEnum = pgEnum('priority', PRIORITIES)
export const statusEnum = pgEnum('request_status', STATUSES)

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  passwordHash: text().notNull(),
  role: roleEnum().notNull(),
  active: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const requests = pgTable('requests', {
  id: uuid().primaryKey().defaultRandom(),
  machineId: text().notNull(),
  description: text().notNull(),
  priority: priorityEnum().notNull().default('medium'),
  status: statusEnum().notNull().default('submitted'),
  createdBy: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  reviewedBy: uuid().references(() => users.id, { onDelete: 'restrict' }),
  reviewedAt: timestamp({ withTimezone: true }),
})

/** Audit trail: one row per status change, including the initial "submitted". */
export const requestStatusHistory = pgTable('request_status_history', {
  id: uuid().primaryKey().defaultRandom(),
  requestId: uuid()
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),
  fromStatus: statusEnum(),
  toStatus: statusEnum().notNull(),
  changedBy: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  changedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})
