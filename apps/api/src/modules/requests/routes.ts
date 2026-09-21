import { Hono } from 'hono'
import type { AppEnv } from '../../shared/http.js'
import { idParam, validate } from '../../shared/validate.js'
import { createRequestSchema, listQuerySchema, reviewSchema, updateRequestSchema } from './schema.js'
import type { RequestsService } from './service.js'

export const requestsRoutes = (service: RequestsService) =>
  new Hono<AppEnv>()
    .get('/', validate('query', listQuerySchema), async (c) =>
      c.json(await service.list(c.get('actor'), c.req.valid('query'))),
    )

    .post('/', validate('json', createRequestSchema), async (c) =>
      c.json(await service.create(c.get('actor'), c.req.valid('json')), 201),
    )

    .get('/:id', validate('param', idParam), async (c) =>
      c.json(await service.get(c.get('actor'), c.req.valid('param').id)),
    )

    .patch('/:id', validate('param', idParam), validate('json', updateRequestSchema), async (c) =>
      c.json(await service.update(c.get('actor'), c.req.valid('param').id, c.req.valid('json'))),
    )

    .post('/:id/review', validate('param', idParam), validate('json', reviewSchema), async (c) =>
      c.json(await service.review(c.get('actor'), c.req.valid('param').id, c.req.valid('json').decision)),
    )

    .delete('/:id', validate('param', idParam), async (c) => {
      await service.remove(c.get('actor'), c.req.valid('param').id)
      return c.body(null, 204)
    })
