<script setup lang="ts">
// `introDelay` is set when the envelope starts to open; the hero then plays its entrance.
// Before that (and without JavaScript) everything is simply shown.
const props = defineProps<{ data: PublicWedding, introDelay: number | null }>()
const { t } = useI18n()
const locale = useLocaleCode()
const w = computed(() => props.data.wedding)
const other = computed<Locale>(() => (locale.value === 'km' ? 'en' : 'km'))

// Drifting petals run only while the hero is on screen
const section = ref<HTMLElement>()
const petalsActive = ref(false)
let io: IntersectionObserver | undefined
onMounted(() => {
  if (!section.value || !('IntersectionObserver' in window)) return
  io = new IntersectionObserver(([entry]) => (petalsActive.value = !!entry?.isIntersecting))
  io.observe(section.value)
})
onBeforeUnmount(() => io?.disconnect())

// Fixed positions so server and client render the same markup
const petals = [
  { left: 8, delay: 0, dur: 17, size: 14 },
  { left: 22, delay: 6, dur: 21, size: 10 },
  { left: 37, delay: 11, dur: 19, size: 12 },
  { left: 55, delay: 3, dur: 23, size: 9 },
  { left: 68, delay: 9, dur: 18, size: 13 },
  { left: 82, delay: 1, dur: 22, size: 11 },
  { left: 93, delay: 13, dur: 20, size: 10 },
]
const step = (i: number) => ({ '--i': i })
</script>

<template>
  <section
    id="home"
    ref="section"
    class="hero"
    :class="{ intro: introDelay !== null, 'petals-on': petalsActive }"
    :style="{ '--intro-delay': `${introDelay ?? 0}ms` }"
  >
    <div v-if="w.theme.motif !== 'none'" class="petals" aria-hidden="true">
      <svg
        v-for="(p, i) in petals"
        :key="i"
        class="petal"
        viewBox="0 0 20 28"
        :style="{ left: `${p.left}%`, width: `${p.size}px`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }"
      >
        <path d="M10 1 C3 9 3 19 10 27 C17 19 17 9 10 1 Z" fill="currentColor" />
      </svg>
    </div>

    <div class="container hero-inner">
      <div class="text">
        <p class="eyebrow step" :style="step(0)">{{ t('hero.invite') }}</p>
        <WeddingOrnament :motif="w.theme.motif" kind="flower" class="step draw" :style="step(1)" />
        <h1 class="names">
          <span class="name step" :style="step(2)">{{ w.names[locale].partner1 }}</span>
          <span class="and step" :style="step(3)">{{ t('hero.and') }}</span>
          <span class="name step" :style="step(4)">{{ w.names[locale].partner2 }}</span>
        </h1>
        <p class="names-alt step" :lang="other" :style="step(5)">
          {{ w.names[other].partner1 }} &amp; {{ w.names[other].partner2 }}
        </p>
        <div v-if="w.names[locale].parents1 || w.names[locale].parents2" class="parents step" :style="step(5)">
          <p v-for="n in ([1, 2] as const)" :key="n">
            <span class="parents-label">{{ t('hero.parentsOf', { name: w.names[locale][`partner${n}`] }) }}</span>
            {{ w.names[locale][`parents${n}`] }}
          </p>
        </div>
        <WeddingOrnament :motif="w.theme.motif" class="step draw" :style="step(6)" />
        <p class="date step" :style="step(7)">{{ data.display[locale].date }}</p>
        <p class="time tabular step" :style="step(7)">{{ data.display[locale].time }}</p>
        <p v-if="w.content[locale].message" class="message step" :style="step(8)">{{ w.content[locale].message }}</p>
        <div class="cta step" :style="step(9)">
          <a href="#rsvp" class="btn btn-primary">{{ t('hero.rsvp') }}</a>
          <a href="#schedule" class="btn btn-outline">{{ t('hero.details') }}</a>
        </div>
      </div>
      <div v-if="w.coverImage" class="photo step-photo">
        <span class="halo" aria-hidden="true" />
        <span class="frame">
          <img :src="w.coverImage" :alt="`${w.names[locale].partner1} & ${w.names[locale].partner2}`" width="800" height="1000" fetchpriority="high">
        </span>
      </div>
    </div>
    <a href="#schedule" class="scroll-cue" :aria-label="t('hero.details')">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </a>
  </section>
</template>

<style scoped>
.hero { position: relative; overflow: hidden; padding-block: var(--space-7) var(--space-8); }
.hero-inner { position: relative; display: grid; gap: var(--space-7); align-items: center; }
.text { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-3); }
.eyebrow { text-transform: uppercase; letter-spacing: 0.24em; font-size: 0.78rem; color: var(--c-accent-ink); }
:lang(km) .eyebrow { letter-spacing: 0.04em; text-transform: none; font-size: 0.95rem; }
.names { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); font-size: clamp(2.6rem, 10vw, 4.4rem); color: var(--c-text); }
:lang(km) .names { font-size: clamp(2.1rem, 8.5vw, 3.6rem); }
.and { font-size: 0.45em; font-style: italic; color: var(--c-accent-ink); }
.names-alt { font-family: var(--font-serif); font-size: 1.2rem; color: var(--c-muted); }
.parents { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); width: min(100%, 30rem); margin-top: var(--space-2); text-align: center; white-space: pre-line; }
.parents-label { display: block; font-size: 0.8rem; letter-spacing: 0.04em; color: var(--c-accent-ink); }
.date { font-family: var(--font-serif); font-size: 1.4rem; color: var(--c-text); }
.time { font-size: 1rem; color: var(--c-muted); margin-top: calc(-1 * var(--space-2)); }
.message { max-width: 34rem; margin-top: var(--space-3); color: var(--c-text); white-space: pre-line; }
.cta { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-3); margin-top: var(--space-4); }
.photo {
  position: relative;
  width: min(100%, 420px);
  margin-inline: auto;
  padding: 10px;
  border: 1px solid var(--c-line);
  border-radius: 999px 999px var(--radius) var(--radius);
}
.frame { display: block; overflow: hidden; border-radius: 999px 999px 6px 6px; }
.photo img {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  border-radius: 999px 999px 6px 6px;
  outline: 1px solid rgb(0 0 0 / 0.06);
  outline-offset: -1px;
}

/* Two columns from tablet portrait (e.g. 800px wide) upwards */
@media (min-width: 760px) {
  .hero { min-height: min(100dvh, 62rem); display: grid; align-items: center; }
  .hero-inner { grid-template-columns: 1.1fr 1fr; gap: var(--space-6); }
  .photo { order: 2; }
  :lang(km) .names { font-size: clamp(2.4rem, 6.5vw, 3.6rem); }
}

/* Entrance, played once as the envelope opens */
.intro .step {
  animation: rise 0.9s var(--ease-out) both;
  animation-delay: calc(var(--intro-delay) + var(--i) * 90ms);
}
.intro .step-photo {
  animation: settle 1.4s var(--ease-out) both;
  animation-delay: calc(var(--intro-delay) + 200ms);
}
.intro .draw :deep(path) {
  stroke-dasharray: 1;
  animation: draw 1.8s var(--ease-out) both;
  animation-delay: calc(var(--intro-delay) + var(--i) * 90ms + 150ms);
}
@keyframes rise { from { opacity: 0; transform: translateY(16px); } }
@keyframes settle { from { opacity: 0; transform: scale(0.96); } }
@keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }

/* Looping touches */
.halo {
  position: absolute; inset: -7px; pointer-events: none;
  border: 1px solid var(--c-accent); border-radius: inherit; opacity: 0.25;
}
.scroll-cue {
  position: absolute; left: 50%; bottom: var(--space-4); translate: -50% 0;
  display: grid; place-items: center; width: 44px; height: 44px; color: var(--c-accent-ink);
}
@media (prefers-reduced-motion: no-preference) {
  .halo { animation: halo 4.5s ease-in-out infinite; }
  .text > :deep(.flower g) { transform-box: fill-box; transform-origin: 50% 95%; animation: sway 6s ease-in-out infinite; }
  .scroll-cue svg { animation: bob 2.2s ease-in-out infinite; }
}
@keyframes halo { 0%, 100% { opacity: 0.15; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.015); } }
@keyframes sway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
@keyframes bob { 0%, 100% { transform: translateY(0); opacity: 0.6; } 50% { transform: translateY(6px); opacity: 1; } }

/* Scroll-linked parallax where the browser supports scroll-driven animations; others stay static */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .photo img { animation: drift linear both; animation-timeline: view(); }
  }
}
/* Zoomed slightly so the drift never shows an edge inside the frame */
@keyframes drift { from { transform: scale(1.1) translateY(-4%); } to { transform: scale(1.1) translateY(4%); } }

/* Petals */
.petals { position: absolute; inset: 0; pointer-events: none; }
.petal {
  position: absolute;
  top: -40px;
  height: auto;
  color: var(--c-accent);
  opacity: 0;
  animation: fall linear infinite;
  animation-play-state: paused;
}
.petals-on .petal { animation-play-state: running; }
@keyframes fall {
  0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
  10% { opacity: 0.35; }
  50% { transform: translate3d(28px, 50vh, 0) rotate(160deg); }
  90% { opacity: 0.3; }
  100% { transform: translate3d(-12px, 105vh, 0) rotate(320deg); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .petals { display: none; }
}
</style>
