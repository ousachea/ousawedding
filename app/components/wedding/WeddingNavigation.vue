<script setup lang="ts">
defineProps<{ sections: Array<{ id: string, label: string }>, musicUrl?: string, monogram: string }>()
const { t } = useI18n()
</script>

<template>
  <header class="nav">
    <div class="nav-inner container">
      <a href="#home" class="mono">{{ monogram }}</a>
      <nav :aria-label="t('nav.label')" class="links">
        <a v-for="s in sections" :key="s.id" :href="`#${s.id}`">{{ s.label }}</a>
      </nav>
      <div class="tools">
        <WeddingMusic v-if="musicUrl" :src="musicUrl" />
        <WeddingLanguageSwitcher />
      </div>
    </div>
    <span class="progress" aria-hidden="true" />
  </header>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: var(--z-nav);
  padding-top: env(safe-area-inset-top);
  background: color-mix(in srgb, var(--c-bg) 90%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--c-line-soft);
}
.nav-inner { display: flex; align-items: center; gap: var(--space-4); min-height: 3.75rem; }
.mono { font-family: var(--font-serif); font-size: 1.15rem; color: var(--c-accent-ink); text-decoration: none; white-space: nowrap; }
.links {
  flex: 1;
  display: flex;
  gap: var(--space-1);
  overflow-x: auto;
  scrollbar-width: none;
  mask-image: linear-gradient(90deg, #000 85%, transparent);
}
.links::-webkit-scrollbar { display: none; }
.links a {
  flex: none;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  font-size: 0.88rem;
  text-decoration: none;
  color: var(--c-muted);
  transition: color 0.2s, background-color 0.2s;
}
.links a:hover { color: var(--c-text); background: var(--c-line-soft); }
/* Reading progress, driven by page scroll where supported */
.progress { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--c-accent); transform: scaleX(0); transform-origin: left; }
@supports (animation-timeline: scroll()) {
  @media (prefers-reduced-motion: no-preference) {
    .progress { animation: progress linear both; animation-timeline: scroll(root); }
  }
}
@keyframes progress { to { transform: scaleX(1); } }
.tools { display: flex; align-items: center; gap: var(--space-2); }
@media (min-width: 720px) { .links { justify-content: center; mask-image: none; } }
</style>
