<script setup lang="ts">
defineProps<{ data: PublicWedding }>()
const { t } = useI18n()
const locale = useLocaleCode()
</script>

<template>
  <footer class="footer">
    <WeddingOrnament v-reveal :motif="data.wedding.theme.motif" kind="flower" />
    <WeddingIcon v-reveal="100" name="rings" class="rings" />
    <p v-reveal="100" class="thanks">{{ t('footer.thanks') }}</p>
    <p v-reveal="200" class="names">{{ data.wedding.names[locale].partner1 }} &amp; {{ data.wedding.names[locale].partner2 }}</p>
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
@media (prefers-reduced-motion: no-preference) {
  .footer :deep(.flower g) { transform-box: fill-box; transform-origin: 50% 95%; animation: sway 6s ease-in-out infinite; }
}
@keyframes sway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
.rings { font-size: 34px; color: color-mix(in srgb, var(--c-accent) 70%, #fff); }
.thanks { font-size: 0.95rem; opacity: 0.85; }
.names { font-family: var(--font-heading); font-size: 2rem; }
.date { font-size: 0.9rem; opacity: 0.85; }
</style>
