<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import { useId } from 'vue'

// Label + control + hint + inline error, wired together for assistive tech.
// The control goes in the slot and receives `id`, `invalid` and `describedby`.
defineProps<{ label: string; error?: string; hint?: string }>()
const id = useId()
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <slot
      :id="id"
      :invalid="!!error"
      :describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
    />
    <small v-if="hint && !error" :id="`${id}-hint`" class="field-hint">{{ hint }}</small>
    <small v-if="error" :id="`${id}-error`" class="field-error">
      <CircleAlert :size="14" aria-hidden="true" />
      {{ error }}
    </small>
  </div>
</template>
