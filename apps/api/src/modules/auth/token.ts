import { sign, verify } from 'hono/jwt'

export const SESSION_COOKIE = 'session'
export const SESSION_SECONDS = 8 * 60 * 60
const ALG = 'HS256'

export const signToken = (userId: string, secret: string) =>
  sign({ sub: userId, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS }, secret, ALG)

/** Returns the user id, or null when the token is missing, tampered with, or expired. */
export async function verifyToken(token: string, secret: string) {
  try {
    const { sub } = await verify(token, secret, ALG)
    return typeof sub === 'string' ? sub : null
  } catch {
    return null
  }
}
