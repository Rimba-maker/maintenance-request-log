<script setup lang="ts">
import { Inbox, Plus, RefreshCw, Search, SearchX } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { requestsApi } from '../api/resources'
import { PRIORITIES, STATUSES, type Priority, type RequestItem, type Status } from '../api/types'
import AlertBox from '../components/AlertBox.vue'
import Badge from '../components/Badge.vue'
import EmptyState from '../components/EmptyState.vue'
import SegmentedControl from '../components/SegmentedControl.vue'
import { user } from '../session'
import { errorMessage, formatDate, formatDay } from '../utils/format'

type StatusFilter = Status | 'all'

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...STATUSES.map((s) => ({ value: s, label: s })),
]

const status = ref<StatusFilter>('all')
const priority = ref<Priority | ''>('')
const search = ref('')
const items = ref<RequestItem[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    // Status and priority are filtered by the server; the text search below runs on the loaded rows.
    items.value = await requestsApi.list({ status: status.value === 'all' ? '' : status.value, priority: priority.value })
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

watch([status, priority], load, { immediate: true })

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((r) => [r.machineId, r.description, r.createdByEmail].some((v) => v.toLowerCase().includes(q)))
})

const isFiltered = computed(() => status.value !== 'all' || priority.value !== '' || search.value.trim() !== '')

function clearFilters() {
  status.value = 'all'
  priority.value = ''
  search.value = ''
}
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Requests</h1>
      <p class="lead">{{ user?.role === 'operator' ? 'Requests you have raised.' : 'Every request across the plant.' }}</p>
    </div>
    <RouterLink class="btn btn-primary" :to="{ name: 'request-new' }"><Plus aria-hidden="true" />New request</RouterLink>
  </div>

  <div class="toolbar">
    <SegmentedControl v-model="status" name="status" legend="Status" :options="statusOptions" hide-legend />
    <div class="search">
      <Search :size="16" aria-hidden="true" />
      <input v-model="search" type="search" placeholder="Search machine, problem or person" aria-label="Search requests" />
    </div>
    <label class="priority">
      <span class="muted">Priority</span>
      <select v-model="priority">
        <option value="">All</option>
        <option v-for="p in PRIORITIES" :key="p" :value="p">{{ p }}</option>
      </select>
    </label>
  </div>

  <AlertBox v-if="error">
    {{ error }}
    <template #action>
      <button class="btn btn-sm" @click="load"><RefreshCw aria-hidden="true" />Retry</button>
    </template>
  </AlertBox>

  <div v-else-if="loading" class="card skeletons" aria-busy="true">
    <span class="sr-only" role="status">Loading requests</span>
    <div v-for="n in 6" :key="n" class="skeleton-row" aria-hidden="true">
      <span class="skeleton" style="width: 90px; height: 14px" />
      <span class="skeleton" style="flex: 1; height: 14px" />
      <span class="skeleton" style="width: 72px; height: 22px; border-radius: 999px" />
      <span class="skeleton" style="width: 84px; height: 22px; border-radius: 999px" />
    </div>
  </div>

  <EmptyState
    v-else-if="!visible.length && isFiltered"
    :icon="SearchX"
    title="No requests match"
    text="Try a different search or clear the filters."
  >
    <button class="btn" @click="clearFilters">Clear filters</button>
  </EmptyState>

  <EmptyState v-else-if="!visible.length" :icon="Inbox" title="No requests yet" text="Raise the first one when a machine has a problem.">
    <RouterLink class="btn btn-primary" :to="{ name: 'request-new' }"><Plus aria-hidden="true" />New request</RouterLink>
  </EmptyState>

  <template v-else>
    <p class="count muted" aria-live="polite">{{ visible.length }} {{ visible.length === 1 ? 'request' : 'requests' }}</p>
    <div class="card table-wrap">
      <table class="table-cards">
        <thead>
          <tr>
            <th>Machine</th>
            <th>Problem</th>
            <th>Priority</th>
            <th>Status</th>
            <th class="col-creator">Created by</th>
            <th>Created</th>
            <th class="col-reviewer">Reviewed by</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in visible" :key="r.id">
            <td class="nowrap">
              <RouterLink class="row-link mono" :to="{ name: 'request-detail', params: { id: r.id } }">{{ r.machineId }}</RouterLink>
            </td>
            <td class="truncate" :title="r.description">{{ r.description }}</td>
            <td data-label="Priority"><Badge :value="r.priority" /></td>
            <td data-label="Status"><Badge :value="r.status" /></td>
            <td data-label="Created by" class="email-cell col-creator" :title="r.createdByEmail">{{ r.createdByEmail }}</td>
            <td data-label="Created" class="nowrap" :title="formatDate(r.createdAt)">{{ formatDay(r.createdAt) }}</td>
            <td data-label="Reviewed by" class="email-cell col-reviewer" :title="r.reviewedByEmail ?? undefined">{{ r.reviewedByEmail ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
</template>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 0.75rem 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
.toolbar :deep(.segmented) { margin: 0; }
.search { position: relative; flex: 1; min-width: 220px; max-width: 360px; }
.search svg { position: absolute; top: 50%; left: 0.7rem; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.search input { padding-left: 2.2rem; }
.priority { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; font-size: 0.9rem; }
.count { margin-bottom: 0.5rem; font-size: 0.88rem; }

.skeletons { padding: 0.5rem 1rem; }
.skeleton-row { display: flex; align-items: center; gap: 1.25rem; padding: 0.95rem 0; border-bottom: 1px solid var(--border); }
.skeleton-row:last-child { border-bottom: 0; }

tbody tr { position: relative; }
/* The whole row is clickable, but the link stays the single keyboard and screen-reader target. */
.row-link { font-weight: 500; }
.row-link::after { content: ''; position: absolute; inset: 0; }
.row-link:focus-visible { outline-offset: -2px; }

/* Tablet widths: drop the two least important columns instead of scrolling sideways. */
@media (min-width: 721px) and (max-width: 1000px) { .col-reviewer { display: none; } }
@media (min-width: 721px) and (max-width: 860px) { .col-creator { display: none; } }
@media (max-width: 720px) { .priority { margin-left: 0; } .search { max-width: none; } }
</style>
