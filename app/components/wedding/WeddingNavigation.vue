<script setup lang="ts">
const props = defineProps<{ sections: Array<{ id: string, label: string }>, musicUrl?: string, monogram: string }>()
const { t } = useI18n()

// Scroll-spy: the section crossing ~40% down the screen is "current"; its link is highlighted
// and, when the links overflow (phones), scrolled to the middle of the bar
const current = ref('')
const links = ref<HTMLElement>()
let io: IntersectionObserver | undefined
function spy() {
  io?.disconnect()
  if (!('IntersectionObserver' in window)) return
  io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) current.value = en.target.id
  }, { rootMargin: '-40% 0px -55% 0px' })
  for (const s of props.sections) {
    const el = document.getElementById(s.id)
    if (el) io.observe(el)
  }
}
onMounted(spy)
// Sections come and go with content (e.g. the story), so watch again when the list changes
watch(() => props.sections.map(s => s.id).join(), () => nextTick(spy))
onBeforeUnmount(() => io?.disconnect())
watch(current, (id) => {
  const bar = links.value
  const link = bar?.querySelector<HTMLElement>(`a[href="#${id}"]`)
  if (bar && link) bar.scrollTo({ left: link.offsetLeft - (bar.clientWidth - link.offsetWidth) / 2, behavior: 'smooth' })
})
</script>

<template>
  <header class="nav">
    <div class="nav-inner container">
      <a href="#home" class="mono">{{ monogram }}</a>
      <nav ref="links" :aria-label="t('nav.label')" class="links">
        <a v-for="s in sections" :key="s.id" :href="`#${s.id}`" :class="{ current: current === s.id }" :aria-current="current === s.id ? 'location' : undefined">{{ s.label }}</a>
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
  position: relative;
  /* Both edges fade, since the current link scrolls to the middle */
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
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
.links a.current { color: var(--c-secondary); font-weight: 600; background: color-mix(in srgb, var(--c-secondary) 10%, transparent); }
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
