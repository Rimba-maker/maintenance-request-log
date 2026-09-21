<script setup lang="ts">
import { ArrowLeft, Check, LoaderCircle, Pencil, RefreshCw, Trash2, X } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { requestsApi } from '../api/resources'
import type { RequestDetail } from '../api/types'
import AlertBox from '../components/AlertBox.vue'
import Badge from '../components/Badge.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { notify } from '../toast'
import { errorMessage, formatDate } from '../utils/format'

const props = defineProps<{ id: string }>()
const router = useRouter()

const request = ref<RequestDetail | null>(null)
const loadError = ref('')
const actionError = ref('')
const busy = ref<'approved' | 'rejected' | 'delete' | null>(null)
const deleteDialog = ref<InstanceType<typeof ConfirmDialog>>()

async function load() {
  loadError.value = ''
  try {
    request.value = await requestsApi.get(props.id)
  } catch (e) {
    loadError.value = errorMessage(e)
  }
}

async function review(decision: 'approved' | 'rejected') {
  busy.value = decision
  actionError.value = ''
  try {
    await requestsApi.review(props.id, decision)
    await load()
    notify(`Request ${decision}`)
  } catch (e) {
    actionError.value = errorMessage(e)
  } finally {
    busy.value = null
  }
}

async function remove() {
  busy.value = 'delete'
  try {
    await requestsApi.remove(props.id)
    deleteDialog.value?.close()
    notify('Request deleted')
    await router.push({ name: 'requests' })
  } catch (e) {
    deleteDialog.value?.close()
    actionError.value = errorMessage(e)
  } finally {
    busy.value = null
  }
}

onMounted(load)
</script>

<template>
  <RouterLink class="back" :to="{ name: 'requests' }"><ArrowLeft :size="16" aria-hidden="true" />All requests</RouterLink>

  <AlertBox v-if="loadError">
    {{ loadError }}
    <template #action>
      <button class="btn btn-sm" @click="load"><RefreshCw aria-hidden="true" />Retry</button>
    </template>
  </AlertBox>

  <div v-else-if="!request" aria-busy="true">
    <span class="sr-only" role="status">Loading request</span>
    <span class="skeleton" style="width: 220px; height: 30px; margin-bottom: 1.25rem" />
    <span class="skeleton card" style="height: 150px" />
    <span class="skeleton card" style="height: 110px" />
  </div>

  <template v-else>
    <div class="page-head">
      <div>
        <div class="title-row">
          <h1 class="mono">{{ request.machineId }}</h1>
          <Badge :value="request.status" />
          <Badge :value="request.priority" />
        </div>
        <p class="lead">Raised by {{ request.createdByEmail }} · {{ formatDate(request.createdAt) }}</p>
      </div>

      <div class="actions">
        <RouterLink v-if="request.can.edit" class="btn" :to="{ name: 'request-edit', params: { id } }"><Pencil aria-hidden="true" />Edit</RouterLink>
        <button
          v-if="request.can.review"
          class="btn btn-primary"
          :disabled="busy !== null || request.status === 'approved'"
          :title="request.status === 'approved' ? 'Already approved' : undefined"
          @click="review('approved')"
        >
          <LoaderCircle v-if="busy === 'approved'" class="spin" aria-hidden="true" /><Check v-else aria-hidden="true" />Approve
        </button>
        <button
          v-if="request.can.review"
          class="btn btn-danger"
          :disabled="busy !== null || request.status === 'rejected'"
          :title="request.status === 'rejected' ? 'Already rejected' : undefined"
          @click="review('rejected')"
        >
          <LoaderCircle v-if="busy === 'rejected'" class="spin" aria-hidden="true" /><X v-else aria-hidden="true" />Reject
        </button>
        <button v-if="request.can.delete" class="btn btn-ghost btn-ghost-danger" :disabled="busy !== null" @click="deleteDialog?.open()">
          <Trash2 aria-hidden="true" />Delete
        </button>
      </div>
    </div>

    <AlertBox v-if="actionError">{{ actionError }}</AlertBox>

    <section class="card">
      <h2>Problem</h2>
      <p class="prose">{{ request.description }}</p>
    </section>

    <div class="grid">
      <section class="card">
        <h2>Created</h2>
        <dl>
          <div><dt>By</dt><dd>{{ request.createdByEmail }}</dd></div>
          <div><dt>At</dt><dd>{{ formatDate(request.createdAt) }}</dd></div>
        </dl>
      </section>
      <section class="card">
        <h2>Last review</h2>
        <p v-if="!request.reviewedBy" class="muted">Not reviewed yet.</p>
        <dl v-else>
          <div><dt>By</dt><dd>{{ request.reviewedByEmail }}</dd></div>
          <div><dt>At</dt><dd>{{ formatDate(request.reviewedAt) }}</dd></div>
        </dl>
      </section>
    </div>

    <section class="card">
      <h2>History</h2>
      <ol class="timeline">
        <li v-for="(h, i) in request.history" :key="i">
          <span class="dot" :class="`dot-${h.toStatus}`" aria-hidden="true" />
          <div class="entry">
            <div class="what">
              <Badge :value="h.toStatus" />
              <span v-if="h.fromStatus" class="muted">from {{ h.fromStatus }}</span>
            </div>
            <div class="muted when">{{ h.fromStatus ? '' : 'Submitted ' }}by {{ h.changedByEmail }} · {{ formatDate(h.changedAt) }}</div>
          </div>
        </li>
      </ol>
    </section>

    <ConfirmDialog ref="deleteDialog" title="Delete this request?" confirm-label="Delete request" :busy="busy === 'delete'" @confirm="remove">
      <strong class="mono">{{ request.machineId }}</strong> and its history will be permanently removed. This cannot be undone.
    </ConfirmDialog>
  </template>
</template>

<style scoped>
.prose { white-space: pre-wrap; overflow-wrap: anywhere; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
.grid .card { margin-bottom: 0; } /* the grid gap already spaces the cards */
dl { display: grid; gap: 0.6rem; margin: 0; }
dt { color: var(--text-muted); font-size: 0.8rem; }
dd { margin: 0; overflow-wrap: anywhere; }

.timeline { list-style: none; margin: 0; padding: 0; }
.timeline li { position: relative; display: flex; gap: 0.9rem; padding-bottom: 1.2rem; }
.timeline li:last-child { padding-bottom: 0; }
.timeline li:not(:last-child)::before { content: ''; position: absolute; left: 6px; top: 18px; bottom: -2px; width: 2px; background: var(--border); }
.dot { flex-shrink: 0; width: 14px; height: 14px; margin-top: 5px; border-radius: 50%; border: 3px solid var(--surface); box-shadow: 0 0 0 2px currentColor; }
.dot-submitted { color: var(--tone-warn-fg); background: var(--tone-warn-bg); }
.dot-approved { color: var(--primary); background: var(--tone-success-bg); }
.dot-rejected { color: var(--danger); background: var(--tone-danger-bg); }
.what { display: flex; align-items: center; gap: 0.5rem; }
.when { font-size: 0.88rem; }
</style>
