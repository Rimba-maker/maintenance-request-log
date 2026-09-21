import { z } from 'zod'
import { PRIORITIES, STATUSES } from '../../domain/types.js'
import { atLeastOneField } from '../../shared/validate.js'

const machineId = z.string().trim().min(1, 'Enter the machine or asset ID').max(64, 'Use at most 64 characters')
const description = z.string().trim().min(1, 'Describe the problem').max(2000, 'Use at most 2000 characters')
const priority = z.enum(PRIORITIES, 'Choose low, medium or high')

// Status and reviewer fields are server-controlled: not accepted on create.
export const createRequestSchema = z.object({
  machineId,
  description,
  priority: priority.default('medium'),
})

// Strict on purpose (Q-4): sending `status` to the edit endpoint is a 400, not silently ignored.
export const updateRequestSchema = z
  .strictObject({ machineId, description, priority })
  .partial()
  .refine(atLeastOneField, 'At least one field is required')

export const reviewSchema = z.object({ decision: z.enum(['approved', 'rejected']) })

export const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: priority.optional(),
})

export type CreateRequestInput = z.infer<typeof createRequestSchema>
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>
export type ListFilter = z.infer<typeof listQuerySchema>
