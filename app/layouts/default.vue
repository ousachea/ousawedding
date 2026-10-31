<script setup lang="ts">
// Dev-only shortcut to the admin; stripped from production builds
const isDev = import.meta.dev
</script>

<template>
  <div>
    <slot />
    <NuxtLink v-if="isDev && !$route.query.preview" to="/admin" class="dev-admin btn btn-primary">Admin</NuxtLink>
  </div>
</template>

<style scoped>
.dev-admin {
  position: fixed;
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(1rem, env(safe-area-inset-bottom));
  /* Above the envelope overlay so it works before the invitation is opened */
  z-index: calc(var(--z-overlay) + 1);
  box-shadow: var(--shadow);
}
</style>
