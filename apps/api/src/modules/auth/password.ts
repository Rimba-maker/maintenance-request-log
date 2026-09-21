import { compare, hash, hashSync } from 'bcryptjs'

const COST = 10

export const hashPassword = (password: string) => hash(password, COST)

export const verifyPassword = (password: string, passwordHash: string) => compare(password, passwordHash)

/** Compared against when the email is unknown, so timing does not reveal which emails exist. */
export const DUMMY_HASH = hashSync('not-a-real-password', COST)
