export type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 429

/** An expected failure that maps to an HTTP status. Thrown by services, rendered by the app. */
export class AppError extends Error {
  constructor(
    readonly status: ErrorStatus,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
  }
}

export const badRequest = (message: string, details?: unknown) => new AppError(400, message, details)
export const unauthorized = (message = 'Authentication required') => new AppError(401, message)
export const forbidden = (message = 'You are not allowed to do this') => new AppError(403, message)
export const notFound = (what = 'Resource') => new AppError(404, `${what} not found`)
export const conflict = (message: string) => new AppError(409, message)
export const tooManyRequests = (message: string) => new AppError(429, message)
