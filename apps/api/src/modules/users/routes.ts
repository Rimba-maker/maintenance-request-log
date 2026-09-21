import { Hono } from 'hono'
import type { AppEnv } from '../../shared/http.js'
import { idParam, validate } from '../../shared/validate.js'
import { createUserSchema, updateUserSchema } from './schema.js'
import type { UsersService } from './service.js'

export const usersRoutes = (service: UsersService) =>
  new Hono<AppEnv>()
    .get('/', async (c) => c.json(await service.list(c.get('actor'))))

    .post('/', validate('json', createUserSchema), async (c) =>
      c.json(await service.create(c.get('actor'), c.req.valid('json')), 201),
    )

    .patch('/:id', validate('param', idParam), validate('json', updateUserSchema), async (c) =>
      c.json(await service.update(c.get('actor'), c.req.valid('param').id, c.req.valid('json'))),
    )
