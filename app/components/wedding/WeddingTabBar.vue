<script setup lang="ts">
import type WeddingIcon from './WeddingIcon.vue'

type IconName = InstanceType<typeof WeddingIcon>['$props']['name']
// The sections as icons in a bar along the bottom of the screen, within thumb reach on a phone.
// Sticky at the very end of the page, so it stays on screen while scrolling yet never covers the footer.
const props = defineProps<{ sections: Array<{ id: string, label: string, icon: IconName }> }>()
const { t } = useI18n()
// Slides down out of the way while scrolling down, back when scrolling up
const hidden = useBarsHidden()

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
  <div class="dock" :class="{ tucked: hidden }">
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
  </div>
</template>

<style scoped>
/* A floating pill: sticky at the end of the page, lifted off the bottom edge, with no fill of its own.
   The blur behind it keeps the gold icons readable over photos and text. */
.dock {
  position: sticky;
  bottom: max(0.75rem, env(safe-area-inset-bottom));
  z-index: var(--z-nav);
  display: flex;
  justify-content: center;
  padding-inline: 0.75rem;
  /* Only the pill takes taps */
  pointer-events: none;
  transition: transform 0.35s var(--ease-out), opacity 0.35s var(--ease-out);
}
.dock.tucked { transform: translateY(calc(100% + 1.5rem)); opacity: 0; }
.dock.tucked .tabbar { pointer-events: none; }
@media (prefers-reduced-motion: reduce) { .dock { transition: none; } }
.tabbar {
  pointer-events: auto;
  display: flex;
  width: min(100%, 26rem);
  padding: 0.3rem;
  border: 1px solid color-mix(in srgb, var(--c-gold) 55%, transparent);
  border-radius: 999px;
  background: transparent;
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 8px 24px -10px rgb(0 0 0 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.35);
}
.tab {
  /* Equal widths, at least a 44px tap target */
  flex: 1 1 0;
  min-width: 0;
  min-height: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 0.2rem 2px;
  border-radius: 999px;
  color: var(--c-gold);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s;
}
.tab-icon { font-size: 1.4rem; stroke-width: 1.6; transition: transform 0.25s var(--ease-out); }
.tab-label { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.66rem; letter-spacing: 0.02em; }
.tab-label:lang(km) { font-size: 0.7rem; }
.tab:hover { color: color-mix(in srgb, var(--c-gold) 60%, var(--c-gold-deep)); }
/* Current: a deeper, richer gold (easier to read on the light page), bolder, with a small gold dot */
.tab.current { color: var(--c-gold-deep); }
.tab.current .tab-label { font-weight: 600; }
.tab:active .tab-icon { transform: scale(0.9); }
.tab::after { content: ''; width: 4px; height: 4px; border-radius: 50%; background: currentColor; opacity: 0; transition: opacity 0.2s; }
.tab.current::after { opacity: 1; }
@media (prefers-reduced-motion: no-preference) {
  .tab.current .tab-icon { transform: translateY(-1px) scale(1.08); }
}
</style>
