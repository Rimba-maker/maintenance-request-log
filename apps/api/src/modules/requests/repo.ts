import { and, desc, eq, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Db } from '../../db/client.js'
import { requests, requestStatusHistory, users } from '../../db/schema.js'
import type { Priority, Status } from '../../domain/types.js'

/** A request as read by the API, with creator/reviewer emails resolved. */
export interface RequestView {
  id: string
  machineId: string
  description: string
  priority: Priority
  status: Status
  createdBy: string
  createdByEmail: string
  createdAt: Date
  reviewedBy: string | null
  reviewedByEmail: string | null
  reviewedAt: Date | null
}

export interface HistoryEntry {
  fromStatus: Status | null
  toStatus: Status
  changedByEmail: string
  changedAt: Date
}

export interface RequestFilter {
  createdBy?: string
  status?: Status
  priority?: Priority
}

const creator = alias(users, 'creator')
const reviewer = alias(users, 'reviewer')

export const createRequestsRepo = (db: Db) => {
  const selectViews = () =>
    db
      .select({
        id: requests.id,
        machineId: requests.machineId,
        description: requests.description,
        priority: requests.priority,
        status: requests.status,
        createdBy: requests.createdBy,
        createdByEmail: creator.email,
        createdAt: requests.createdAt,
        reviewedBy: requests.reviewedBy,
        reviewedByEmail: reviewer.email,
        reviewedAt: requests.reviewedAt,
      })
      .from(requests)
      .innerJoin(creator, eq(creator.id, requests.createdBy))
      .leftJoin(reviewer, eq(reviewer.id, requests.reviewedBy))

  return {
    list(filter: RequestFilter): Promise<RequestView[]> {
      return selectViews()
        .where(
          and(
            filter.createdBy ? eq(requests.createdBy, filter.createdBy) : undefined,
            filter.status ? eq(requests.status, filter.status) : undefined,
            filter.priority ? eq(requests.priority, filter.priority) : undefined,
          ),
        )
        .orderBy(desc(requests.createdAt))
    },

    async findById(id: string): Promise<RequestView | undefined> {
      const [row] = await selectViews().where(eq(requests.id, id)).limit(1)
      return row
    },

    async history(requestId: string): Promise<HistoryEntry[]> {
      return db
        .select({
          fromStatus: requestStatusHistory.fromStatus,
          toStatus: requestStatusHistory.toStatus,
          changedByEmail: users.email,
          changedAt: requestStatusHistory.changedAt,
        })
        .from(requestStatusHistory)
        .innerJoin(users, eq(users.id, requestStatusHistory.changedBy))
        .where(eq(requestStatusHistory.requestId, requestId))
        .orderBy(requestStatusHistory.changedAt)
    },

    /** Inserts the request and its first history entry atomically. Returns the new id. */
    create(input: { machineId: string; description: string; priority: Priority; createdBy: string }) {
      return db.transaction(async (tx) => {
        const [row] = await tx.insert(requests).values(input).returning({ id: requests.id })
        await tx
          .insert(requestStatusHistory)
          .values({ requestId: row!.id, fromStatus: null, toStatus: 'submitted', changedBy: input.createdBy })
        return row!.id
      })
    },

    async update(id: string, patch: { machineId?: string; description?: string; priority?: Priority }) {
      await db.update(requests).set(patch).where(eq(requests.id, id))
    },

    /** Sets the new status, the reviewer fields and a history entry atomically. */
    review(id: string, change: { from: Status; to: Status; reviewedBy: string }) {
      return db.transaction(async (tx) => {
        await tx
          .update(requests)
          .set({ status: change.to, reviewedBy: change.reviewedBy, reviewedAt: sql`now()` })
          .where(eq(requests.id, id))
        await tx.insert(requestStatusHistory).values({
          requestId: id,
          fromStatus: change.from,
          toStatus: change.to,
          changedBy: change.reviewedBy,
        })
      })
    },

    /** History rows are removed by ON DELETE CASCADE (Q-7). */
    async remove(id: string) {
      await db.delete(requests).where(eq(requests.id, id))
    },
  }
}

export type RequestsRepo = ReturnType<typeof createRequestsRepo>
