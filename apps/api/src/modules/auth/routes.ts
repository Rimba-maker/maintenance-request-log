import { Hono, type MiddlewareHandler } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'
import { z } from 'zod'
import type { AppEnv } from '../../shared/http.js'
import { emailSchema, validate } from '../../shared/validate.js'
import type { AuthService } from './service.js'
import { loginRateLimit } from './rateLimit.js'
import { SESSION_COOKIE, SESSION_SECONDS } from './token.js'

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1) })

export const authRoutes = (service: AuthService, requireAuth: MiddlewareHandler<AppEnv>, cookieSecure: boolean) =>
  new Hono<AppEnv>()
    .post('/login', loginRateLimit, validate('json', loginSchema), async (c) => {
      const { email, password } = c.req.valid('json')
      const { user, token } = await service.login(email, password)

      setCookie(c, SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'Lax',
        secure: cookieSecure,
        path: '/',
        maxAge: SESSION_SECONDS,
      })
      return c.json({ user })
    })

    .post('/logout', (c) => {
      deleteCookie(c, SESSION_COOKIE, { path: '/' })
      return c.body(null, 204)
    })

    .get('/me', requireAuth, async (c) => c.json({ user: await service.me(c.get('actor').id) }))
