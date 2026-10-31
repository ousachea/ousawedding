<script setup lang="ts">
import type WeddingIcon from './WeddingIcon.vue'

type IconName = InstanceType<typeof WeddingIcon>['$props']['name']
// One round button in the bottom corner, within thumb reach on a phone, showing the current section's icon.
// Tapping it opens the sections as a list above it; picking one jumps there and closes the list.
// Sticky at the very end of the page, so it stays on screen while scrolling yet never covers the footer.
const props = defineProps<{ sections: Array<{ id: string, label: string, icon: IconName }> }>()
const { t } = useI18n()
const menuId = useId()
// Slides down out of the way while scrolling down, back when scrolling up
const hidden = useBarsHidden()
const open = ref(false)

const tabs = computed(() => [{ id: 'home', label: t('nav.home'), icon: 'rings' as IconName }, ...props.sections])

// Scroll-spy: the section crossing ~40% down the screen is "current" and its tab is highlighted
const current = ref('home')
const currentIcon = computed(() => tabs.value.find(s => s.id === current.value)?.icon ?? 'rings')
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

// Closes on a tap anywhere else, or Escape
const nav = ref<HTMLElement>()
const onPointer = (e: PointerEvent) => { if (open.value && !nav.value?.contains(e.target as Node)) open.value = false }
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') open.value = false }
onMounted(() => {
  spy()
  addEventListener('pointerdown', onPointer)
  addEventListener('keydown', onKey)
})
// Sections come and go with content (e.g. the story), so watch again when the list changes
watch(() => props.sections.map(s => s.id).join(), () => nextTick(spy))
onBeforeUnmount(() => {
  io?.disconnect()
  removeEventListener('pointerdown', onPointer)
  removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="dock" :class="{ tucked: hidden && !open }">
    <nav ref="nav" class="fab-nav" :class="{ open }" :aria-label="t('nav.label')">
      <ul :id="menuId" class="menu" :inert="!open">
        <li v-for="(s, i) in tabs" :key="s.id" :style="{ '--i': tabs.length - 1 - i }">
          <a
            :href="`#${s.id}`"
            class="tab"
            :class="{ current: current === s.id }"
            :aria-current="current === s.id ? 'location' : undefined"
            @click="open = false"
          >
            <WeddingIcon :name="s.icon" class="tab-icon" />
            <span class="tab-label">{{ s.label }}</span>
          </a>
        </li>
      </ul>
      <button
        type="button"
        class="fab"
        :aria-expanded="open"
        :aria-controls="menuId"
        :aria-label="open ? t('nav.close') : t('nav.open')"
        @click="open = !open"
      >
        <WeddingIcon :key="open ? 'close' : currentIcon" :name="open ? 'close' : currentIcon" class="fab-icon" />
      </button>
    </nav>
  </div>
</template>

<style scoped>
/* Sticky at the end of the page, lifted off the bottom edge, in the bottom-left corner. The blur behind the button
   and the list keeps the gold icons readable over photos and text. */
.dock {
  position: sticky;
  bottom: max(1rem, env(safe-area-inset-bottom));
  z-index: var(--z-nav);
  display: flex;
  justify-content: flex-start;
  padding-inline: 1rem;
  /* Only the button and the open list take taps */
  pointer-events: none;
  transition: transform 0.35s var(--ease-out), opacity 0.35s var(--ease-out);
}
.dock.tucked { transform: translateY(calc(100% + 1.5rem)); opacity: 0; }
.dock.tucked .fab-nav { pointer-events: none; }
@media (prefers-reduced-motion: reduce) { .dock { transition: none; } }
.fab-nav { position: relative; pointer-events: auto; }

.fab {
  display: grid;
  place-items: center;
  width: 4rem;
  height: 4rem;
  border: 1px solid color-mix(in srgb, var(--c-gold) 55%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--c-bg) 55%, transparent);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 8px 24px -10px rgb(0 0 0 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.35);
  color: var(--c-gold-deep);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s var(--ease-out);
}
.fab:active { transform: scale(0.94); }
.fab-icon { font-size: 1.75rem; stroke-width: 1.6; }

/* The list grows up and out of the button's corner */
.menu {
  position: absolute;
  left: 0;
  bottom: calc(100% + 0.6rem);
  min-width: 11rem;
  margin: 0;
  padding: 0.35rem;
  list-style: none;
  border: 1px solid color-mix(in srgb, var(--c-gold) 55%, transparent);
  border-radius: 1.5rem;
  background: color-mix(in srgb, var(--c-bg) 70%, transparent);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 12px 32px -12px rgb(0 0 0 / 0.4), inset 0 1px 0 rgb(255 255 255 / 0.35);
  transform-origin: 0 100%;
  opacity: 0;
  scale: 0.9;
  visibility: hidden;
  transition: opacity 0.2s var(--ease-out), scale 0.25s var(--ease-out), visibility 0s linear 0.25s;
}
.open .menu { opacity: 1; scale: 1; visibility: visible; transition-delay: 0s; }
.tab {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  /* At least a 44px tap target */
  min-height: 2.9rem;
  padding: 0.25rem 1.1rem 0.25rem 0.9rem;
  border-radius: 999px;
  color: var(--c-gold);
  text-decoration: none;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s, background-color 0.2s;
}
.tab-icon { font-size: 1.35rem; stroke-width: 1.6; }
.tab-label { font-size: 0.95rem; letter-spacing: 0.02em; }
.tab-label:lang(km) { font-size: 0.9rem; }
.tab:hover { color: color-mix(in srgb, var(--c-gold) 60%, var(--c-gold-deep)); }
/* Current: a deeper, richer gold (easier to read on the light page), bolder, on a faint gold wash */
.tab.current { color: var(--c-gold-deep); background: color-mix(in srgb, var(--c-gold) 14%, transparent); }
.tab.current .tab-label { font-weight: 600; }
.tab:active { background: color-mix(in srgb, var(--c-gold) 22%, transparent); }

@media (prefers-reduced-motion: no-preference) {
  /* The rows rise in one after another, nearest the button first */
  .menu li { opacity: 0; translate: 0 6px; transition: opacity 0.2s var(--ease-out), translate 0.25s var(--ease-out); }
  .open .menu li { opacity: 1; translate: 0 0; transition-delay: calc(var(--i) * 30ms); }
  .fab-icon { animation: pop 0.25s var(--ease-out); }
}
@keyframes pop { from { opacity: 0; rotate: -45deg; scale: 0.7; } }
</style>
