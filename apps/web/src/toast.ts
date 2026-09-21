import { reactive } from 'vue'

export interface Toast {
  id: number
  message: string
}

export const toasts = reactive<Toast[]>([])

let nextId = 0

export function dismiss(id: number) {
  const index = toasts.findIndex((t) => t.id === id)
  if (index >= 0) toasts.splice(index, 1)
}

/** Shows a short confirmation ("Request approved") that clears itself. */
export function notify(message: string) {
  const id = nextId++
  toasts.push({ id, message })
  setTimeout(() => dismiss(id), 4000)
}
