<script setup lang="ts">
import { ArrowDown, ArrowUp, CircleCheck, CircleX, Clock, Minus } from '@lucide/vue'
import { computed, type Component } from 'vue'

// One badge for status, priority, role and active state. The label is always shown as text,
// and status/priority also get an icon, so meaning never depends on colour alone.
const props = defineProps<{ value: string }>()

const looks: Record<string, { tone: string; icon?: Component }> = {
  submitted: { tone: 'warn', icon: Clock },
  approved: { tone: 'success', icon: CircleCheck },
  rejected: { tone: 'danger', icon: CircleX },
  low: { tone: 'neutral', icon: ArrowDown },
  medium: { tone: 'info', icon: Minus },
  high: { tone: 'orange', icon: ArrowUp },
  operator: { tone: 'neutral' },
  supervisor: { tone: 'violet' },
  admin: { tone: 'ink' },
  active: { tone: 'success' },
  inactive: { tone: 'neutral' },
}

const look = computed(() => looks[props.value] ?? { tone: 'neutral' })
</script>

<template>
  <span class="badge" :class="`tone-${look.tone}`">
    <component :is="look.icon" v-if="look.icon" :size="13" :stroke-width="2.5" aria-hidden="true" />
    {{ value }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.12rem 0.6rem 0.12rem 0.5rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.5;
  text-transform: capitalize;
  white-space: nowrap;
}
.tone-neutral { background: var(--tone-neutral-bg); color: var(--tone-neutral-fg); }
.tone-success { background: var(--tone-success-bg); color: var(--tone-success-fg); }
.tone-warn { background: var(--tone-warn-bg); color: var(--tone-warn-fg); }
.tone-danger { background: var(--tone-danger-bg); color: var(--tone-danger-fg); }
.tone-info { background: var(--tone-info-bg); color: var(--tone-info-fg); }
.tone-orange { background: var(--tone-orange-bg); color: var(--tone-orange-fg); }
.tone-violet { background: var(--tone-violet-bg); color: var(--tone-violet-fg); }
.tone-ink { background: var(--tone-ink-bg); color: var(--tone-ink-fg); }
</style>
