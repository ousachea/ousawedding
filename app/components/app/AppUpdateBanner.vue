<script setup lang="ts">
// Nuxt checks for a newer deploy (checkOutdatedBuildInterval); when one is live, offer a refresh
const { t } = useI18n()
const outdated = ref(false)
useNuxtApp().hooks.hook('app:manifest:update', () => { outdated.value = true })
</script>

<template>
  <div v-if="outdated" class="update" role="status">
    <span>{{ t('common.updateAvailable') }}</span>
    <button type="button" class="btn btn-primary btn-sm" @click="reloadNuxtApp({ force: true })">{{ t('common.refresh') }}</button>
    <button type="button" class="dismiss" :aria-label="t('common.close')" @click="outdated = false">✕</button>
  </div>
</template>

<style scoped>
.update {
  position: fixed; z-index: 1000; left: 50%; bottom: calc(1rem + env(safe-area-inset-bottom)); translate: -50% 0;
  display: flex; align-items: center; gap: 0.75rem; width: max-content; max-width: calc(100vw - 2rem);
  padding: 0.6rem 0.6rem 0.6rem 1rem; border-radius: 999px;
  background: var(--c-surface, #fff); color: var(--c-text, #222); box-shadow: 0 8px 24px -8px rgb(0 0 0 / 0.35);
  font-size: 0.9rem;
}
.dismiss { width: 32px; height: 32px; border: 0; border-radius: 50%; background: none; color: inherit; cursor: pointer; }
</style>
