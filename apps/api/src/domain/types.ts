// Core vocabulary shared by every layer. Depends on nothing.

export const ROLES = ['operator', 'supervisor', 'admin'] as const
export const PRIORITIES = ['low', 'medium', 'high'] as const
export const STATUSES = ['submitted', 'approved', 'rejected'] as const

export type Role = (typeof ROLES)[number]
export type Priority = (typeof PRIORITIES)[number]
export type Status = (typeof STATUSES)[number]

/** The authenticated user performing an action. */
export interface Actor {
  id: string
  role: Role
}
