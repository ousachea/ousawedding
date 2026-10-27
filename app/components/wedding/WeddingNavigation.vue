<script setup lang="ts">
// The top bar: monogram, music and language, with the reading progress along its edge.
// The sections themselves are in the bottom bar (WeddingTabBar).
defineProps<{ musicUrl?: string, monogram: string }>()
</script>

<template>
  <header class="nav">
    <div class="nav-inner container">
      <a href="#home" class="mono">{{ monogram }}</a>
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
.mono { margin-right: auto; font-family: var(--font-serif); font-size: 1.15rem; color: var(--c-accent-ink); text-decoration: none; white-space: nowrap; }
/* Reading progress, driven by page scroll where supported */
.progress { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--c-accent); transform: scaleX(0); transform-origin: left; }
@supports (animation-timeline: scroll()) {
  @media (prefers-reduced-motion: no-preference) {
    .progress { animation: progress linear both; animation-timeline: scroll(root); }
  }
}
@keyframes progress { to { transform: scaleX(1); } }
.tools { display: flex; align-items: center; gap: var(--space-2); }
</style>
