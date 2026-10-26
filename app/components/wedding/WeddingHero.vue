<script setup lang="ts">
const props = defineProps<{ data: PublicWedding }>()
const { t } = useI18n()
const locale = useLocaleCode()
const w = computed(() => props.data.wedding)
const other = computed<Locale>(() => (locale.value === 'km' ? 'en' : 'km'))
</script>

<template>
  <section id="home" class="hero">
    <div class="container hero-inner">
      <div class="text">
        <p class="eyebrow">{{ t('hero.invite') }}</p>
        <WeddingOrnament :motif="w.theme.motif" kind="flower" />
        <h1 class="names">
          <span class="name">{{ w.names[locale].partner1 }}</span>
          <span class="and">{{ t('hero.and') }}</span>
          <span class="name">{{ w.names[locale].partner2 }}</span>
        </h1>
        <p class="names-alt" :lang="other">
          {{ w.names[other].partner1 }} &amp; {{ w.names[other].partner2 }}
        </p>
        <WeddingOrnament :motif="w.theme.motif" />
        <p class="date">{{ data.display[locale].date }}</p>
        <p class="time tabular">{{ data.display[locale].time }}</p>
        <p v-if="w.content[locale].message" class="message">{{ w.content[locale].message }}</p>
        <div class="cta">
          <a href="#rsvp" class="btn btn-primary">{{ t('hero.rsvp') }}</a>
          <a href="#schedule" class="btn btn-outline">{{ t('hero.details') }}</a>
        </div>
      </div>
      <div v-if="w.coverImage" class="photo">
        <img :src="w.coverImage" :alt="`${w.names[locale].partner1} & ${w.names[locale].partner2}`" width="800" height="1000" fetchpriority="high">
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero { padding-block: var(--space-7) var(--space-8); }
.hero-inner { display: grid; gap: var(--space-7); align-items: center; }
.text { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-3); }
.eyebrow { text-transform: uppercase; letter-spacing: 0.24em; font-size: 0.78rem; color: var(--c-accent-ink); }
:lang(km) .eyebrow { letter-spacing: 0.04em; text-transform: none; font-size: 0.95rem; }
.names { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); font-size: clamp(2.6rem, 10vw, 4.4rem); color: var(--c-text); }
:lang(km) .names { font-size: clamp(2.1rem, 8.5vw, 3.6rem); }
.and { font-size: 0.45em; font-style: italic; color: var(--c-accent-ink); }
.names-alt { font-family: var(--font-serif); font-size: 1.2rem; color: var(--c-muted); }
.date { font-family: var(--font-serif); font-size: 1.4rem; color: var(--c-text); }
.time { font-size: 1rem; color: var(--c-muted); margin-top: calc(-1 * var(--space-2)); }
.message { max-width: 34rem; margin-top: var(--space-3); color: var(--c-text); }
.cta { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-3); margin-top: var(--space-4); }
.photo {
  position: relative;
  width: min(100%, 420px);
  margin-inline: auto;
  padding: 10px;
  border: 1px solid var(--c-line);
  border-radius: 999px 999px var(--radius) var(--radius);
}
.photo img {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  border-radius: 999px 999px 6px 6px;
  outline: 1px solid rgb(0 0 0 / 0.06);
  outline-offset: -1px;
}
@media (min-width: 900px) {
  .hero-inner { grid-template-columns: 1.1fr 1fr; }
  .photo { order: 2; }
}
</style>
