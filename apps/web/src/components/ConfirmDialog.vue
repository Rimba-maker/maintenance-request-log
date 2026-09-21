<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { ref, useId } from 'vue'

// Confirmation for destructive actions, on the native <dialog>: it traps focus,
// closes on Esc and blocks the page behind it. Focus starts on Cancel, the safe choice.
defineProps<{ title: string; confirmLabel: string; busy?: boolean }>()
const emit = defineEmits<{ confirm: [] }>()

const dialog = ref<HTMLDialogElement>()
const titleId = useId()

defineExpose({
  open: () => dialog.value?.showModal(),
  close: () => dialog.value?.close(),
})
</script>

<template>
  <dialog ref="dialog" class="dialog" :aria-labelledby="titleId" @click.self="dialog?.close()">
    <form method="dialog">
      <h2 :id="titleId">{{ title }}</h2>
      <div class="body"><slot /></div>
      <div class="buttons">
        <button class="btn" autofocus :disabled="busy">Cancel</button>
        <button type="button" class="btn btn-danger" :disabled="busy" @click="emit('confirm')">
          <LoaderCircle v-if="busy" class="spin" :size="16" aria-hidden="true" />
          {{ confirmLabel }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.dialog {
  width: min(440px, calc(100vw - 2rem));
  padding: 1.5rem;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
}
.dialog::backdrop { background: var(--overlay); }
.dialog[open] { animation: pop 160ms var(--ease); }
@keyframes pop { from { opacity: 0; transform: scale(0.97); } }
.body { margin: 0.6rem 0 1.4rem; color: var(--text-muted); }
.buttons { display: flex; justify-content: flex-end; gap: 0.6rem; }
</style>
