<script setup lang="ts">
import { CircleCheck, X } from '@lucide/vue'
import { dismiss, toasts } from '../toast'
</script>

<template>
  <!-- One polite live region: messages are announced without stealing focus. -->
  <div class="toasts" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast">
        <CircleCheck :size="18" aria-hidden="true" />
        <span>{{ t.message }}</span>
        <button class="close" aria-label="Dismiss" @click="dismiss(t.id)"><X :size="16" aria-hidden="true" /></button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts { position: fixed; z-index: 50; right: 1rem; bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem; max-width: calc(100vw - 2rem); }
.toast {
  display: flex; align-items: center; gap: 0.6rem; padding: 0.7rem 0.6rem 0.7rem 0.9rem;
  color: var(--tone-ink-fg); background: var(--tone-ink-bg);
  border-radius: var(--radius-sm); box-shadow: var(--shadow-lg); font-size: 0.93rem;
}
.toast svg:first-child { color: var(--primary); }
.close { display: grid; place-items: center; width: 28px; height: 28px; color: inherit; background: transparent; border: 0; border-radius: 4px; opacity: 0.75; cursor: pointer; }
.close:hover { opacity: 1; }
.toast-enter-active, .toast-leave-active { transition: opacity var(--fast), transform var(--fast) var(--ease); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
