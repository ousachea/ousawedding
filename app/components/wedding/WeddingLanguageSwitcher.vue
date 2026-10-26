<script setup lang="ts">
const { locale, locales, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
</script>

<template>
  <nav class="lang" :aria-label="t('common.language')">
    <NuxtLink
      v-for="l in locales"
      :key="l.code"
      :to="switchLocalePath(l.code)"
      :lang="l.code"
      :aria-current="l.code === locale ? 'true' : undefined"
      class="lang-link"
    >
      {{ l.code === 'km' ? 'ខ្មែរ' : 'EN' }}
    </NuxtLink>
  </nav>
</template>

<style scoped>
.lang { display: inline-flex; border: 1px solid var(--c-line); border-radius: 999px; padding: 2px; background: var(--c-surface); }
.lang-link {
  min-width: 44px; min-height: 32px; padding: 0 0.7rem;
  display: grid; place-items: center;
  border-radius: 999px; font-size: 0.85rem; text-decoration: none; color: var(--c-muted);
  transition: background-color 0.2s, color 0.2s;
}
.lang-link[aria-current] { background: var(--c-secondary); color: var(--c-on-secondary); }
</style>
