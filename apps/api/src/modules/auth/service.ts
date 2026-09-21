import { notFound, unauthorized } from '../../shared/errors.js'
import type { UsersRepo } from '../users/repo.js'
import { toPublicUser } from '../users/service.js'
import { DUMMY_HASH, verifyPassword } from './password.js'
import { signToken } from './token.js'

export function createAuthService(users: UsersRepo, jwtSecret: string) {
  return {
    async login(email: string, password: string) {
      const user = await users.findByEmail(email)
      const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)

      // One generic message for every failure: do not reveal which part was wrong.
      if (!user || !passwordOk || !user.active) throw unauthorized('Invalid email or password')

      return { user: toPublicUser(user), token: await signToken(user.id, jwtSecret) }
    },

    async me(userId: string) {
      const user = await users.findById(userId)
      if (!user) throw notFound('User')
      return toPublicUser(user)
    },
  }
}

export type AuthService = ReturnType<typeof createAuthService>
