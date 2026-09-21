<script setup lang="ts">
import { ClipboardList, LogOut, Users, Wrench } from '@lucide/vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signOut, user } from '../session'
import Badge from './Badge.vue'
import UserAvatar from './UserAvatar.vue'

const router = useRouter()
const route = useRoute()

// "Requests" covers the list, the detail page and the forms.
const inRequests = computed(() => route.path === '/' || route.path.startsWith('/requests'))

async function logout() {
  await signOut()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="header">
    <div class="inner">
      <RouterLink class="brand" :to="{ name: 'requests' }">
        <span class="mark"><Wrench :size="16" :stroke-width="2.5" aria-hidden="true" /></span>
        Maintenance Log
      </RouterLink>

      <nav class="nav" aria-label="Main">
        <RouterLink :to="{ name: 'requests' }" :class="{ active: inRequests }"><ClipboardList :size="16" aria-hidden="true" />Requests</RouterLink>
        <RouterLink v-if="user?.role === 'admin'" :to="{ name: 'users' }">
          <Users :size="16" aria-hidden="true" />Users
        </RouterLink>
      </nav>

      <div v-if="user" class="account">
        <UserAvatar :email="user.email" />
        <span class="email">{{ user.email }}</span>
        <Badge :value="user.role" />
        <button class="btn btn-ghost btn-sm" aria-label="Log out" @click="logout">
          <LogOut :size="16" aria-hidden="true" /><span class="label">Log out</span>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header { position: sticky; top: 0; z-index: 20; background: var(--surface); border-bottom: 1px solid var(--border); }
.inner { display: flex; align-items: center; gap: 1.5rem; max-width: 1120px; margin: 0 auto; padding: 0.55rem 1.25rem; }
.brand { display: inline-flex; align-items: center; gap: 0.6rem; font-weight: 600; color: var(--text); text-decoration: none; white-space: nowrap; }
.brand:hover { color: var(--text); }
.mark { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--primary); color: var(--on-primary); }

.nav { display: flex; gap: 0.25rem; flex: 1; }
.nav a {
  display: inline-flex; align-items: center; gap: 0.45rem; min-height: 36px; padding: 0.3rem 0.75rem;
  border-radius: var(--radius-sm); color: var(--text-muted); font-weight: 500; text-decoration: none;
  transition: background var(--fast), color var(--fast);
}
.nav a:hover { background: var(--tone-neutral-bg); color: var(--text); }
.nav a.router-link-active, .nav a.active { background: var(--tone-success-bg); color: var(--tone-success-fg); }

.account { display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem; }
.email { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@media (max-width: 720px) {
  .inner { flex-wrap: wrap; gap: 0.5rem 1rem; padding: 0.5rem 1rem; }
  .nav { order: 3; flex-basis: 100%; }
  .nav a { flex: 1; justify-content: center; }
  .account { margin-left: auto; }
  .email, .label { display: none; }
}
@media (max-width: 480px) {
  .account .avatar { display: none; } /* decorative; frees room so the role and log out stay on the brand row */
}
</style>
