<script setup lang="ts">
// `introDelay` is set when the envelope starts to open; the hero then plays its entrance.
// Before that (and without JavaScript) everything is simply shown.
const props = defineProps<{ data: PublicWedding, introDelay: number | null }>()
const { t } = useI18n()
const locale = useLocaleCode()
const w = computed(() => props.data.wedding)
const other = computed<Locale>(() => (locale.value === 'km' ? 'en' : 'km'))
const floral = computed(() => w.value.theme.style === 'floral')

// Floral style shows the date as month, then "weekday │ day │ year"
const dateParts = computed(() => {
  const parts = new Intl.DateTimeFormat(locale.value === 'km' ? 'km-KH-u-nu-khmr' : 'en-US', {
    timeZone: w.value.timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).formatToParts(new Date(props.data.dateUtc))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? ''
  return { weekday: part('weekday'), day: part('day'), month: part('month'), year: part('year') }
})

const step = (i: number) => ({ '--i': i })

// Specks of warm light drifting up through the hero: left %, top %, size px, duration s, delay s.
// Fixed numbers so server and browser render the same markup.
const motes = [
  [8, 62, 5, 9, 0], [16, 30, 3, 11, 4], [24, 78, 4, 10, 2], [33, 44, 6, 13, 7], [41, 20, 3, 9, 5],
  [52, 70, 5, 12, 1], [60, 36, 4, 10, 8], [68, 84, 3, 11, 3], [76, 52, 6, 14, 6], [84, 24, 4, 9, 2],
  [91, 66, 5, 12, 9], [47, 52, 3, 10, 11],
].map(([left, top, size, dur, delay]) => ({ left: `${left}%`, top: `${top}%`, width: `${size}px`, height: `${size}px`, animationDuration: `${dur}s`, animationDelay: `${-delay!}s` }))
</script>

<template>
  <section
    id="home"
    class="hero"
    :class="{ intro: introDelay !== null }"
    :style="{ '--intro-delay': `${introDelay ?? 0}ms` }"
  >
    <div class="motes" aria-hidden="true">
      <span v-for="(m, i) in motes" :key="i" class="mote" :style="m" />
    </div>
    <template v-if="floral">
      <WeddingFlorals class="corner corner-l" />
      <WeddingFlorals class="corner corner-r" :seed="1" flip />
    </template>
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
        <div v-if="floral" class="date-block step" :style="step(7)">
          <p class="db-month">{{ dateParts.month }}</p>
          <p class="db-row"><span>{{ dateParts.weekday }}</span><span class="db-day">{{ dateParts.day }}</span><span>{{ dateParts.year }}</span></p>
          <p class="time tabular">{{ data.display[locale].time }}</p>
        </div>
        <template v-else>
          <p class="date step" :style="step(7)">{{ data.display[locale].date }}</p>
          <p class="time tabular step" :style="step(7)">{{ data.display[locale].time }}</p>
        </template>
        <p v-if="w.content[locale].message" class="message step" :style="step(8)">{{ w.content[locale].message }}</p>
        <div class="cta step" :style="step(9)">
          <a href="#rsvp" class="btn btn-primary">{{ t('hero.rsvp') }}</a>
          <a href="#schedule" class="btn btn-outline">{{ t('hero.details') }}</a>
        </div>
      </div>
      <div v-if="w.coverImage" class="photo step-photo">
        <span class="halo" aria-hidden="true" />
        <span class="frame">
          <img :src="w.coverImage" :style="{ objectPosition: w.coverPosition }" :alt="`${w.names[locale].partner1} & ${w.names[locale].partner2}`" width="800" height="1000" fetchpriority="high">
        </span>
      </div>
    </div>
    <a href="#schedule" class="scroll-cue" :aria-label="t('hero.details')">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </a>
  </section>
</template>

<style scoped>
/* clip, not hidden: hidden would make the hero a scroll container and freeze the photo's scroll-linked parallax */
.hero { position: relative; overflow: clip; padding-block: var(--space-7) var(--space-8); }
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
.frame { display: block; overflow: clip; border-radius: 999px 999px 6px 6px; }
.photo img {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  border-radius: 999px 999px 6px 6px;
  outline: 1px solid rgb(0 0 0 / 0.06);
  outline-offset: -1px;
}

/* Floral style: flowers in the top corners, handwritten names, a ruled date, full-width photo with torn edges */
.corner { position: absolute; top: 0; width: min(64%, 360px); }
.corner-l { left: -6%; }
.corner-r { right: -10%; width: min(42%, 240px); }
.style-floral .hero { padding-top: clamp(9.5rem, 40vw, 14rem); }
.style-floral .hero-inner { grid-template-columns: 1fr; }
.style-floral .names { font-family: var(--font-script); font-size: clamp(3rem, 13vw, 5rem); line-height: 1.15; }
.style-floral .and { font-family: var(--font-serif); font-size: 0.32em; }
.date-block { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); margin-block: var(--space-3); }
.db-month { font-family: var(--font-serif); font-weight: 600; letter-spacing: 0.24em; text-transform: uppercase; font-size: 0.85rem; }
.db-month:lang(km) { letter-spacing: 0.02em; font-size: 1rem; }
.db-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--space-3); width: min(100%, 22rem); }
.db-row > span:not(.db-day) { padding-block: var(--space-1); border-block: 1px solid var(--c-text); font-size: 0.85rem; letter-spacing: 0.12em; text-transform: uppercase; }
.db-row > span:not(.db-day):lang(km) { letter-spacing: 0; }
.db-day { font-family: var(--font-script); font-size: 4rem; line-height: 1; color: var(--c-accent); }
.style-floral .photo {
  width: min(100vw, 46rem); max-width: none; margin-inline: calc(50% - min(50vw, 23rem));
  padding: 0; border: 0; border-radius: 0;
}
.style-floral .halo { display: none; }
.style-floral .frame,
.style-floral .photo img { border-radius: 0; outline: 0; }
.style-floral .frame {
  mask: var(--torn-top) top / 100% 18px no-repeat, linear-gradient(#000 0 0) center / 100% calc(100% - 34px) no-repeat, var(--torn-bottom) bottom / 100% 18px no-repeat;
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
  animation: rise 1.3s ease both;
  animation-delay: calc(var(--intro-delay) + var(--i) * 110ms);
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
@keyframes rise { from { opacity: 0; transform: translate3d(0, 10px, 0); } }

/* Gold-foil names: a gold gradient clipped to the letters. The gradient is wider than the name, with a light
   streak in its middle that sits outside the name at rest; moving the gradient sweeps the streak across. */
@supports (background-clip: text) or (-webkit-background-clip: text) {
  .name {
    padding-inline: 0.12em; /* the script's swashes stay inside the painted area */
    background: linear-gradient(105deg, var(--c-gold-deep) 0 40%, var(--c-gold) 46%, var(--c-gold-light) 50%, var(--c-gold) 54%, var(--c-gold-deep) 60% 100%) 100% 0 / 260% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
}
/* Soft warm light behind the names */
.names { position: relative; }
.names::before {
  content: ''; position: absolute; inset: -35% -25%; z-index: -1; pointer-events: none;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--c-gold-light) 70%, transparent), color-mix(in srgb, var(--c-gold-light) 25%, transparent) 55%, transparent);
}
.motes { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.mote {
  position: absolute; border-radius: 50%; opacity: 0.55;
  background: radial-gradient(circle, #fff 0 25%, var(--c-gold-light) 45%, transparent 70%);
  box-shadow: 0 0 8px 2px color-mix(in srgb, var(--c-gold-light) 60%, transparent);
}
@media (prefers-reduced-motion: no-preference) {
  .name { animation: shine 9s ease-in-out 2.5s infinite; }
  /* As the envelope opens, each name is written in from left to right, then catches the light */
  .intro .name.step {
    animation: write 1.5s cubic-bezier(0.45, 0, 0.25, 1) both, shine 9s ease-in-out infinite;
    animation-delay: calc(var(--intro-delay) + var(--i) * 160ms), calc(var(--intro-delay) + 2.2s);
  }
  .names::before { animation: glow 7s ease-in-out infinite alternate; }
  .mote { animation: float linear infinite; }
}
@keyframes write { from { clip-path: inset(-30% 100% -30% -10%); } to { clip-path: inset(-30% -10% -30% -10%); } }
@keyframes shine { 0% { background-position: 100% 0; } 25%, 100% { background-position: 0 0; } }
@keyframes glow { from { opacity: 0.7; scale: 0.95; } to { opacity: 1; scale: 1.05; } }
@keyframes float {
  0% { transform: translate3d(0, 0, 0); opacity: 0; }
  20% { opacity: 0.7; }
  50% { transform: translate3d(10px, -60px, 0); opacity: 0.35; }
  80% { opacity: 0.75; }
  100% { transform: translate3d(-6px, -120px, 0); opacity: 0; }
}
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
/* Floral: a stronger parallax, the photo moving at about half the scroll speed inside its torn frame */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .style-floral .photo img { animation-name: parallax; }
  }
}
@keyframes parallax { from { transform: scale(1.28) translateY(-11%); } to { transform: scale(1.28) translateY(11%); } }
</style>
