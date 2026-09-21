import { ApiError, type FieldIssue } from '../api/client'

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const day = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export const formatDate = (iso: string | null) => (iso ? dateTime.format(new Date(iso)) : '—')

/** Date only, for dense tables. The full date and time stay available in a tooltip. */
export const formatDay = (iso: string | null) => (iso ? day.format(new Date(iso)) : '—')

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

/** Turns a 400 response's issues into `{ fieldName: message }` for inline form errors. */
export const fieldErrors = (e: unknown): Record<string, string> =>
  e instanceof ApiError ? Object.fromEntries(e.details.map((d: FieldIssue) => [d.path, d.message])) : {}
