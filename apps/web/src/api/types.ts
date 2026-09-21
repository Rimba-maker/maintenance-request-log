// Shapes of the API's JSON responses. Dates arrive as ISO strings.

export type Role = 'operator' | 'supervisor' | 'admin'
export type Priority = 'low' | 'medium' | 'high'
export type Status = 'submitted' | 'approved' | 'rejected'

export const ROLES: Role[] = ['operator', 'supervisor', 'admin']
export const PRIORITIES: Priority[] = ['low', 'medium', 'high']
export const STATUSES: Status[] = ['submitted', 'approved', 'rejected']

export interface User {
  id: string
  email: string
  role: Role
  active: boolean
  createdAt: string
}

export interface RequestItem {
  id: string
  machineId: string
  description: string
  priority: Priority
  status: Status
  createdBy: string
  createdByEmail: string
  createdAt: string
  reviewedBy: string | null
  reviewedByEmail: string | null
  reviewedAt: string | null
}

export interface HistoryEntry {
  fromStatus: Status | null
  toStatus: Status
  changedByEmail: string
  changedAt: string
}

export interface RequestDetail extends RequestItem {
  history: HistoryEntry[]
  /** What the current user may do with this request, decided by the server. */
  can: { edit: boolean; review: boolean; delete: boolean }
}

export interface RequestInput {
  machineId: string
  description: string
  priority: Priority
}
