<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ email: string }>()

/** Two letters from the part of the email before the @. Decorative: the email is always shown next to it. */
const initials = computed(() => props.email.split('@')[0]!.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase())
</script>

<template>
  <span class="avatar" aria-hidden="true">{{ initials }}</span>
</template>

<style scoped>
.avatar {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--tone-success-bg);
  color: var(--tone-success-fg);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}
</style>
