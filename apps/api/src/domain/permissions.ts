import type { Actor, Status } from './types.js'

/** The parts of a request that permission rules depend on. */
interface RequestFacts {
  createdBy: string
  status: Status
}

/**
 * The permission matrix (P-1 to P-8) as pure functions.
 * Services call these; nothing else decides who may do what.
 */
export const can = {
  /** P-1 */
  createRequest: (_actor: Actor) => true,

  /** P-2 own requests, P-3 all requests */
  viewRequest: (actor: Actor, request: RequestFacts) =>
    actor.role !== 'operator' || request.createdBy === actor.id,

  /** P-4 own request while Submitted, P-5 any request (admin) */
  editRequest: (actor: Actor, request: RequestFacts) =>
    actor.role === 'admin' ||
    (request.createdBy === actor.id && request.status === 'submitted'),

  /** P-6 */
  reviewRequest: (actor: Actor) => actor.role !== 'operator',

  /** P-7 */
  deleteRequest: (actor: Actor) => actor.role === 'admin',

  /** P-8 */
  manageUsers: (actor: Actor) => actor.role === 'admin',
}
