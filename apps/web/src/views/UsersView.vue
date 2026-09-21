<script setup lang="ts">
import { LoaderCircle, RefreshCw, UserPlus } from '@lucide/vue'
import { onMounted, reactive, ref } from 'vue'
import { usersApi } from '../api/resources'
import { ROLES, type Role, type User } from '../api/types'
import AlertBox from '../components/AlertBox.vue'
import Badge from '../components/Badge.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import FormField from '../components/FormField.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { user as me } from '../session'
import { notify } from '../toast'
import { errorMessage, fieldErrors, formatDay } from '../utils/format'

const users = ref<User[]>([])
const loading = ref(true)
const loadError = ref('')
const error = ref('')
const errors = ref<Record<string, string>>({})
const adding = ref(false)
const form = reactive({ email: '', password: '', role: 'operator' as Role })

const deactivating = ref<User | null>(null)
const deactivateDialog = ref<InstanceType<typeof ConfirmDialog>>()
const deactivateBusy = ref(false)

async function load() {
  loadError.value = ''
  try {
    users.value = await usersApi.list()
  } catch (e) {
    loadError.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

/** Runs a change and reloads the list. Failures are shown, and the list reloads so controls match the server. */
async function change(action: () => Promise<unknown>, success: string) {
  error.value = ''
  errors.value = {}
  try {
    await action()
    notify(success)
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? 'Please fix the highlighted fields.' : errorMessage(e)
  }
  await load()
}

async function create() {
  adding.value = true
  await change(async () => {
    await usersApi.create({ ...form })
    Object.assign(form, { email: '', password: '', role: 'operator' })
  }, 'User added')
  adding.value = false
}

const setRole = (u: User, event: Event) =>
  change(() => usersApi.update(u.id, { role: (event.target as HTMLSelectElement).value as Role }), 'Role updated')

const reactivate = (u: User) => change(() => usersApi.update(u.id, { active: true }), 'User reactivated')

function askDeactivate(u: User) {
  deactivating.value = u
  deactivateDialog.value?.open()
}

async function confirmDeactivate() {
  if (!deactivating.value) return
  deactivateBusy.value = true
  await change(() => usersApi.update(deactivating.value!.id, { active: false }), 'User deactivated')
  deactivateBusy.value = false
  deactivateDialog.value?.close()
}

onMounted(load)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Users</h1>
      <p class="lead">Create accounts, change roles and deactivate people who no longer need access.</p>
    </div>
  </div>

  <AlertBox v-if="error">{{ error }}</AlertBox>

  <form class="card" novalidate @submit.prevent="create">
    <h2>Add user</h2>
    <fieldset :disabled="adding" class="row">
      <FormField label="Email" :error="errors.email" v-slot="f">
        <input :id="f.id" v-model="form.email" type="email" autocomplete="off" required :aria-invalid="f.invalid" :aria-describedby="f.describedby" />
      </FormField>
      <FormField label="Password" hint="At least 8 characters." :error="errors.password" v-slot="f">
        <input :id="f.id" v-model="form.password" type="password" autocomplete="new-password" minlength="8" required :aria-invalid="f.invalid" :aria-describedby="f.describedby" />
      </FormField>
      <FormField label="Role" v-slot="f">
        <select :id="f.id" v-model="form.role">
          <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
        </select>
      </FormField>
      <div class="field submit">
        <button class="btn btn-primary">
          <LoaderCircle v-if="adding" class="spin" aria-hidden="true" /><UserPlus v-else aria-hidden="true" />Add user
        </button>
      </div>
    </fieldset>
  </form>

  <AlertBox v-if="loadError">
    {{ loadError }}
    <template #action>
      <button class="btn btn-sm" @click="load"><RefreshCw aria-hidden="true" />Retry</button>
    </template>
  </AlertBox>

  <div v-else-if="loading" class="card" aria-busy="true">
    <span class="sr-only" role="status">Loading users</span>
    <span v-for="n in 3" :key="n" class="skeleton" aria-hidden="true" style="height: 40px; margin: 0.6rem 0" />
  </div>

  <div v-else class="card table-wrap">
    <table class="table-cards">
      <thead>
        <tr>
          <th>Person</th>
          <th>Role</th>
          <th>Status</th>
          <th>Created</th>
          <th><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id" :class="{ inactive: !u.active }">
          <td>
            <span class="person">
              <UserAvatar :email="u.email" />
              <span class="email">{{ u.email }}</span>
              <span v-if="u.id === me?.id" class="you">You</span>
            </span>
          </td>
          <td data-label="Role">
            <select :value="u.role" :disabled="u.id === me?.id" :aria-label="`Role for ${u.email}`" @change="setRole(u, $event)">
              <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
            </select>
          </td>
          <td data-label="Status"><Badge :value="u.active ? 'active' : 'inactive'" /></td>
          <td data-label="Created" class="nowrap">{{ formatDay(u.createdAt) }}</td>
          <td class="cell-actions">
            <button
              v-if="u.active"
              class="btn btn-ghost btn-ghost-danger btn-sm"
              :disabled="u.id === me?.id"
              :title="u.id === me?.id ? 'You cannot deactivate your own account' : undefined"
              @click="askDeactivate(u)"
            >
              Deactivate
            </button>
            <button v-else class="btn btn-sm" @click="reactivate(u)">Reactivate</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <ConfirmDialog ref="deactivateDialog" title="Deactivate this user?" confirm-label="Deactivate" :busy="deactivateBusy" @confirm="confirmDeactivate">
    <strong>{{ deactivating?.email }}</strong> will be signed out and can no longer log in. Their requests are kept. You can reactivate them later.
  </ConfirmDialog>
</template>

<style scoped>
.row { display: grid; grid-template-columns: 1.4fr 1.2fr 0.8fr auto; gap: 0 1rem; align-items: start; }
.row select { width: 100%; }
.submit { align-self: end; }
.person { display: flex; align-items: center; gap: 0.65rem; min-width: 0; }
.email { overflow: hidden; text-overflow: ellipsis; }
.you { padding: 0.05rem 0.45rem; border-radius: 999px; background: var(--tone-neutral-bg); color: var(--text-muted); font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
tr.inactive .email, tr.inactive .nowrap { color: var(--text-muted); }

@media (max-width: 860px) { .row { grid-template-columns: 1fr 1fr; } }
@media (max-width: 560px) { .row { grid-template-columns: 1fr; } .submit .btn { width: 100%; } }
</style>
