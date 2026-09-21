<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import ToastHost from './components/ToastHost.vue'
import { user } from './session'

const skipToContent = () => document.getElementById('main')?.focus()
</script>

<template>
  <a class="skip-link" href="#main" @click.prevent="skipToContent">Skip to main content</a>
  <AppHeader v-if="user" />
  <main id="main" tabindex="-1" :class="user ? 'page' : 'page-bare'">
    <RouterView />
  </main>
  <ToastHost />
</template>
