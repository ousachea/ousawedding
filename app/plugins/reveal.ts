import type { Directive } from 'vue'

// v-reveal: fades an element up the first time it scrolls into view.
// v-reveal="120" adds a 120ms delay (for staggering). Content is only hidden once JavaScript
// is running and motion is allowed, so it never stays invisible.
let observer: IntersectionObserver | undefined

const reveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, { value }) {
    // A component that rendered nothing (e.g. an ornament set to "none") has no element to animate
    if (!(el instanceof Element)) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    const rect = el.getBoundingClientRect()
    // Already on screen at load: leave it alone rather than flash it out and back in
    if (rect.top < innerHeight && rect.bottom > 0) return
    if (value) el.style.setProperty('--reveal-delay', `${value}ms`)
    el.classList.add('reveal-init')
    observer ??= new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('revealed')
        observer!.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 })
    observer.observe(el)
  },
  unmounted(el) {
    observer?.unobserve(el)
  },
  getSSRProps: () => ({}),
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', reveal)
})
