<script setup lang="ts">
const props = defineProps<{ images: PublicWedding['gallery'], motif: Motif, names: string }>()
const { t } = useI18n()
const L = useLocalized()

const dialog = ref<HTMLDialogElement>()
const index = ref(0)
const current = computed(() => props.images[index.value])
// Photos without alt text or a caption still get a description, so screen readers don't skip them
const altFor = (img: PublicWedding['gallery'][number], i: number) =>
  L(img.alt) || L(img.caption) || t('gallery.alt', { names: props.names, n: i + 1, total: props.images.length })

function open(i: number) {
  index.value = i
  dialog.value?.showModal()
}
const go = (step: number) => {
  index.value = (index.value + step + props.images.length) % props.images.length
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') go(1)
  else if (e.key === 'ArrowLeft') go(-1)
}

let touchX: number | null = null
const onTouchStart = (e: TouchEvent) => (touchX = e.touches[0]!.clientX)
function onTouchEnd(e: TouchEvent) {
  if (touchX === null) return
  const dx = e.changedTouches[0]!.clientX - touchX
  if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
  touchX = null
}

// Carousel: a sideways scroller that snaps each photo to the middle. To loop, copies of the last and first
// photos sit at either end; landing on a copy jumps (invisibly) to the real photo it shows.
const track = ref<HTMLElement>()
const count = computed(() => props.images.length)
const loops = computed(() => count.value > 1)
const extra = computed(() => (loops.value ? Math.min(2, count.value) : 0))
const slides = computed(() => {
  const all = props.images.map((img, i) => ({ img, real: i, copy: false }))
  if (!loops.value) return all
  const k = extra.value
  return [
    ...all.slice(-k).map(s => ({ ...s, copy: true })),
    ...all,
    ...all.slice(0, k).map(s => ({ ...s, copy: true })),
  ]
})
// Position in `slides`, and the real photo it shows
const pos = ref(extra.value)
const shown = computed(() => slides.value[pos.value]?.real ?? 0)

const slideEls = () => (track.value ? [...track.value.children] as HTMLElement[] : [])
function goTo(p: number, smooth = true) {
  const t = track.value
  const el = slideEls()[Math.max(0, Math.min(p, slides.value.length - 1))]
  if (!t || !el) return
  t.scrollTo({ left: el.offsetLeft - (t.clientWidth - el.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'instant' })
}
// The slide nearest the middle of the track
function nearest() {
  const t = track.value
  if (!t) return pos.value
  const middle = t.scrollLeft + t.clientWidth / 2
  let best = 0
  let bestDist = Infinity
  slideEls().forEach((el, i) => {
    const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - middle)
    if (d < bestDist) [best, bestDist] = [i, d]
  })
  return best
}
let settle: ReturnType<typeof setTimeout> | undefined
function onScroll() {
  pos.value = nearest()
  // Once scrolling stops on a copy, swap to the real photo
  clearTimeout(settle)
  settle = setTimeout(() => {
    const p = nearest()
    if (p < extra.value) goTo(p + count.value, false)
    else if (p >= extra.value + count.value) goTo(p - count.value, false)
  }, 140)
}
const step = (by: number) => goTo(nearest() + by)

// Autoplay: one slide every few seconds while the gallery is on screen and nobody is touching it
let autoplay: ReturnType<typeof setInterval> | undefined
let holdUntil = 0
let onScreen = false
let seen: IntersectionObserver | undefined
const hold = () => (holdUntil = Date.now() + 6000)
const onResize = () => goTo(pos.value, false)
onMounted(async () => {
  await nextTick()
  goTo(extra.value, false)
  addEventListener('resize', onResize)
  if (!loops.value || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  seen = new IntersectionObserver(([en]) => (onScreen = !!en?.isIntersecting), { threshold: 0.5 })
  if (track.value) seen.observe(track.value)
  autoplay = setInterval(() => {
    if (onScreen && !document.hidden && Date.now() > holdUntil && !dialog.value?.open) step(1)
  }, 4500)
})
onBeforeUnmount(() => {
  clearInterval(autoplay)
  clearTimeout(settle)
  seen?.disconnect()
  removeEventListener('resize', onResize)
})
</script>

<template>
  <section id="gallery" class="gallery" aria-labelledby="gallery-title">
    <div class="container">
      <span v-reveal class="section-icon"><WeddingIcon name="camera" /></span>
      <h2 v-reveal id="gallery-title" class="section-title">{{ t('gallery.title') }}</h2>
      <WeddingOrnament v-reveal="100" :motif="motif" />
      <div v-reveal="150" class="carousel" @pointerdown="hold" @touchstart.passive="hold" @mouseenter="hold" @focusin="hold">
        <ul ref="track" class="track" :class="{ single: !loops }" :aria-label="t('gallery.title')" @scroll.passive="onScroll">
          <li
            v-for="(s, p) in slides"
            :key="`${s.img.id}-${p}`"
            class="slide"
            :class="{ current: p === pos }"
            :aria-hidden="s.copy || undefined"
          >
            <button type="button" class="thumb" :tabindex="s.copy ? -1 : undefined" :aria-label="t('gallery.open', { n: s.real + 1 })" @click="open(s.real)">
              <span class="pic">
                <img
                  :src="s.img.url"
                  :srcset="s.img.thumbUrl && s.img.thumbUrl !== s.img.url ? `${s.img.thumbUrl} 427w, ${s.img.url} ${s.img.width}w` : undefined"
                  sizes="(min-width: 760px) 22rem, 76vw"
                  :alt="s.copy ? '' : altFor(s.img, s.real)"
                  :width="s.img.width"
                  :height="s.img.height"
                  loading="lazy"
                  decoding="async"
                >
              </span>
            </button>
            <p v-if="L(s.img.caption)" class="caption">{{ L(s.img.caption) }}</p>
          </li>
        </ul>
        <div v-if="loops" class="controls">
          <button type="button" class="ctrl" :aria-label="t('common.previous')" @click="hold(); step(-1)">‹</button>
          <div class="dots">
            <button
              v-for="(img, i) in images"
              :key="img.id"
              type="button"
              class="dot"
              :class="{ on: i === shown }"
              :aria-label="t('gallery.counter', { n: i + 1, total: count })"
              :aria-current="i === shown || undefined"
              @click="hold(); goTo(extra + i)"
            />
          </div>
          <button type="button" class="ctrl" :aria-label="t('common.next')" @click="hold(); step(1)">›</button>
        </div>
      </div>
    </div>

    <dialog ref="dialog" class="viewer" :aria-label="t('gallery.viewer')" @keydown="onKey" @click.self="dialog?.close()">
      <div v-if="current" class="viewer-inner" @touchstart.passive="onTouchStart" @touchend="onTouchEnd">
        <Transition name="photo" mode="out-in">
          <img :key="current.id" :src="current.url" :alt="altFor(current, index)" :width="current.width" :height="current.height" loading="lazy" decoding="async">
        </Transition>
        <p class="viewer-caption">
          <span class="tabular">{{ t('gallery.counter', { n: index + 1, total: images.length }) }}</span>
          <span v-if="L(current.caption)"> · {{ L(current.caption) }}</span>
        </p>
      </div>
      <button type="button" class="nav-btn close" :aria-label="t('common.close')" @click="dialog?.close()">✕</button>
      <template v-if="images.length > 1">
        <button type="button" class="nav-btn prev" :aria-label="t('common.previous')" @click="go(-1)">‹</button>
        <button type="button" class="nav-btn next" :aria-label="t('common.next')" @click="go(1)">›</button>
      </template>
    </dialog>
  </section>
</template>

<style scoped>
.gallery { padding-block: var(--space-8); background: var(--c-surface); border-block: 1px solid var(--c-line-soft); }
.section-title { text-align: center; font-size: clamp(1.9rem, 6vw, 2.6rem); margin-bottom: var(--space-3); }
.carousel { margin-top: var(--space-6); }
/* Sideways scroller; each photo snaps to the middle with its neighbours peeking in */
.track {
  position: relative;
  display: flex;
  gap: var(--space-4);
  margin: 0;
  padding: var(--space-4) 0 var(--space-5);
  list-style: none;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.track::-webkit-scrollbar { display: none; }
.track.single { justify-content: center; }
.slide { flex: 0 0 76%; max-width: 22rem; scroll-snap-align: center; transition: opacity 0.4s var(--ease-out), scale 0.4s var(--ease-out); }
/* Photos either side of the current one sit back a little */
.slide:not(.current) { opacity: 0.55; scale: 0.92; }
.track.single .slide { opacity: 1; scale: 1; }

.thumb { display: block; width: 100%; padding: 0; border: 0; border-radius: var(--radius); cursor: zoom-in; background: none; }
/* The photo is clipped inside its frame, so the hover zoom stays within it */
.pic { display: block; overflow: hidden; border-radius: calc(var(--radius) - 4px); background: var(--c-line-soft); }

/* Classic frame: a light mat with a gold edge, an inner gold line and gold corner brackets */
.style-classic .thumb {
  position: relative; padding: 7px;
  background: var(--c-surface); border: 1px solid color-mix(in srgb, var(--c-accent) 60%, transparent);
  box-shadow: var(--shadow-sm);
}
.style-classic .pic { outline: 1px solid color-mix(in srgb, var(--c-accent) 45%, transparent); outline-offset: 2px; }
.style-classic .thumb::after {
  --c: var(--c-accent); --l: 16px; --w: 2px;
  content: ''; position: absolute; inset: -4px; pointer-events: none;
  background:
    linear-gradient(var(--c) 0 0) top left / var(--l) var(--w), linear-gradient(var(--c) 0 0) top left / var(--w) var(--l),
    linear-gradient(var(--c) 0 0) top right / var(--l) var(--w), linear-gradient(var(--c) 0 0) top right / var(--w) var(--l),
    linear-gradient(var(--c) 0 0) bottom left / var(--l) var(--w), linear-gradient(var(--c) 0 0) bottom left / var(--w) var(--l),
    linear-gradient(var(--c) 0 0) bottom right / var(--l) var(--w), linear-gradient(var(--c) 0 0) bottom right / var(--w) var(--l);
  background-repeat: no-repeat;
}

/* Floral frame: printed photos on white paper, tilted left and right, straightening when centred */
.style-floral .thumb {
  padding: 8px 8px 24px; border-radius: 2px; background: #fffdf9;
  box-shadow: 0 10px 22px -12px rgb(60 40 80 / 0.45), 0 1px 2px rgb(60 40 80 / 0.12);
  rotate: -1.6deg; transition: rotate 0.35s var(--ease-out);
}
.style-floral .slide:nth-child(even) .thumb { rotate: 1.4deg; }
.style-floral .slide.current .thumb { rotate: 0deg; }
.style-floral .pic { border-radius: 0; }
.thumb img { width: 100%; transition: scale 0.4s var(--ease-out); outline: 1px solid rgb(0 0 0 / 0.06); outline-offset: -1px; }
@media (hover: hover) { .slide.current .thumb:hover img { scale: 1.04; } }
.caption { font-size: 0.85rem; color: var(--c-muted); margin-top: var(--space-2); text-align: center; }

.controls { display: flex; align-items: center; justify-content: center; gap: var(--space-4); }
.ctrl {
  width: 44px; height: 44px; display: grid; place-items: center; padding: 0 0 2px;
  border: 1px solid var(--c-line); border-radius: 50%; background: none; color: var(--c-accent-ink);
  font-size: 1.5rem; line-height: 1; cursor: pointer; transition: background-color 0.2s;
}
.ctrl:hover { background: var(--c-line-soft); }
.dots { display: flex; gap: 2px; }
/* 24px tap target around an 8px dot; the current one stretches into a pill */
.dot { width: 24px; height: 24px; padding: 0; border: 0; background: none; cursor: pointer; display: grid; place-items: center; }
.dot::before { content: ''; width: 8px; height: 8px; border-radius: 999px; background: var(--c-line); transition: width 0.3s var(--ease-out), background-color 0.3s; }
.dot.on::before { width: 18px; background: var(--c-accent-ink); }
@media (prefers-reduced-motion: reduce) { .slide, .dot::before { transition: none; } }

.viewer {
  width: 100vw; max-width: 100vw; height: 100dvh; max-height: 100dvh; margin: 0; padding: 0; border: 0;
  background: rgb(20 16 15 / 0.94); color: #fff;
}
.viewer::backdrop { background: rgb(20 16 15 / 0.6); }
.viewer[open] { display: grid; place-items: center; animation: fade 0.2s var(--ease-out); }
@keyframes fade { from { opacity: 0; } }
.viewer-inner { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); padding: 3.5rem 1rem 2rem; max-width: 100%; }
.viewer-inner img { max-height: 78dvh; width: auto; max-width: min(100%, 1200px); object-fit: contain; border-radius: var(--radius-sm); }
.photo-enter-active, .photo-leave-active { transition: opacity 0.22s var(--ease-out), transform 0.22s var(--ease-out); }
.photo-enter-from { opacity: 0; transform: scale(0.98); }
.photo-leave-to { opacity: 0; }
.viewer-caption { font-size: 0.9rem; opacity: 0.85; text-align: center; }
.nav-btn {
  position: fixed; width: 48px; height: 48px; display: grid; place-items: center;
  border: 1px solid rgb(255 255 255 / 0.25); border-radius: 50%; background: rgb(0 0 0 / 0.35); color: #fff;
  font-size: 1.6rem; line-height: 1; cursor: pointer;
}
.close { top: max(1rem, env(safe-area-inset-top)); right: 1rem; font-size: 1.1rem; }
.prev { left: 0.75rem; top: 50%; translate: 0 -50%; }
.next { right: 0.75rem; top: 50%; translate: 0 -50%; }
</style>
