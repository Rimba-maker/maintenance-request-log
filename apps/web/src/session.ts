import { ref } from 'vue'
import { authApi } from './api/resources'
import type { User } from './api/types'

/** The signed-in user, or null. The server cookie is the real session; this mirrors it. */
export const user = ref<User | null>(null)

let loaded = false

/** Asks the server who we are. Runs once, before the first navigation. */
export async function loadSession() {
  if (loaded) return
  loaded = true
  user.value = await authApi.me().then((r) => r.user).catch(() => null)
}

export async function signIn(email: string, password: string) {
  user.value = (await authApi.login(email, password)).user
}

export async function signOut() {
  await authApi.logout()
  user.value = null
}

/** Forget the user locally, e.g. after the server reports the session is no longer valid. */
export const clearSession = () => {
  user.value = null
}
