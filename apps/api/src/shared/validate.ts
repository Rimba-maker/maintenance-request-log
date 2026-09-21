import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { badRequest } from './errors.js'

/** Request validation that fails with our standard 400 error shape. */
export const validate = <T extends z.ZodType>(target: 'json' | 'query' | 'param', schema: T) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      throw badRequest(
        'Validation failed',
        result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      )
    }
  })

export const idParam = z.object({ id: z.uuid() })

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'))

export const atLeastOneField = (value: object) => Object.keys(value).length > 0
