import { deleteCookie, getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { unauthorized } from '../../shared/errors.js'
import type { AppEnv } from '../../shared/http.js'
import type { UsersRepo } from '../users/repo.js'
import { SESSION_COOKIE, verifyToken } from './token.js'

/**
 * Resolves the session cookie to an actor.
 * The user is reloaded from the database on every request, so deactivation
 * and role changes take effect immediately (Q-6).
 */
export const requireAuth = (users: UsersRepo, jwtSecret: string) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE)
    const userId = token ? await verifyToken(token, jwtSecret) : null
    const user = userId ? await users.findById(userId) : undefined

    if (!user || !user.active) {
      deleteCookie(c, SESSION_COOKIE, { path: '/' })
      throw unauthorized()
    }

    c.set('actor', { id: user.id, role: user.role })
    await next()
  })
