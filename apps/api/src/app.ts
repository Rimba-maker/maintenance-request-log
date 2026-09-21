import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Db } from './db/client.js'
import { requireAuth } from './modules/auth/middleware.js'
import { authRoutes } from './modules/auth/routes.js'
import { createAuthService } from './modules/auth/service.js'
import { createRequestsRepo } from './modules/requests/repo.js'
import { requestsRoutes } from './modules/requests/routes.js'
import { createRequestsService } from './modules/requests/service.js'
import { createUsersRepo } from './modules/users/repo.js'
import { usersRoutes } from './modules/users/routes.js'
import { createUsersService } from './modules/users/service.js'
import { AppError } from './shared/errors.js'
import type { AppEnv } from './shared/http.js'

export interface AppDeps {
  db: Db
  jwtSecret: string
  cookieSecure: boolean
}

/** Composition root: builds the object graph (repos → services → routes) and mounts it. */
export function createApp({ db, jwtSecret, cookieSecure }: AppDeps) {
  const usersRepo = createUsersRepo(db)
  const auth = requireAuth(usersRepo, jwtSecret)

  const app = new Hono<AppEnv>()

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ error: { message: err.message, details: err.details } }, err.status)
    }
    if (err instanceof HTTPException) {
      return c.json({ error: { message: err.message } }, err.status)
    }
    console.error(err)
    return c.json({ error: { message: 'Internal server error' } }, 500)
  })
  app.notFound((c) => c.json({ error: { message: 'Not found' } }, 404))

  app.get('/api/health', (c) => c.json({ status: 'ok' }))

  app.route('/api/auth', authRoutes(createAuthService(usersRepo, jwtSecret), auth, cookieSecure))
  app.use('/api/users/*', auth)
  app.route('/api/users', usersRoutes(createUsersService(usersRepo)))
  app.use('/api/requests/*', auth)
  app.route('/api/requests', requestsRoutes(createRequestsService(createRequestsRepo(db))))

  return app
}
