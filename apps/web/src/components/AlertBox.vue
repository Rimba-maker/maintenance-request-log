<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
</script>

<template>
  <div class="alert" role="alert">
    <CircleAlert :size="18" aria-hidden="true" />
    <span><slot /></span>
    <slot name="action" />
  </div>
</template>
