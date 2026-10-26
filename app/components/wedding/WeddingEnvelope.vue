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

function finish() {
  if (state.value === 'closed') emit('revealing', 0)
  state.value = 'gone'
  document.documentElement.style.removeProperty('overflow')
  emit('opened')
}

function open() {
  if (state.value !== 'closed') return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return finish()
  state.value = 'opening'
  emit('revealing', 1150)
  setTimeout(finish, 1700)
}

function skip() {
  finish()
}

onMounted(() => {
  document.documentElement.style.overflow = 'hidden'
  sealButton.value?.focus({ preventScroll: true })
})
onBeforeUnmount(() => document.documentElement.style.removeProperty('overflow'))
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
  place-items: center;
  padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--c-accent) 10%, transparent), transparent 60%),
    var(--c-bg);
  transition: opacity 0.5s var(--ease-out) 1.15s;
}
.envelope-overlay.opening { opacity: 0; pointer-events: none; }

.stage { display: flex; flex-direction: column; align-items: center; gap: var(--space-5); }

.envelope {
  --w: min(86vw, 420px);
  position: relative;
  animation: float 5s ease-in-out infinite;
  width: var(--w);
  aspect-ratio: 7 / 5;
  perspective: 1200px;
}

.back, .pocket, .flap { position: absolute; inset: 0; border-radius: 6px; }
.back {
  background: color-mix(in srgb, var(--c-accent) 14%, var(--c-bg));
  box-shadow: var(--shadow);
}

.letter {
  position: absolute;
  inset: 8% 7% 10%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  background: var(--c-surface);
  border: 1px solid var(--c-line);
  border-radius: 4px;
  transition: transform 0.7s var(--ease-out) 0.45s;
}
.letter-mono { font-family: var(--font-serif); font-size: 1.6rem; color: var(--c-accent-ink); letter-spacing: 0.08em; }
.opening .letter { transform: translateY(-46%); }
.opening .envelope { animation: none; }
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.pocket {
  z-index: 3;
  background: color-mix(in srgb, #fff 30%, var(--c-bg));
  clip-path: polygon(0 0, 50% 52%, 100% 0, 100% 100%, 0 100%);
  border: 1px solid var(--c-line);
}
.corner-l, .corner-r { position: absolute; bottom: 8px; }
.corner-l { left: 8px; transform: rotate(-90deg); }
.corner-r { right: 8px; transform: rotate(180deg); }

.flap {
  z-index: 4;
  height: 60%;
  background: color-mix(in srgb, var(--c-accent) 8%, var(--c-bg));
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  transform-origin: top center;
  /* Drop behind the letter halfway through the turn */
  transition: transform 0.6s var(--ease-out), z-index 0s linear 0.3s;
}
.flap svg { position: absolute; inset: 0; width: 100%; height: 100%; color: var(--c-accent); }
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
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c-secondary) 70%, #fff), var(--c-secondary) 60%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-secondary) 35%, transparent), 0 6px 14px -4px rgb(80 10 15 / 0.45);
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
  color: color-mix(in srgb, var(--c-accent) 60%, #fff);
  letter-spacing: 0.04em;
  padding: 0 6px;
  text-align: center;
  line-height: 1.1;
}
.opening .seal { opacity: 0; transform: scale(0.8); }

.for-guest { font-family: var(--font-serif); font-size: 1.25rem; font-style: italic; color: var(--c-accent-ink); min-height: 1.9em; text-align: center; }

@media (min-width: 700px) {
  .envelope { --w: min(72vw, 560px); }
  .seal { width: 96px; height: 96px; }
  .seal-mono { font-size: 1.25rem; }
  .letter-mono { font-size: 2.1rem; }
  .for-guest { font-size: 1.5rem; }
}

.actions { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.skip { font-size: 0.85rem; color: var(--c-muted); }
</style>
