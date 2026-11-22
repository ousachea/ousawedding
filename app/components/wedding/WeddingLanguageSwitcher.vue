<script setup lang="ts">
// Two-way switch: a pill slides to the language picked, and the page cross-fades into it.
// Khmer and English take different room, so the same scroll position would land somewhere else: the element at
// the top of the screen is held where it was instead. The page is kept (same key, see [slug].vue), so it is the
// same element afterwards with new words.
const { locale, locales, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const router = useRouter()
const index = computed(() => Math.max(0, locales.value.findIndex(l => l.code === locale.value)))

// The first element under the bar, near the middle of the screen, and how far it is from the top
function anchor() {
  const y = Math.min(innerHeight * 0.3, 160)
  let el = document.elementFromPoint(innerWidth / 2, y) as HTMLElement | null
  // A small inline bit (a word, an icon) moves with its line; its block is steadier
  while (el && el !== document.body && getComputedStyle(el).display.startsWith('inline')) el = el.parentElement
  return el && el !== document.body ? { el, top: el.getBoundingClientRect().top } : null
}
function hold(a: ReturnType<typeof anchor>) {
  if (!a?.el.isConnected) return
  const by = a.el.getBoundingClientRect().top - a.top
  if (Math.abs(by) > 1) scrollTo({ top: scrollY + by, behavior: 'instant' })
}

async function pick(code: string, e: MouseEvent) {
  if (code === locale.value || e.metaKey || e.ctrlKey || e.shiftKey) return
  e.preventDefault()
  const a = anchor()
  // Without the #section: the router would jump there
  const to = switchLocalePath(code as 'en' | 'km').split('#')[0]!
  const swap = async () => {
    await router.replace(to)
    await nextTick()
    hold(a)
  }
  const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> } }
  if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) await doc.startViewTransition(swap).finished.catch(() => {})
  else await swap()
  // Khmer fonts may still be loading and change line heights: hold the place again once they are in
  document.fonts?.ready.then(() => hold(a))
}
</script>

<template>
  <nav class="lang" :aria-label="t('common.language')" :style="{ '--at': index }">
    <span class="thumb" aria-hidden="true" />
    <NuxtLink
      v-for="l in locales"
      :key="l.code"
      :to="switchLocalePath(l.code)"
      :lang="l.code"
      :aria-current="l.code === locale ? 'true' : undefined"
      class="lang-link"
      @click="pick(l.code, $event)"
    >
      {{ l.code === 'km' ? 'ខ្មែរ' : 'EN' }}
    </NuxtLink>
  </nav>
</template>

<style scoped>
/* Two equal halves, so the pill is half the width and slides by its own width */
.lang {
  position: relative; display: inline-grid; grid-template-columns: 1fr 1fr;
  border: 1px solid var(--c-line); border-radius: 999px; padding: 2px; background: var(--c-surface);
  /* Kept out of the page's cross-fade, so the pill is seen sliding rather than fading */
  view-transition-name: lang-switch;
}
.thumb {
  position: absolute; top: 2px; bottom: 2px; left: 2px; width: calc(50% - 2px);
  border-radius: 999px; background: var(--c-secondary); box-shadow: 0 2px 6px -2px rgb(0 0 0 / 0.3);
  transform: translateX(calc(var(--at) * 100%));
  transition: transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.lang-link {
  position: relative; min-width: 44px; min-height: 32px; padding: 0 0.7rem;
  display: grid; place-items: center;
  border-radius: 999px; font-size: 0.85rem; text-decoration: none; color: var(--c-muted);
  transition: color 0.3s;
  -webkit-tap-highlight-color: transparent;
}
.lang-link[aria-current] { color: var(--c-on-secondary); }
.lang-link:active { scale: 0.94; }
@media (prefers-reduced-motion: reduce) { .thumb { transition: none; } }
</style>
