import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // Set to true only when the site is served over HTTPS.
  COOKIE_SECURE: z.stringbool().default(false),
})

export const loadEnv = () => envSchema.parse(process.env)
