<script setup lang="ts">
defineProps<{ data: PublicWedding }>()
const { t } = useI18n()
const locale = useLocaleCode()
</script>

<template>
  <footer class="footer">
    <WeddingOrnament :motif="data.wedding.theme.motif" kind="flower" />
    <p class="thanks">{{ t('footer.thanks') }}</p>
    <p class="names">{{ data.wedding.names[locale].partner1 }} &amp; {{ data.wedding.names[locale].partner2 }}</p>
    <p class="date">{{ data.display[locale].date }}</p>
  </footer>
</template>

<style scoped>
.footer {
  display: flex; flex-direction: column; align-items: center; gap: var(--space-2); text-align: center;
  padding: var(--space-8) 1rem calc(var(--space-7) + env(safe-area-inset-bottom));
  background: var(--c-secondary); color: var(--c-on-secondary);
}
.footer :deep(.ornament) { color: color-mix(in srgb, var(--c-accent) 70%, #fff); }
.thanks { font-size: 0.95rem; opacity: 0.85; }
.names { font-family: var(--font-heading); font-size: 2rem; }
.date { font-size: 0.9rem; opacity: 0.85; }
</style>
