<script setup lang="ts" generic="T extends string">
import type { Component } from 'vue'

// A row of mutually exclusive choices. Real radio inputs underneath, so arrow keys,
// focus and screen readers work natively.
const model = defineModel<T>({ required: true })

defineProps<{
  legend: string
  name: string
  options: { value: T; label: string; icon?: Component }[]
  hideLegend?: boolean
}>()
</script>

<template>
  <fieldset class="segmented">
    <legend :class="hideLegend ? 'sr-only' : 'field-label'">{{ legend }}</legend>
    <div class="options">
      <label v-for="option in options" :key="option.value">
        <input v-model="model" type="radio" :name="name" :value="option.value" />
        <span>
          <component :is="option.icon" v-if="option.icon" :size="15" aria-hidden="true" />
          {{ option.label }}
        </span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.segmented { margin-bottom: 1.1rem; }
.field-label { padding: 0; margin-bottom: 0.35rem; font-size: 0.9rem; font-weight: 500; }
.options { display: inline-flex; padding: 3px; gap: 2px; background: var(--tone-neutral-bg); border-radius: var(--radius-sm); flex-wrap: wrap; }
label { position: relative; }
input { position: absolute; opacity: 0; inset: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
span {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 34px;
  padding: 0.3rem 0.85rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: capitalize;
  transition: background var(--fast), color var(--fast);
}
input:hover + span { color: var(--text); }
input:checked + span { background: var(--surface); color: var(--text); box-shadow: inset 0 0 0 1px var(--input-border), var(--shadow); }
input:focus-visible + span { outline: 2px solid var(--focus); outline-offset: 1px; }
@media (pointer: coarse) { span { min-height: 40px; } }
</style>
