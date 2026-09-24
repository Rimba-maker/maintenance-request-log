import { can } from '../../domain/permissions.js'
import type { Actor } from '../../domain/types.js'
import { conflict, forbidden, notFound } from '../../shared/errors.js'
import type { RequestsRepo } from './repo.js'
import type { CreateRequestInput, ListFilter, UpdateRequestInput } from './schema.js'

export function createRequestsService(repo: RequestsRepo) {
  /**
   * Q-5: a request the actor may not view does not exist for them (404).
   * Only after that can an action on it be refused with 403.
   */
  async function findVisible(actor: Actor, id: string) {
    const request = await repo.findById(id)
    if (!request || !can.viewRequest(actor, request)) throw notFound('Request')
    return request
  }

  return {
    async list(actor: Actor, filter: ListFilter) {
      // P-2 / P-3: operators only ever see their own requests.
      const scope = actor.role === 'operator' ? { createdBy: actor.id } : {}
      return repo.list({ ...scope, ...filter })
    },

    async get(actor: Actor, id: string) {
      const request = await findVisible(actor, id)
      return {
        ...request,
        history: await repo.history(id),
        // Lets the UI show/hide buttons without re-implementing the permission rules.
        can: {
          edit: can.editRequest(actor, request),
          review: can.reviewRequest(actor),
          delete: can.deleteRequest(actor),
        },
      }
    },

    async create(actor: Actor, input: CreateRequestInput) {
      if (!can.createRequest(actor)) throw forbidden()
      const id = await repo.create({ ...input, createdBy: actor.id })
      return (await repo.findById(id))!
    },

    async update(actor: Actor, id: string, patch: UpdateRequestInput) {
      const request = await findVisible(actor, id)
      if (!can.editRequest(actor, request)) throw forbidden()

      await repo.update(id, patch)
      const updated = await repo.findById(id)
      if (!updated) throw notFound('Request')
      return updated
    },

    async review(actor: Actor, id: string, decision: 'approved' | 'rejected') {
      const request = await findVisible(actor, id)
      if (!can.reviewRequest(actor)) throw forbidden()
      // Q-3: re-review is allowed, but a no-op review would only add noise to the history.
      if (request.status === decision) throw conflict(`Request is already ${decision}`)

      await repo.review(id, { from: request.status, to: decision, reviewedBy: actor.id })
      const updated = await repo.findById(id)
      if (!updated) throw notFound('Request')
      return updated
    },

    async remove(actor: Actor, id: string) {
      await findVisible(actor, id)
      if (!can.deleteRequest(actor)) throw forbidden()
      await repo.remove(id)
    },
  }
}

export type RequestsService = ReturnType<typeof createRequestsService>
