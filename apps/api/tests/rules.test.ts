import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { users } from '../src/db/schema.js'
import { createTestApp, validRequest } from './helpers.js'

// Behaviour beyond the permission matrix: auth, validation, the audit trail and the Q-decisions.

type T = Awaited<ReturnType<typeof createTestApp>>
type Body = Record<string, any>

let t: T
let admin: Awaited<ReturnType<T['as']>>
let supervisor: typeof admin
let operator: typeof admin

beforeAll(async () => {
  t = await createTestApp()
  ;[admin, supervisor, operator] = await Promise.all([t.as('admin'), t.as('supervisor'), t.as('operator')])
})

describe('authentication', () => {
  it('login sets an httpOnly session cookie and never returns the password hash', async () => {
    const { res } = await t.loginAs('operator@example.com', 'Operator123!')
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toMatch(/HttpOnly/i)
    expect(JSON.stringify(await res.json())).not.toContain('passwordHash')
  })

  it('wrong password and unknown email give the same 401', async () => {
    const wrongPassword = await t.loginAs('operator@example.com', 'nope')
    const unknownEmail = await t.loginAs('nobody@example.com', 'nope')
    expect(wrongPassword.res.status).toBe(401)
    expect(unknownEmail.res.status).toBe(401)
    expect(await wrongPassword.res.json()).toEqual(await unknownEmail.res.json())
  })

  it('logout clears the cookie', async () => {
    const res = await operator.post('/auth/logout')
    expect(res.status).toBe(204)
    expect(res.headers.get('set-cookie')).toMatch(/Max-Age=0/i)
  })

  it('/auth/me returns the current user', async () => {
    const body: Body = await (await operator.get('/auth/me')).json()
    expect(body.user.email).toBe('operator@example.com')
  })

  it('stores passwords hashed, never in plain text', async () => {
    const [row] = await t.db.select().from(users).where(eq(users.email, 'admin@example.com'))
    expect(row!.passwordHash).not.toBe('Admin123!')
    expect(row!.passwordHash).toMatch(/^\$2[aby]\$/)
  })
})

describe('deactivated users (Q-6)', () => {
  it('lose access immediately, including an already-issued session', async () => {
    const created: Body = await (
      await admin.post('/users', { email: 'temp@example.com', password: 'Password123', role: 'operator' })
    ).json()
    const session = await t.loginAs('temp@example.com', 'Password123')
    expect((await session.api.get('/requests')).status).toBe(200)

    await admin.patch(`/users/${created.id}`, { active: false })

    expect((await session.api.get('/requests')).status).toBe(401)
    expect((await t.loginAs('temp@example.com', 'Password123')).res.status).toBe(401)
  })

  it('an admin cannot deactivate themselves or change their own role', async () => {
    const me: Body = (await (await admin.get('/auth/me')).json()) as Body
    expect((await admin.patch(`/users/${me.user.id}`, { active: false })).status).toBe(403)
    expect((await admin.patch(`/users/${me.user.id}`, { role: 'operator' })).status).toBe(403)
  })

  it('rejects a duplicate email', async () => {
    const res = await admin.post('/users', { email: 'ADMIN@example.com', password: 'Password123', role: 'admin' })
    expect(res.status).toBe(409)
  })
})

describe('validation (400)', () => {
  it.each([
    ['missing machineId', { description: 'x' }],
    ['blank description', { machineId: 'A', description: '   ' }],
    ['unknown priority', { ...validRequest, priority: 'urgent' }],
  ])('create request: %s', async (_name, body) => {
    const res = await operator.post('/requests', body)
    expect(res.status).toBe(400)
    expect(((await res.json()) as Body).error.details.length).toBeGreaterThan(0)
  })

  it('reports field errors in plain language, keyed by field name', async () => {
    const res = await operator.post('/requests', { machineId: 'A', description: '  ' })
    const { error } = (await res.json()) as Body
    expect(error.details).toEqual([{ path: 'description', message: 'Describe the problem' }])
  })

  it('edit rejects status, reviewer fields and empty bodies', async () => {
    const r: Body = await (await operator.post('/requests', validRequest)).json()
    expect((await operator.patch(`/requests/${r.id}`, { status: 'approved' })).status).toBe(400)
    expect((await operator.patch(`/requests/${r.id}`, { reviewedBy: r.createdBy })).status).toBe(400)
    expect((await operator.patch(`/requests/${r.id}`, {})).status).toBe(400)
  })

  it('rejects a malformed id and an invalid email', async () => {
    expect((await operator.get('/requests/not-a-uuid')).status).toBe(400)
    const bad = await admin.post('/users', { email: 'not-an-email', password: 'Password123', role: 'operator' })
    expect(bad.status).toBe(400)
  })
})

describe('list filters', () => {
  it('filters by status and by priority', async () => {
    const approved: Body[] = await (await supervisor.get('/requests?status=approved')).json()
    expect(approved.length).toBeGreaterThan(0)
    expect(approved.every((r) => r.status === 'approved')).toBe(true)

    const high: Body[] = await (await supervisor.get('/requests?priority=high')).json()
    expect(high.length).toBeGreaterThan(0)
    expect(high.every((r) => r.priority === 'high')).toBe(true)

    expect((await supervisor.get('/requests?status=bogus')).status).toBe(400)
  })
})

describe('request detail abilities', () => {
  it('tells the UI what the current user may do', async () => {
    const r: Body = await (await operator.post('/requests', validRequest)).json()
    const abilities = async (api: typeof admin) => ((await (await api.get(`/requests/${r.id}`)).json()) as Body).can

    expect(await abilities(operator)).toEqual({ edit: true, review: false, delete: false })
    expect(await abilities(supervisor)).toEqual({ edit: false, review: true, delete: false })
    expect(await abilities(admin)).toEqual({ edit: true, review: true, delete: true })
  })
})

describe('audit trail', () => {
  it('records the creation and every review with who and when', async () => {
    const r: Body = await (await operator.post('/requests', validRequest)).json()
    await supervisor.post(`/requests/${r.id}/review`, { decision: 'approved' })
    await admin.post(`/requests/${r.id}/review`, { decision: 'rejected' })

    const detail: Body = await (await operator.get(`/requests/${r.id}`)).json()
    expect(detail.history.map((h: Body) => [h.fromStatus, h.toStatus, h.changedByEmail])).toEqual([
      [null, 'submitted', 'operator@example.com'],
      ['submitted', 'approved', 'supervisor@example.com'],
      ['approved', 'rejected', 'admin@example.com'],
    ])
  })
})
