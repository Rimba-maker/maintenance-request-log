import { z } from 'zod'
import { ROLES } from '../../domain/types.js'
import { atLeastOneField, emailSchema } from '../../shared/validate.js'

// bcrypt only uses the first 72 bytes; capped well under that so multi-byte UTF-8 characters
// (e.g. accented letters, emoji) can never push the real byte length past the limit and get silently truncated.
export const passwordSchema = z.string().min(8, 'Use at least 8 characters').max(64, 'Use at most 64 characters')

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(ROLES),
})

/** Deactivation is `{ active: false }`; users are never deleted. */
export const updateUserSchema = z
  .strictObject({
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(ROLES),
    active: z.boolean(),
  })
  .partial()
  .refine(atLeastOneField, 'At least one field is required')

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
