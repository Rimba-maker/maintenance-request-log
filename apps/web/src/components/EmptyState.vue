<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon: Component; title: string; text?: string }>()
</script>

<template>
  <div class="card empty">
    <span class="icon"><component :is="icon" :size="26" aria-hidden="true" /></span>
    <h2>{{ title }}</h2>
    <p v-if="text" class="muted">{{ text }}</p>
    <div class="cta"><slot /></div>
  </div>
</template>

<style scoped>
.empty { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 3rem 1.5rem; text-align: center; }
.icon { display: grid; place-items: center; width: 52px; height: 52px; margin-bottom: 0.4rem; border-radius: 50%; background: var(--tone-neutral-bg); color: var(--text-muted); }
.cta:not(:empty) { margin-top: 0.8rem; }
</style>
