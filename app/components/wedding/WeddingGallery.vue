<script setup lang="ts">
const props = defineProps<{ images: PublicWedding['gallery'], motif: Motif }>()
const { t } = useI18n()
const L = useLocalized()

const dialog = ref<HTMLDialogElement>()
const index = ref(0)
const current = computed(() => props.images[index.value])

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
</script>

<template>
  <section id="gallery" class="gallery" aria-labelledby="gallery-title">
    <div class="container">
      <span v-reveal class="section-icon"><WeddingIcon name="camera" /></span>
      <h2 v-reveal id="gallery-title" class="section-title">{{ t('gallery.title') }}</h2>
      <WeddingOrnament v-reveal="100" :motif="motif" />
      <ul class="grid" :class="{ few: images.length <= 4 }">
        <li v-for="(img, i) in images" :key="img.id" v-reveal="(i % 3) * 90">
          <button type="button" class="thumb" :aria-label="t('gallery.open', { n: i + 1 })" @click="open(i)">
            <img :src="img.thumbUrl || img.url" :alt="L(img.alt) || L(img.caption)" :width="img.width" :height="img.height" loading="lazy" decoding="async">
          </button>
          <p v-if="L(img.caption)" class="caption">{{ L(img.caption) }}</p>
        </li>
      </ul>
    </div>

    <dialog ref="dialog" class="viewer" :aria-label="t('gallery.viewer')" @keydown="onKey" @click.self="dialog?.close()">
      <div v-if="current" class="viewer-inner" @touchstart.passive="onTouchStart" @touchend="onTouchEnd">
        <Transition name="photo" mode="out-in">
          <img :key="current.id" :src="current.url" :alt="L(current.alt) || L(current.caption)" :width="current.width" :height="current.height">
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
.grid { list-style: none; padding: 0; margin: var(--space-6) 0 0; columns: 2; column-gap: var(--space-3); }
.grid li { break-inside: avoid; margin-bottom: var(--space-3); }
/* Small galleries stay at two columns so no column is left empty */
@media (min-width: 760px) { .grid { columns: 3; column-gap: var(--space-4); } .grid.few { columns: 2; max-width: 44rem; margin-inline: auto; } }
.thumb { display: block; width: 100%; padding: 0; border: 0; border-radius: var(--radius); overflow: hidden; cursor: zoom-in; background: var(--c-line-soft); }
.thumb img { width: 100%; transition: scale 0.4s var(--ease-out); outline: 1px solid rgb(0 0 0 / 0.06); outline-offset: -1px; }
/* `scale` for hover and `transform` for the scroll zoom are separate properties, so both work */
@media (hover: hover) { .thumb:hover img { scale: 1.04; } }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .thumb img { animation: unzoom linear both; animation-timeline: view(); animation-range: entry 0% cover 45%; }
  }
}
@keyframes unzoom { from { transform: scale(1.12); } }
.caption { font-size: 0.85rem; color: var(--c-muted); margin-top: var(--space-1); text-align: center; }

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
