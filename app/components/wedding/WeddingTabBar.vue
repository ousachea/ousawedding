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

// Below the sections: switches for the tilt effect and full screen, each shown only where the phone has it
const motion = useMotion()
const fullscreen = useFullscreen()
const switches = computed(() => Number(motion.supported.value) + Number(fullscreen.supported.value))

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
  motion.init()
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
        <li v-for="(s, i) in tabs" :key="s.id" :style="{ '--i': tabs.length - 1 - i + switches }">
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
        <li v-if="motion.supported.value" class="first-switch" :style="{ '--i': switches - 1 }">
          <button type="button" class="tab switch" :aria-pressed="motion.on.value" @click="motion.toggle">
            <WeddingIcon name="tilt" class="tab-icon" />
            <span class="tab-label">{{ t('motion.label') }}</span>
            <span class="state">{{ motion.on.value ? t('motion.on') : t('motion.off') }}</span>
          </button>
        </li>
        <li v-if="fullscreen.supported.value" :class="{ 'first-switch': !motion.supported.value }" :style="{ '--i': 0 }">
          <button type="button" class="tab switch" :aria-pressed="fullscreen.on.value" @click="fullscreen.toggle(); open = false">
            <WeddingIcon :name="fullscreen.on.value ? 'shrink' : 'expand'" class="tab-icon" />
            <span class="tab-label">{{ fullscreen.on.value ? t('fullscreen.exit') : t('fullscreen.enter') }}</span>
          </button>
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
        <Transition name="swap">
          <WeddingIcon :key="open ? 'close' : currentIcon" :name="open ? 'close' : currentIcon" class="fab-icon" />
        </Transition>
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
  border: 1px solid color-mix(in oklab, var(--c-gold) 55%, transparent);
  border-radius: 50%;
  background: color-mix(in oklab, var(--c-bg) 55%, transparent);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 8px 24px -10px rgb(0 0 0 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.35);
  color: var(--c-gold-ink);
  cursor: pointer;
  transition: transform 0.2s var(--ease-out);
}
.fab:active { transform: scale(1.02, 0.97); }
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
  border: 1px solid color-mix(in oklab, var(--c-gold) 55%, transparent);
  border-radius: 1.5rem;
  /* Nearly solid: the labels stay readable over dark photos */
  background: color-mix(in oklab, var(--c-bg) 92%, transparent);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 12px 32px -12px rgb(0 0 0 / 0.4), inset 0 1px 0 rgb(255 255 255 / 0.35);
  transform-origin: 0 100%;
  opacity: 0;
  scale: 0.95;
  visibility: hidden;
  transition: opacity 0.16s var(--ease-out), scale 0.2s var(--ease-out), visibility 0s linear 0.2s;
}
.open .menu { opacity: 1; scale: 1; visibility: visible; transition-delay: 0s; transition-duration: 0.2s, 0.25s, 0s; }
.tab {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  /* At least a 44px tap target */
  min-height: 2.9rem;
  padding: 0.25rem 1.1rem 0.25rem 0.9rem;
  border-radius: calc(1.5rem - 0.35rem - 1px);
  color: var(--c-gold-ink);
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.2s;
}
.tab-icon { font-size: 1.35rem; stroke-width: 1.8; }
.tab-label { font-size: 0.95rem; font-weight: 500; letter-spacing: 0.02em; }
.tab-label:lang(km) { font-size: 0.9rem; }
@media (hover: hover) { .tab:hover { background: color-mix(in oklab, var(--c-gold) 10%, transparent); } }
/* Current: on a gold wash. Never bolder, which would widen the list */
.tab.current { background: color-mix(in oklab, var(--c-gold) 18%, transparent); }
.tab:active { background: color-mix(in oklab, var(--c-gold) 22%, transparent); }
/* The switches: set apart from the sections by a thin rule; On/Off as a small pill at the end */
.first-switch { margin-top: 0.3rem; padding-top: 0.3rem; border-top: 1px solid color-mix(in oklab, var(--c-gold) 35%, transparent); }
.switch { width: 100%; border: 0; background: none; font: inherit; cursor: pointer; text-align: left; }
.state {
  margin-left: auto; padding: 0.05rem 0.55rem; border-radius: 999px; font-size: 0.75rem;
  border: 1px solid color-mix(in oklab, var(--c-gold) 55%, transparent); color: var(--c-gold-ink);
}
.switch[aria-pressed='true'] .state { background: var(--c-gold-deep); border-color: var(--c-gold-deep); color: #fff; }

@media (prefers-reduced-motion: no-preference) {
  /* The rows rise in one after another, nearest the button first */
  .menu li { opacity: 0; translate: 0 6px; transition: opacity 0.2s var(--ease-out), translate 0.25s var(--ease-out); }
  .open .menu li { opacity: 1; translate: 0 0; transition-delay: calc(var(--i) * 30ms); }
}
</style>
