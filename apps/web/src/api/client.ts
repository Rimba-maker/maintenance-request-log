export interface FieldIssue {
  path: string
  message: string
}

/** A non-2xx API response. `details` carries per-field validation issues on a 400. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: FieldIssue[] = [],
  ) {
    super(message)
  }
}

let onUnauthorized: () => void = () => {}

/** Called when a signed-in user's session stops being valid (expired, or deactivated). */
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // Login and /auth/me report 401 themselves; only react to a session dying mid-use.
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized()
    throw new ApiError(res.status, data?.error?.message ?? res.statusText, data?.error?.details)
  }
  return data as T
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: (path: string) => request<void>('DELETE', path),
}
