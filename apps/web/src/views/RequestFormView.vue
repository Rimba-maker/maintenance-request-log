<script setup lang="ts">
import { ArrowDown, ArrowLeft, ArrowUp, LoaderCircle, Minus } from '@lucide/vue'
import { nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { requestsApi } from '../api/resources'
import { PRIORITIES, type Priority, type RequestInput } from '../api/types'
import AlertBox from '../components/AlertBox.vue'
import FormField from '../components/FormField.vue'
import SegmentedControl from '../components/SegmentedControl.vue'
import { notify } from '../toast'
import { errorMessage, fieldErrors } from '../utils/format'

// With an `id` this edits an existing request, without one it creates a new request.
const props = defineProps<{ id?: string }>()
const router = useRouter()

const DESCRIPTION_MAX = 2000
const priorityOptions: { value: Priority; label: string; icon: typeof Minus }[] = PRIORITIES.map((p) => ({
  value: p,
  label: p,
  icon: { low: ArrowDown, medium: Minus, high: ArrowUp }[p],
}))

const form = reactive<RequestInput>({ machineId: '', description: '', priority: 'medium' })
const errors = ref<Record<string, string>>({})
const error = ref('')
const loading = ref(!!props.id)
const busy = ref(false)

onMounted(async () => {
  if (!props.id) return
  try {
    // Copy only the editable fields: the API rejects anything else (e.g. status).
    const { machineId, description, priority } = await requestsApi.get(props.id)
    Object.assign(form, { machineId, description, priority })
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
})

async function submit() {
  busy.value = true
  error.value = ''
  errors.value = {}
  try {
    const saved = props.id ? await requestsApi.update(props.id, form) : await requestsApi.create(form)
    notify(props.id ? 'Changes saved' : 'Request created')
    await router.push({ name: 'request-detail', params: { id: saved.id } })
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = Object.keys(errors.value).length ? 'Please fix the highlighted fields.' : errorMessage(e)
    // Send keyboard and screen-reader users to the first field that needs attention.
    // The form must be re-enabled first: a disabled field cannot take focus.
    busy.value = false
    await nextTick()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <RouterLink class="back" :to="id ? { name: 'request-detail', params: { id } } : { name: 'requests' }">
    <ArrowLeft :size="16" aria-hidden="true" />Back
  </RouterLink>

  <div class="page-head">
    <h1>{{ id ? 'Edit request' : 'New request' }}</h1>
  </div>

  <form class="card form" novalidate @submit.prevent="submit">
    <AlertBox v-if="error">{{ error }}</AlertBox>

    <fieldset :disabled="loading || busy">
      <FormField label="Machine / asset ID" hint="For example CNC-01 or PRESS-03." :error="errors.machineId" v-slot="f">
        <input :id="f.id" v-model="form.machineId" class="mono" maxlength="64" required :aria-invalid="f.invalid" :aria-describedby="f.describedby" />
      </FormField>

      <FormField
        label="Problem description"
        :hint="`${form.description.length} / ${DESCRIPTION_MAX}`"
        :error="errors.description"
        v-slot="f"
      >
        <textarea :id="f.id" v-model="form.description" rows="6" :maxlength="DESCRIPTION_MAX" required :aria-invalid="f.invalid" :aria-describedby="f.describedby" />
      </FormField>

      <SegmentedControl v-model="form.priority" name="priority" legend="Priority" :options="priorityOptions" />
    </fieldset>

    <div class="buttons">
      <RouterLink class="btn" :to="id ? { name: 'request-detail', params: { id } } : { name: 'requests' }">Cancel</RouterLink>
      <button class="btn btn-primary" :disabled="loading || busy">
        <LoaderCircle v-if="busy" class="spin" aria-hidden="true" />
        {{ id ? 'Save changes' : 'Create request' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.form { max-width: 640px; }
.buttons { display: flex; gap: 0.6rem; justify-content: flex-end; margin-top: 0.5rem; padding-top: 1.1rem; border-top: 1px solid var(--border); }
</style>
