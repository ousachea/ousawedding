<script setup lang="ts">
import type WeddingIcon from './WeddingIcon.vue'

type IconName = InstanceType<typeof WeddingIcon>['$props']['name']
// The sections as icons in a bar along the bottom of the screen, within thumb reach on a phone.
// Sticky at the very end of the page, so it stays on screen while scrolling yet never covers the footer.
const props = defineProps<{ sections: Array<{ id: string, label: string, icon: IconName }> }>()
const { t } = useI18n()

const tabs = computed(() => [{ id: 'home', label: t('nav.home'), icon: 'rings' as IconName }, ...props.sections])

// Scroll-spy: the section crossing ~40% down the screen is "current" and its tab is highlighted
const current = ref('home')
let io: IntersectionObserver | undefined
function spy() {
  io?.disconnect()
  if (!('IntersectionObserver' in window)) return
  io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) current.value = en.target.id
  }, { rootMargin: '-40% 0px -55% 0px' })
  for (const s of tabs.value) {
    const el = document.getElementById(s.id)
    if (el) io.observe(el)
  }
}
onMounted(spy)
// Sections come and go with content (e.g. the story), so watch again when the list changes
watch(() => props.sections.map(s => s.id).join(), () => nextTick(spy))
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <nav class="tabbar" :aria-label="t('nav.label')">
    <a
      v-for="s in tabs"
      :key="s.id"
      :href="`#${s.id}`"
      class="tab"
      :class="{ current: current === s.id }"
      :aria-current="current === s.id ? 'location' : undefined"
    >
      <WeddingIcon :name="s.icon" class="tab-icon" />
      <span class="tab-label">{{ s.label }}</span>
    </a>
  </nav>
</template>

<style scoped>
.tabbar {
  position: sticky;
  bottom: 0;
  z-index: var(--z-nav);
  display: flex;
  justify-content: center;
  padding: var(--space-1) var(--space-2) max(var(--space-1), env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--c-bg) 90%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid var(--c-line-soft);
}
.tab {
  /* Equal widths, at least a 44px tap target */
  flex: 1 1 0;
  max-width: 6.5rem;
  min-width: 0;
  min-height: 3.1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: var(--space-1) 2px;
  border-radius: var(--radius);
  color: var(--c-muted);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s;
}
.tab-icon { font-size: 1.45rem; transition: transform 0.25s var(--ease-out); }
.tab-label { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.68rem; letter-spacing: 0.02em; }
.tab-label:lang(km) { font-size: 0.72rem; }
.tab:hover { color: var(--c-text); }
.tab.current { color: var(--c-secondary); }
.tab.current .tab-label { font-weight: 600; }
.tab:active .tab-icon { transform: scale(0.9); }
/* A small dot under the current tab */
.tab::after { content: ''; width: 4px; height: 4px; margin-top: 1px; border-radius: 50%; background: currentColor; opacity: 0; transition: opacity 0.2s; }
.tab.current::after { opacity: 1; }
@media (prefers-reduced-motion: no-preference) {
  .tab.current .tab-icon { transform: translateY(-1px) scale(1.06); }
}
</style>
