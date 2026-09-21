import { beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, validRequest } from './helpers.js'

// One test group per row of the permission matrix (P-1 to P-8), calling the API directly.

type Api = Awaited<ReturnType<typeof createTestApp>>['client'] extends (...a: never[]) => infer R ? R : never
type Body = Record<string, any>

let admin: Api, supervisor: Api, operator: Api, anonymous: Api
const ROLES = ['operator', 'supervisor', 'admin'] as const

beforeAll(async () => {
  const t = await createTestApp()
  ;[admin, supervisor, operator] = await Promise.all([t.as('admin'), t.as('supervisor'), t.as('operator')])
  anonymous = t.client()
})

const byRole = () => ({ operator, supervisor, admin })
const createAs = async (api: Api): Promise<Body> => (await api.post('/requests', validRequest)).json()

describe('unauthenticated', () => {
  it.each([
    ['GET', '/requests'],
    ['POST', '/requests'],
    ['GET', '/users'],
    ['POST', '/users'],
  ])('%s %s returns 401', async (method, path) => {
    const res = await anonymous[method === 'GET' ? 'get' : 'post'](path)
    expect(res.status).toBe(401)
  })
})

describe('P-1 create a request', () => {
  it.each(ROLES)('%s can create, and it starts as submitted', async (role) => {
    const res = await byRole()[role].post('/requests', { ...validRequest, status: 'approved' })
    const body: Body = await res.json()
    expect(res.status).toBe(201)
    expect(body.status).toBe('submitted')
    expect(body.createdByEmail).toBe(`${role}@example.com`)
  })
})

describe('P-2 / P-3 view requests', () => {
  it('operator lists only their own requests', async () => {
    await createAs(supervisor)
    const list: Body[] = await (await operator.get('/requests')).json()
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((r) => r.createdByEmail === 'operator@example.com')).toBe(true)
  })

  it.each(['supervisor', 'admin'] as const)('%s lists requests from every user', async (role) => {
    const list: Body[] = await (await byRole()[role].get('/requests')).json()
    const creators = new Set(list.map((r) => r.createdByEmail))
    expect(creators).toContain('operator@example.com')
    expect(creators).toContain('supervisor@example.com')
  })

  it('operator can open their own request but gets 404 for someone else’s', async () => {
    const own = await createAs(operator)
    const others = await createAs(supervisor)
    expect((await operator.get(`/requests/${own.id}`)).status).toBe(200)
    expect((await operator.get(`/requests/${others.id}`)).status).toBe(404)
  })

  it('supervisor can open an operator’s request', async () => {
    const r = await createAs(operator)
    expect((await supervisor.get(`/requests/${r.id}`)).status).toBe(200)
  })
})

describe('P-4 edit own request while Submitted', () => {
  it.each(ROLES)('%s can edit their own submitted request', async (role) => {
    const r = await createAs(byRole()[role])
    const res = await byRole()[role].patch(`/requests/${r.id}`, { description: 'Updated text' })
    expect(res.status).toBe(200)
    expect((await res.json() as Body).description).toBe('Updated text')
  })

  it('operator cannot edit their own request once it has been reviewed', async () => {
    const r = await createAs(operator)
    await supervisor.post(`/requests/${r.id}/review`, { decision: 'approved' })
    expect((await operator.patch(`/requests/${r.id}`, { description: 'Sneaky edit' })).status).toBe(403)
  })

  it('operator cannot edit someone else’s request (404)', async () => {
    const r = await createAs(supervisor)
    expect((await operator.patch(`/requests/${r.id}`, { description: 'x' })).status).toBe(404)
  })
})

describe('P-5 edit any request', () => {
  it('supervisor cannot edit an operator’s request', async () => {
    const r = await createAs(operator)
    expect((await supervisor.patch(`/requests/${r.id}`, { description: 'x' })).status).toBe(403)
  })

  it('admin can edit any request, even a reviewed one, without changing its creator or status', async () => {
    const r = await createAs(operator)
    await supervisor.post(`/requests/${r.id}/review`, { decision: 'approved' })

    const res = await admin.patch(`/requests/${r.id}`, { priority: 'high' })
    const body: Body = await res.json()
    expect(res.status).toBe(200)
    expect(body.priority).toBe('high')
    expect(body.createdByEmail).toBe('operator@example.com')
    expect(body.status).toBe('approved')
  })
})

describe('P-6 approve or reject', () => {
  it('operator cannot review their own request (403) or another’s (404)', async () => {
    const own = await createAs(operator)
    const others = await createAs(supervisor)
    expect((await operator.post(`/requests/${own.id}/review`, { decision: 'approved' })).status).toBe(403)
    expect((await operator.post(`/requests/${others.id}/review`, { decision: 'approved' })).status).toBe(404)
  })

  it.each([
    ['supervisor', 'approved'],
    ['admin', 'rejected'],
  ] as const)('%s can review, recording reviewer and time', async (role, decision) => {
    const r = await createAs(operator)
    const res = await byRole()[role].post(`/requests/${r.id}/review`, { decision })
    const body: Body = await res.json()
    expect(res.status).toBe(200)
    expect(body.status).toBe(decision)
    expect(body.reviewedByEmail).toBe(`${role}@example.com`)
    expect(body.reviewedAt).toBeTruthy()
  })

  it('a reviewed request can be re-reviewed, but not to the same decision', async () => {
    const r = await createAs(operator)
    await supervisor.post(`/requests/${r.id}/review`, { decision: 'approved' })
    expect((await admin.post(`/requests/${r.id}/review`, { decision: 'rejected' })).status).toBe(200)
    expect((await admin.post(`/requests/${r.id}/review`, { decision: 'rejected' })).status).toBe(409)
  })
})

describe('P-7 delete a request', () => {
  it('operator and supervisor cannot delete, even their own', async () => {
    const own = await createAs(operator)
    const supervisors = await createAs(supervisor)
    expect((await operator.delete(`/requests/${own.id}`)).status).toBe(403)
    expect((await supervisor.delete(`/requests/${supervisors.id}`)).status).toBe(403)
  })

  it('admin can delete any request', async () => {
    const r = await createAs(operator)
    expect((await admin.delete(`/requests/${r.id}`)).status).toBe(204)
    expect((await admin.get(`/requests/${r.id}`)).status).toBe(404)
  })
})

describe('P-8 create / edit / deactivate users', () => {
  const newUser = { email: 'new.user@example.com', password: 'Password123', role: 'operator' }

  it.each(['operator', 'supervisor'] as const)('%s cannot list, create or edit users', async (role) => {
    const api = byRole()[role]
    expect((await api.get('/users')).status).toBe(403)
    expect((await api.post('/users', newUser)).status).toBe(403)
    const [target] = (await (await admin.get('/users')).json()) as Body[]
    expect((await api.patch(`/users/${target!.id}`, { active: false })).status).toBe(403)
  })

  it('admin can create, edit and deactivate a user', async () => {
    const created = await admin.post('/users', newUser)
    const user: Body = await created.json()
    expect(created.status).toBe(201)
    expect(user).not.toHaveProperty('passwordHash')

    const edited = await admin.patch(`/users/${user.id}`, { role: 'supervisor' })
    expect((await edited.json() as Body).role).toBe('supervisor')

    const deactivated = await admin.patch(`/users/${user.id}`, { active: false })
    expect((await deactivated.json() as Body).active).toBe(false)
  })
})
