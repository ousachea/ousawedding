<script setup lang="ts">
defineProps<{ monogram: string, motif: Motif, guestName?: string }>()
// `revealing` fires as the invitation starts to show, with how long until it is fully visible
const emit = defineEmits<{ opened: [], revealing: [delayMs: number] }>()
const { t } = useI18n()

// Without JavaScript the envelope can't open, so never show it. Rendered in <head> so the
// client never builds the <style> as a live element.
useHead({ noscript: [{ innerHTML: '<style>.envelope-overlay{display:none!important}</style>' }] })

// 'closed' → 'opening' (animation) → 'gone'
const state = ref<'closed' | 'opening' | 'gone'>('closed')
const sealButton = ref<HTMLButtonElement>()

// Stop the page behind from scrolling. iOS Safari ignores overflow: hidden on the page, so the body is
// pinned in place instead. The invitation always opens at the top, on the cover: the browser's own
// restore-where-you-were (after a reload) is turned off, and the page goes back to the top when it opens.
function lockScroll() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  window.scrollTo({ top: 0, behavior: 'instant' })
  document.documentElement.style.overflow = 'hidden'
  Object.assign(document.body.style, { position: 'fixed', top: '0', left: '0', right: '0', overflow: 'hidden' })
}
function unlockScroll() {
  document.documentElement.style.removeProperty('overflow')
  for (const p of ['position', 'top', 'left', 'right', 'overflow']) document.body.style.removeProperty(p)
  window.scrollTo({ top: 0, behavior: 'instant' })
}

function finish() {
  if (state.value === 'closed') emit('revealing', 0)
  if (state.value !== 'gone') unlockScroll()
  state.value = 'gone'
  emit('opened')
}

// Opening the invitation (or skipping) also goes fullscreen on touch devices where the browser allows it: Android and iPad.
// Desktop (mouse/trackpad) is left alone. iPhone Safari has no fullscreen for pages. Must run in the tap itself.
function fullscreen() {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void }
  if (document.fullscreenElement || !matchMedia('(pointer: coarse)').matches) return
  try {
    if (el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {})
    else el.webkitRequestFullscreen?.()
  } catch {}
}

// iPhone Safari only sends tilt (used by the hero's Polaroids) after asking, and the ask must come from a tap
function askMotion() {
  const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined
  D?.requestPermission?.().catch(() => {})
}

function open() {
  if (state.value !== 'closed') return
  fullscreen()
  askMotion()
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return finish()
  state.value = 'opening'
  // The letter rises by 1.15s and stays up long enough to read its line, then the envelope fades
  emit('revealing', 2450)
  setTimeout(finish, 3000)
}

function skip() {
  fullscreen()
  askMotion()
  finish()
}

onMounted(() => {
  lockScroll()
  sealButton.value?.focus({ preventScroll: true })
})
onBeforeUnmount(() => { if (state.value !== 'gone') unlockScroll() })
</script>

<template>
  <div
    v-if="state !== 'gone'"
    class="envelope-overlay"
    :class="state"
    role="dialog"
    aria-modal="true"
    :aria-label="t('envelope.label')"
    @keydown.esc="skip"
  >
    <div class="stage">
      <div class="envelope">
        <div class="back" />
        <div class="letter">
          <WeddingOrnament :motif="motif" kind="flower" />
          <span class="letter-mono">{{ monogram }}</span>
          <p class="invite">{{ t('envelope.invite') }}</p>
        </div>
        <div class="pocket">
          <WeddingOrnament :motif="motif" kind="corner" class="corner-l" />
          <WeddingOrnament :motif="motif" kind="corner" class="corner-r" />
        </div>
        <div class="flap">
          <svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M3 2 L50 56 L97 2" fill="none" stroke="currentColor" vector-effect="non-scaling-stroke" />
          </svg>
        </div>
        <button ref="sealButton" type="button" class="seal" :aria-label="t('envelope.open')" @click="open">
          <span class="seal-mono">{{ monogram }}</span>
        </button>
      </div>

      <p class="for-guest">{{ guestName ? t('envelope.for', { name: guestName }) : '' }}</p>

      <div class="actions">
        <button type="button" class="btn btn-primary" @click="open">{{ t('envelope.open') }}</button>
        <button type="button" class="btn btn-ghost skip" @click="skip">{{ t('envelope.skip') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.envelope-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  display: grid;
  /* `safe` + scroll: on very short screens start at the top instead of clipping it */
  place-items: safe center;
  overflow-y: auto;
  /* Scrolling inside the envelope screen (very short screens) never carries on to the page behind */
  overscroll-behavior: contain;
  padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--c-accent) 10%, transparent), transparent 60%),
    var(--paper),
    var(--c-bg);
  transition: opacity 0.5s var(--ease-out) 2.45s;
}
.envelope-overlay.opening { opacity: 0; pointer-events: none; }

.stage {
  /* Also fit the height: envelope (w × 5/7) plus room for the rising letter, the text and the buttons */
  --fit-h: max(240px, (100dvh - 13rem) * 0.98);
  --w: min(86vw, 420px, var(--fit-h));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
  /* The letter (82% of the envelope's height) rises half its height, ~41% of the envelope, above it */
  padding-top: calc(var(--w) * 5 / 7 * 0.42);
}

.envelope {
  position: relative;
  animation: float 5s ease-in-out infinite;
  width: var(--w);
  aspect-ratio: 7 / 5;
  perspective: 1200px;
  /* Ornaments and the flap line draw in currentColor */
  color: var(--c-gold);
}

.back, .pocket, .flap { position: absolute; inset: 0; border-radius: 6px; }
.back {
  background: color-mix(in srgb, var(--c-secondary) 80%, #000);
  box-shadow: var(--shadow);
}

.letter {
  position: absolute;
  inset: 8% 7% 10%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* Content sits in the top half: that is the part that rises out of the envelope */
  justify-content: flex-start;
  padding: 9% 10% 0;
  gap: var(--space-1);
  text-align: center;
  background: var(--c-surface);
  border: 1px solid color-mix(in srgb, var(--c-gold) 70%, transparent);
  outline: 1px solid color-mix(in srgb, var(--c-gold) 45%, transparent);
  outline-offset: -5px;
  border-radius: 4px;
  transition: transform 0.7s var(--ease-out) 0.45s;
}
.letter-mono { font-family: var(--font-serif); font-size: 1.6rem; color: var(--c-gold-deep); letter-spacing: 0.08em; }
.opening .letter { transform: translateY(-50%); }
.opening .envelope { animation: none; }
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.pocket {
  z-index: 3;
  background: var(--c-secondary);
  clip-path: polygon(0 0, 50% 52%, 100% 0, 100% 100%, 0 100%);
  border: 1px solid var(--c-gold);
  /* A thin gold rule inside the edge */
  box-shadow: inset 0 0 0 5px var(--c-secondary), inset 0 0 0 6px color-mix(in srgb, var(--c-gold) 70%, transparent);
}
.pocket :deep(.ornament), .letter :deep(.ornament) { color: var(--c-gold); }
.corner-l, .corner-r { position: absolute; bottom: 8px; }
.corner-l { left: 8px; transform: rotate(-90deg); }
.corner-r { right: 8px; transform: rotate(180deg); }

.flap {
  z-index: 4;
  height: 60%;
  /* A shade lighter than the pocket so the flap's edges read */
  background: color-mix(in srgb, var(--c-secondary) 85%, #fff);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  transform-origin: top center;
  /* Drop behind the letter halfway through the turn */
  transition: transform 0.6s var(--ease-out), z-index 0s linear 0.3s;
}
.flap svg { position: absolute; inset: 0; width: 100%; height: 100%; color: var(--c-gold); }
.opening .flap { transform: rotateX(180deg); z-index: 1; }

.seal {
  position: absolute;
  z-index: 5;
  left: 50%;
  top: 60%;
  width: 76px;
  height: 76px;
  translate: -50% -50%;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  /* Gold foil: bright where the light hits, deeper at the rim */
  background:
    radial-gradient(circle at 35% 30%, var(--c-gold-light), var(--c-gold) 55%, var(--c-gold-deep));
  box-shadow:
    inset 0 0 0 4px color-mix(in srgb, var(--c-gold-deep) 35%, transparent),
    inset 0 0 0 5px color-mix(in srgb, var(--c-gold-light) 70%, transparent),
    0 0 0 3px color-mix(in srgb, var(--c-gold) 40%, transparent),
    0 6px 14px -4px rgb(0 0 0 / 0.45);
  overflow: hidden;
  transition: transform 0.2s var(--ease-out), opacity 0.3s;
}
/* A slow light sweep across the wax */
.seal::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 35%, rgb(255 255 255 / 0.28) 50%, transparent 65%);
  transform: translateX(-120%);
  animation: shine 4.5s ease-in-out 1s infinite;
  pointer-events: none;
}
@keyframes shine {
  0%, 60% { transform: translateX(-120%); }
  85%, 100% { transform: translateX(120%); }
}
.seal:hover { transform: scale(1.05); }
.seal:active { transform: scale(0.96); }
.seal-mono {
  font-family: var(--font-serif);
  font-size: 1rem;
  color: color-mix(in srgb, var(--c-gold-deep) 70%, #000);
  /* Pressed into the foil */
  text-shadow: 0 1px 0 color-mix(in srgb, var(--c-gold-light) 80%, transparent);
  letter-spacing: 0.04em;
  padding: 0 6px;
  text-align: center;
  line-height: 1.1;
}
.opening .seal { opacity: 0; transform: scale(0.8); }

/* The guest's name, filled in after load, so its line is reserved */
.for-guest { font-family: var(--font-serif); font-size: 1.25rem; font-style: italic; color: var(--c-accent-ink); min-height: 1.9em; text-align: center; }
.invite { margin: 0; font-family: var(--font-serif); font-size: clamp(0.8rem, calc(var(--w) * 0.036), 1.05rem); line-height: 1.45; color: var(--c-text); text-wrap: balance; }
.invite:lang(km) { font-size: clamp(0.72rem, calc(var(--w) * 0.032), 0.95rem); line-height: 1.75; }

@media (min-width: 700px) {
  .stage { --w: min(72vw, 560px, var(--fit-h)); }
  .seal { width: 96px; height: 96px; }
  .seal-mono { font-size: 1.25rem; }
  .letter-mono { font-size: 2.1rem; }
  .for-guest { font-size: 1.5rem; }
}

.actions { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.skip { font-size: 0.85rem; color: var(--c-muted); }
</style>
