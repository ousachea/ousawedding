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

// Carousel: a stack of up to five. The current photo sits in the middle; two either side sit smaller and
// smaller, tucked behind it and fully on screen. Each photo is placed by its distance from the current one, wrapping round, so it
// loops without copies.
const count = computed(() => props.images.length)
const loops = computed(() => count.value > 1)
const at = ref(0)
// -2 … 2 from left to right, 0 in the middle; further ones hide behind the middle
function offset(i: number) {
  let d = (((i - at.value) % count.value) + count.value) % count.value
  if (d > count.value / 2) d -= count.value
  return d
}
const step = (by: number) => (at.value = (((at.value + by) % count.value) + count.value) % count.value)
// Each photo's place, set as the final transform rather than computed in CSS from a variable: Safari
// can skip the transition when only a custom property changes. Photos further round wait hidden behind.
// Value at x places from the middle, blending between whole places so photos follow a drag smoothly
function curve(vals: number[], x: number) {
  const i = Math.min(Math.floor(x), vals.length - 2)
  return vals[i]! + (vals[i + 1]! - vals[i]!) * Math.min(x - i, 1)
}
function place(i: number) {
  // While dragging, each photo sits part-way between places
  const d = offset(i) + drag.value
  const a = Math.abs(d)
  const far = a > 3
  // Shift (as a share of the photo's width), size and opacity for 0, 1, 2 and 3 places from the middle
  return {
    '--d': d,
    'transform': far ? 'translate3d(0, 0, 0) scale(0.5)' : `translate3d(${Math.sign(d) * curve([0, 32, 59, 70], a)}%, 0, 0) scale(${curve([1, 0.82, 0.66, 0.5], a)})`,
    'zIndex': 10 - Math.min(Math.round(a), 3),
    'opacity': far ? 0 : curve([1, 0.9, 0.75, 0], a),
  }
}

// Tap the middle photo to open it; tap a side photo to bring it to the middle
function tap(i: number) {
  hold()
  if (dragged) return
  if (offset(i) === 0) open(i)
  else step(offset(i))
}

// Swipe or drag sideways (finger or mouse): the photos follow the pointer, the next one sliding into the
// middle, then settle on release. Up and down still scrolls the page (touch-action: pan-y).
// drag: how many places the photos have been pulled (negative = towards the next photo)
const drag = ref(0)
let swipeX: number | null = null
let swipeY = 0
let placeWidth = 1
let dragged = false
function onSwipeStart(e: PointerEvent) {
  hold()
  swipeX = e.clientX
  swipeY = e.clientY
  // Dragging 40% of a photo's width pulls the photos one place (the side photo sits about a third over)
  placeWidth = ((stage.value?.querySelector('.slide') as HTMLElement | null)?.offsetWidth ?? 300) * 0.4
  dragged = false
}
function onSwipeMove(e: PointerEvent) {
  if (swipeX === null) return
  const dx = e.clientX - swipeX
  if (!dragged && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - swipeY)) {
    dragged = true
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  if (dragged) drag.value = Math.max(-2, Math.min(2, dx / placeWidth))
}
function onSwipeEnd() {
  if (swipeX === null) return
  // Past a third of a place, move on: by one, or two for a long drag
  const p = drag.value
  if (dragged && Math.abs(p) > 0.3) step(-Math.sign(p) * Math.max(1, Math.round(Math.abs(p))))
  swipeX = null
  drag.value = 0
}

// Autoplay: one photo every few seconds while the gallery is on screen. Touching it pauses for a few seconds.
const stage = ref<HTMLElement>()
let autoplay: ReturnType<typeof setInterval> | undefined
let holdUntil = 0
let onScreen = false
let seen: IntersectionObserver | undefined
function hold() {
  holdUntil = Date.now() + 4000
}
onMounted(() => {
  if (!loops.value || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  seen = new IntersectionObserver(([en]) => (onScreen = !!en?.isIntersecting), { threshold: 0.5 })
  if (stage.value) seen.observe(stage.value)
  autoplay = setInterval(() => {
    if (onScreen && !document.hidden && Date.now() > holdUntil && !dialog.value?.open) step(1)
  }, 3500)
})
onBeforeUnmount(() => {
  clearInterval(autoplay)
  seen?.disconnect()
})
</script>

<template>
  <section id="gallery" class="gallery" aria-labelledby="gallery-title">
    <div class="container">
      <span v-reveal class="section-icon"><WeddingIcon name="camera" /></span>
      <h2 v-reveal id="gallery-title" class="section-title">{{ t('gallery.title') }}</h2>
      <WeddingOrnament v-reveal="100" :motif="motif" />
    </div>
    <!-- Full width, outside the container, with room for the photos either side -->
    <div v-reveal="150" class="carousel" @mouseenter="hold" @focusin="hold">
      <ul
        ref="stage" class="stage" :class="{ dragging: drag !== 0 }" :aria-label="t('gallery.title')"
        @pointerdown="onSwipeStart" @pointermove="onSwipeMove" @pointerup="onSwipeEnd" @pointercancel="onSwipeEnd" @dragstart.prevent
      >
        <li
          v-for="(img, i) in images"
          :key="img.id"
          class="slide"
          :class="{ current: offset(i) === 0, away: Math.abs(offset(i)) > 2 }"
          :style="place(i)"
          :aria-hidden="offset(i) !== 0 || undefined"
        >
          <button type="button" class="thumb" :tabindex="offset(i) === 0 ? undefined : -1" :aria-label="t('gallery.open', { n: i + 1 })" @click="tap(i)">
            <span class="pic">
              <img
                :src="img.url"
                :srcset="img.thumbUrl && img.thumbUrl !== img.url ? `${img.thumbUrl} 427w, ${img.url} ${img.width}w` : undefined"
                sizes="(min-width: 760px) 18rem, 50vw"
                :alt="altFor(img, i)"
                :width="img.width"
                :height="img.height"
                loading="lazy"
                decoding="async"
              >
            </span>
          </button>
          <p v-if="L(img.caption)" class="caption">{{ L(img.caption) }}</p>
        </li>
      </ul>
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
.carousel { margin-top: var(--space-5); overflow: hidden; }
/* All photos share one grid cell, so the stage is as tall as the tallest; place() then moves each one.
   With the middle photo 50vw wide, the outer pair (66% size, moved 59% of a width) end
   (0.59 + 0.33) × 50vw = 46vw from the centre, inside the screen. */
.stage {
  display: grid;
  justify-items: center;
  align-items: center;
  margin: 0;
  padding: var(--space-5) 0 var(--space-6);
  list-style: none;
  touch-action: pan-y;
  user-select: none;
}
/* While dragging, photos track the pointer directly; on release they animate to their places */
.stage.dragging { cursor: grabbing; }
.stage.dragging .slide, .stage.dragging .thumb { transition: none; }
/* Sized by the screen's height too, so a whole portrait photo (2:3) and its frame fit on screen.
   Position, size, order and opacity come from place(). Only transform and opacity animate (smooth on
   iPhone); the stacking order switches a third of the way through, so the photo coming to the middle
   passes in front once it is mostly out from behind. */
.slide {
  grid-area: 1 / 1;
  width: min(50vw, 18rem, 34svh);
  transition: transform 0.6s var(--ease-out), opacity 0.6s var(--ease-out), z-index 0s linear 0.2s;
  will-change: transform, opacity;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
.slide:not(.current) .caption { opacity: 0; }
.slide.away { pointer-events: none; }
@media (prefers-reduced-motion: reduce) { .slide { transition: none; } }

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
.style-floral .slide:not(.current) .thumb { rotate: calc(var(--d) * 2deg); }
.style-floral .slide.current .thumb { rotate: 0deg; }
.style-floral .pic { border-radius: 0; }
.thumb img { width: 100%; max-height: 62svh; object-fit: cover; transition: scale 0.4s var(--ease-out); outline: 1px solid rgb(0 0 0 / 0.06); outline-offset: -1px; }
@media (hover: hover) { .slide.current .thumb:hover img { scale: 1.04; } }
.slide:not(.current) .thumb { cursor: pointer; }
.caption { font-size: 0.85rem; color: var(--c-muted); margin-top: var(--space-2); text-align: center; }

@media (prefers-reduced-motion: reduce) { .slide { transition: none; } }

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
