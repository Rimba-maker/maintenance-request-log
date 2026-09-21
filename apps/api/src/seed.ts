import type { Db } from './db/client.js'
import { requests, requestStatusHistory, users } from './db/schema.js'
import type { Priority, Role } from './domain/types.js'
import { hashPassword } from './modules/auth/password.js'

/** Demo accounts, one per role. Documented in the README. */
export const SEED_USERS: ReadonlyArray<{ email: string; password: string; role: Role }> = [
  { email: 'admin@example.com', password: 'Admin123!', role: 'admin' },
  { email: 'supervisor@example.com', password: 'Supervisor123!', role: 'supervisor' },
  { email: 'operator@example.com', password: 'Operator123!', role: 'operator' },
]

interface SeedRequest {
  by: Role
  machineId: string
  description: string
  priority: Priority
  outcome?: 'approved' | 'rejected'
}

const SEED_REQUESTS: SeedRequest[] = [
  { by: 'operator', machineId: 'CNC-01', description: 'Spindle vibrates loudly during cutting', priority: 'high' },
  { by: 'operator', machineId: 'PRESS-03', description: 'Hydraulic oil leaking near the base', priority: 'medium' },
  { by: 'operator', machineId: 'CONV-07', description: 'Belt slips under load', priority: 'low', outcome: 'approved' },
  { by: 'operator', machineId: 'WELD-02', description: 'Wire feeder jams intermittently', priority: 'medium', outcome: 'rejected' },
  { by: 'supervisor', machineId: 'LATHE-04', description: 'Coolant pump does not prime', priority: 'high' },
]

/** Inserts demo users and requests. Does nothing if any user already exists. */
export async function seed(db: Db) {
  const [existing] = await db.select({ id: users.id }).from(users).limit(1)
  if (existing) return

  const rows = await Promise.all(
    SEED_USERS.map(async ({ password, ...user }) => ({ ...user, passwordHash: await hashPassword(password) })),
  )
  const created = await db.insert(users).values(rows).returning({ id: users.id, role: users.role })
  const idOf = (role: Role) => created.find((u) => u.role === role)!.id
  const reviewer = idOf('supervisor')

  for (const r of SEED_REQUESTS) {
    const reviewed = r.outcome ? { status: r.outcome, reviewedBy: reviewer, reviewedAt: new Date() } : {}
    const [request] = await db
      .insert(requests)
      .values({
        machineId: r.machineId,
        description: r.description,
        priority: r.priority,
        createdBy: idOf(r.by),
        ...reviewed,
      })
      .returning({ id: requests.id })

    await db.insert(requestStatusHistory).values({
      requestId: request!.id,
      fromStatus: null,
      toStatus: 'submitted',
      changedBy: idOf(r.by),
    })
    if (r.outcome) {
      await db.insert(requestStatusHistory).values({
        requestId: request!.id,
        fromStatus: 'submitted',
        toStatus: r.outcome,
        changedBy: reviewer,
      })
    }
  }
}
