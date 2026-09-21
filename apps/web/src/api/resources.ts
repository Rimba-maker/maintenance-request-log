import { http } from './client'
import type { Priority, RequestDetail, RequestInput, RequestItem, Role, Status, User } from './types'

export const authApi = {
  login: (email: string, password: string) => http.post<{ user: User }>('/auth/login', { email, password }),
  logout: () => http.post<void>('/auth/logout'),
  me: () => http.get<{ user: User }>('/auth/me'),
}

export const requestsApi = {
  list(filter: { status?: Status | ''; priority?: Priority | '' }) {
    const query = new URLSearchParams(Object.entries(filter).filter(([, value]) => value) as [string, string][])
    return http.get<RequestItem[]>(`/requests?${query}`)
  },
  get: (id: string) => http.get<RequestDetail>(`/requests/${id}`),
  create: (input: RequestInput) => http.post<RequestItem>('/requests', input),
  update: (id: string, input: Partial<RequestInput>) => http.patch<RequestItem>(`/requests/${id}`, input),
  review: (id: string, decision: 'approved' | 'rejected') =>
    http.post<RequestItem>(`/requests/${id}/review`, { decision }),
  remove: (id: string) => http.delete(`/requests/${id}`),
}

export const usersApi = {
  list: () => http.get<User[]>('/users'),
  create: (input: { email: string; password: string; role: Role }) => http.post<User>('/users', input),
  update: (id: string, patch: Partial<{ email: string; password: string; role: Role; active: boolean }>) =>
    http.patch<User>(`/users/${id}`, patch),
}
