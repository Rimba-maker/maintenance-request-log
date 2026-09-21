import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import type { Role } from './api/types'
import { loadSession, user } from './session'
import LoginView from './views/LoginView.vue'
import RequestDetailView from './views/RequestDetailView.vue'
import RequestFormView from './views/RequestFormView.vue'
import RequestsView from './views/RequestsView.vue'
import UsersView from './views/UsersView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Shown in the browser tab and announced by screen readers on navigation. */
    title: string
    public?: boolean
    /** Only this role gets in. A UI convenience: the API enforces the real rule. */
    role?: Role
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { title: 'Sign in', public: true } },
    { path: '/', name: 'requests', component: RequestsView, meta: { title: 'Requests' } },
    { path: '/requests/new', name: 'request-new', component: RequestFormView, meta: { title: 'New request' } },
    { path: '/requests/:id', name: 'request-detail', component: RequestDetailView, props: true, meta: { title: 'Request' } },
    { path: '/requests/:id/edit', name: 'request-edit', component: RequestFormView, props: true, meta: { title: 'Edit request' } },
    { path: '/users', name: 'users', component: UsersView, meta: { title: 'Users', role: 'admin' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  await loadSession()

  if (to.meta.public) return user.value ? { name: 'requests' } : true
  if (!user.value) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.meta.role && user.value.role !== to.meta.role) return { name: 'requests' }
  return true
})

router.afterEach((to, from) => {
  document.title = `${to.meta.title} · Maintenance Log`
  // Single-page apps do not reload, so move focus to the new page for keyboard and screen-reader users.
  // Skipped on the first load and on the login page, which focuses its own first field.
  if (from.name && !to.meta.public) nextTick(() => document.getElementById('main')?.focus({ preventScroll: true }))
})
