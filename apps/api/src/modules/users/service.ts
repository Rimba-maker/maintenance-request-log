import { can } from '../../domain/permissions.js'
import type { Actor } from '../../domain/types.js'
import { conflict, forbidden, notFound } from '../../shared/errors.js'
import { hashPassword } from '../auth/password.js'
import type { CreateUserInput, UpdateUserInput } from './schema.js'
import type { UserRecord, UsersRepo } from './repo.js'

/** True for a Postgres unique-constraint violation, however Drizzle/node-postgres wraps it. */
const isUniqueViolation = (err: unknown) => (err as { cause?: { code?: string } } | undefined)?.cause?.code === '23505'

/** A user as exposed by the API: never includes the password hash. */
export const toPublicUser = ({ id, email, role, active, createdAt }: UserRecord) => ({
  id,
  email,
  role,
  active,
  createdAt,
})

export function createUsersService(repo: UsersRepo) {
  const assertAdmin = (actor: Actor) => {
    if (!can.manageUsers(actor)) throw forbidden()
  }

  return {
    async list(actor: Actor) {
      assertAdmin(actor)
      return (await repo.list()).map(toPublicUser)
    },

    async create(actor: Actor, input: CreateUserInput) {
      assertAdmin(actor)
      if (await repo.findByEmail(input.email)) throw conflict('Email already in use')

      const { password, ...rest } = input
      try {
        const user = await repo.insert({ ...rest, passwordHash: await hashPassword(password) })
        return toPublicUser(user)
      } catch (err) {
        if (isUniqueViolation(err)) throw conflict('Email already in use')
        throw err
      }
    },

    async update(actor: Actor, id: string, input: UpdateUserInput) {
      assertAdmin(actor)
      const target = await repo.findById(id)
      if (!target) throw notFound('User')

      // Q-6: an admin must not lock the system out by removing their own access.
      const isSelf = target.id === actor.id
      if (isSelf && (input.active === false || (input.role && input.role !== actor.role))) {
        throw forbidden('You cannot deactivate your own account or change your own role')
      }
      if (input.email && input.email !== target.email && (await repo.findByEmail(input.email))) {
        throw conflict('Email already in use')
      }

      const { password, ...rest } = input
      try {
        const user = await repo.update(id, {
          ...rest,
          ...(password && { passwordHash: await hashPassword(password) }),
        })
        return toPublicUser(user!)
      } catch (err) {
        if (isUniqueViolation(err)) throw conflict('Email already in use')
        throw err
      }
    },
  }
}

export type UsersService = ReturnType<typeof createUsersService>
