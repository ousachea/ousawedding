<script setup lang="ts">
// The site's home page: the business behind the invitations. Each couple's invitation lives at its own
// address (/<couple>); this page only introduces the service and how to get in touch.
const { t, locale } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const { data: site } = await useFetch<SiteInfo>('/api/public/site', { key: 'site' })
const loc = computed(() => locale.value as Locale)
const name = computed(() => site.value?.name || 'Theab Online')
const tagline = computed(() => site.value?.tagline[loc.value] || t('home.tagline'))
const about = computed(() => site.value?.about[loc.value] || t('home.about'))

const features = [
  { key: 'envelope', icon: 'envelope' },
  { key: 'languages', icon: 'lotus' },
  { key: 'schedule', icon: 'calendar' },
  { key: 'gallery', icon: 'camera' },
  { key: 'replies', icon: 'heart' },
  { key: 'gift', icon: 'gift' },
] as const
// Each style's paper and ink, drawn as a small card
const styles = [
  { key: 'classic', paper: '#F5F0F6', ink: '#5B2A86', trim: '#C9A24A' },
  { key: 'floral', paper: '#F3EEF4', ink: '#7A5AA6', trim: '#B9A3D6' },
  { key: 'ruby', paper: '#FFF8F3', ink: '#9B1B30', trim: '#C9A24A' },
] as const

const telegramUrl = computed(() => site.value?.telegram && `https://t.me/${site.value.telegram}`)
const hasContact = computed(() => !!(site.value && (site.value.telegram || site.value.phone || site.value.facebook || site.value.email)))

useHead(() => ({
  title: `${name.value} · ${t('home.eyebrow')}`,
  htmlAttrs: { lang: loc.value },
  meta: [
    { name: 'description', content: tagline.value },
    { property: 'og:title', content: name.value },
    { property: 'og:description', content: tagline.value },
  ],
}))
</script>

<template>
  <div class="home">
    <header class="top">
      <span class="brand">{{ name }}</span>
      <nav class="langs" :aria-label="t('common.language')">
        <NuxtLink :to="switchLocalePath('en')" :class="{ on: loc === 'en' }" lang="en">EN</NuxtLink>
        <NuxtLink :to="switchLocalePath('km')" :class="{ on: loc === 'km' }" lang="km">ខ្មែរ</NuxtLink>
      </nav>
    </header>

    <main>
      <section class="hero">
        <div class="hero-text">
          <p class="eyebrow">{{ t('home.eyebrow') }}</p>
          <h1>{{ tagline }}</h1>
          <p class="lead">{{ about }}</p>
          <div class="ctas">
            <a v-if="telegramUrl" :href="telegramUrl" class="btn btn-primary" target="_blank" rel="noopener">{{ t('home.ctaTelegram') }}</a>
            <a v-else-if="hasContact" href="#contact" class="btn btn-primary">{{ t('home.ctaContact') }}</a>
            <a href="#styles" class="btn btn-ghost">{{ t('home.ctaStyles') }}</a>
          </div>
        </div>
        <!-- An invitation as a guest first sees it: the envelope with their name -->
        <div class="phone" aria-hidden="true">
          <div class="screen">
            <div class="envelope">
              <span class="flap" />
              <span class="seal">D &amp; S</span>
            </div>
            <p class="for">{{ t('home.sampleFor') }}</p>
            <span class="open">{{ t('home.sampleOpen') }}</span>
          </div>
        </div>
      </section>

      <section class="block" aria-labelledby="features-title">
        <h2 id="features-title">{{ t('home.featuresTitle') }}</h2>
        <ul class="features">
          <li v-for="f in features" :key="f.key">
            <span class="badge-icon"><WeddingIcon :name="f.icon" /></span>
            <h3>{{ t(`home.features.${f.key}.title`) }}</h3>
            <p>{{ t(`home.features.${f.key}.text`) }}</p>
          </li>
        </ul>
      </section>

      <section id="styles" class="block" aria-labelledby="styles-title">
        <h2 id="styles-title">{{ t('home.stylesTitle') }}</h2>
        <p class="block-lead">{{ t('home.stylesLead') }}</p>
        <ul class="styles">
          <li v-for="s in styles" :key="s.key" :style="{ '--paper': s.paper, '--ink': s.ink, '--trim': s.trim }">
            <div class="swatch" :class="s.key" aria-hidden="true">
              <span class="swatch-names">Dara <br>&amp; <br>Sophea</span>
            </div>
            <h3>{{ t(`home.styles.${s.key}.title`) }}</h3>
            <p>{{ t(`home.styles.${s.key}.text`) }}</p>
          </li>
        </ul>
      </section>

      <section class="block" aria-labelledby="how-title">
        <h2 id="how-title">{{ t('home.howTitle') }}</h2>
        <ol class="how">
          <li v-for="n in 3" :key="n">
            <span class="num">{{ n }}</span>
            <h3>{{ t(`home.how.${n}.title`) }}</h3>
            <p>{{ t(`home.how.${n}.text`) }}</p>
          </li>
        </ol>
      </section>

      <section v-if="hasContact" id="contact" class="block contact" aria-labelledby="contact-title">
        <h2 id="contact-title">{{ t('home.contactTitle') }}</h2>
        <p class="block-lead">{{ t('home.contactLead') }}</p>
        <div class="contacts">
          <a v-if="telegramUrl" :href="telegramUrl" target="_blank" rel="noopener" class="btn btn-primary">Telegram · @{{ site!.telegram }}</a>
          <a v-if="site!.phone" :href="`tel:${site!.phone.replace(/\s/g, '')}`" class="btn btn-outline tabular"><WeddingIcon name="phone" /> {{ site!.phone }}</a>
          <a v-if="site!.facebook" :href="site!.facebook" target="_blank" rel="noopener" class="btn btn-outline">Facebook</a>
          <a v-if="site!.email" :href="`mailto:${site!.email}`" class="btn btn-outline">{{ site!.email }}</a>
        </div>
      </section>
    </main>

    <footer class="foot">© {{ new Date().getFullYear() }} {{ name }}</footer>
  </div>
</template>

<style scoped>
.home {
  min-height: 100dvh; color: var(--c-text);
  background:
    radial-gradient(60rem 30rem at 85% -10%, color-mix(in srgb, var(--c-gold) 16%, transparent), transparent 70%),
    radial-gradient(50rem 30rem at -10% 10%, color-mix(in srgb, var(--c-secondary) 10%, transparent), transparent 70%),
    var(--c-bg);
}
.top, main, .foot { width: min(72rem, 100% - 2rem); margin-inline: auto; }
.top { display: flex; justify-content: space-between; align-items: center; padding-block: var(--space-4); }
.brand { font-family: var(--font-serif); font-size: 1.6rem; font-weight: 600; color: var(--c-secondary); }
.langs { display: flex; gap: var(--space-1); padding: 3px; border: 1px solid var(--c-line); border-radius: 999px; }
.langs a { min-width: 2.75rem; min-height: 2.75rem; display: grid; place-items: center; padding-inline: var(--space-3); border-radius: 999px; text-decoration: none; color: var(--c-muted); font-size: 0.9rem; }
.langs a.on { background: var(--c-secondary); color: var(--c-on-secondary); }

/* Hero: words on the left, a phone showing an invitation on the right (stacked on phones) */
.hero { display: grid; gap: var(--space-7); align-items: center; padding-block: var(--space-7) var(--space-8); }
@media (min-width: 860px) { .hero { grid-template-columns: 1.2fr 1fr; } }
.eyebrow { font-size: 0.8rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--c-accent-ink); font-weight: 500; }
.eyebrow:lang(km) { letter-spacing: 0; text-transform: none; font-size: 0.95rem; }
.hero h1 { margin-block: var(--space-3) var(--space-4); font-family: var(--font-serif); font-weight: 600; font-size: clamp(2.3rem, 6vw, 3.6rem); line-height: 1.08; color: var(--c-tertiary); text-wrap: balance; }
.hero h1:lang(km) { line-height: 1.5; font-size: clamp(1.8rem, 5vw, 2.6rem); }
.lead { font-size: 1.1rem; color: var(--c-muted); max-width: 34rem; text-wrap: pretty; }
.ctas { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-6); }
.ctas .btn { min-height: 48px; padding-inline: 1.4rem; }

.phone {
  justify-self: center; width: min(17rem, 72vw); aspect-ratio: 9 / 18.5; padding: 0.7rem;
  border-radius: 2.4rem; background: #1d1424; box-shadow: 0 30px 60px -25px rgb(45 22 64 / 0.55), 0 0 0 1px rgb(255 255 255 / 0.06) inset;
  rotate: 4deg;
}
.screen {
  height: 100%; border-radius: 1.7rem; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-4);
  background: radial-gradient(circle at 50% 35%, #fff, var(--c-bg) 70%);
}
.envelope { position: relative; width: 78%; aspect-ratio: 1.45; border-radius: 6px; background: var(--c-secondary); box-shadow: 0 0 0 1px var(--c-gold) inset, var(--shadow); }
.flap { position: absolute; inset: 0 0 auto; height: 58%; background: color-mix(in srgb, var(--c-secondary) 80%, #fff); clip-path: polygon(0 0, 100% 0, 50% 100%); }
.seal {
  position: absolute; left: 50%; top: 58%; translate: -50% -50%; width: 3rem; height: 3rem; display: grid; place-items: center;
  border-radius: 50%; font-family: var(--font-serif); font-size: 0.85rem; color: #5a4413;
  background: radial-gradient(circle at 35% 30%, var(--c-gold-light), var(--c-gold) 55%, var(--c-gold-deep));
  box-shadow: 0 3px 8px rgb(0 0 0 / 0.25);
}
@media (prefers-reduced-motion: no-preference) { .seal { animation: glow 3s ease-in-out infinite; } }
@keyframes glow { 50% { box-shadow: 0 3px 8px rgb(0 0 0 / 0.25), 0 0 0 6px color-mix(in srgb, var(--c-gold) 25%, transparent); } }
.for { font-family: var(--font-serif); font-style: italic; color: var(--c-muted); font-size: 0.95rem; text-align: center; padding-inline: var(--space-4); }
.open { padding: 0.45rem 1.1rem; border-radius: 6px; background: var(--c-secondary); color: var(--c-on-secondary); font-size: 0.8rem; }

.block { padding-block: var(--space-7); border-top: 1px solid var(--c-line-soft); }
.block h2 { font-family: var(--font-serif); font-weight: 600; font-size: clamp(1.8rem, 4vw, 2.4rem); color: var(--c-tertiary); text-align: center; text-wrap: balance; }
.block h2:lang(km) { line-height: 1.6; }
.block-lead { text-align: center; color: var(--c-muted); margin: var(--space-2) auto 0; max-width: 36rem; }
.block h3 { text-wrap: balance; font-size: 1.15rem; color: var(--c-secondary); margin-block: var(--space-3) var(--space-1); }

.features { list-style: none; margin: var(--space-6) 0 0; padding: 0; display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
/* Six features: two rows of three, never four and two */
@media (min-width: 860px) { .features { grid-template-columns: repeat(3, 1fr); } }
.features li { padding: var(--space-5); background: var(--c-surface); border: 1px solid var(--c-line-soft); border-radius: var(--radius-lg); }
.features p, .styles p, .how p { color: var(--c-muted); font-size: 0.95rem; }
.badge-icon { display: grid; place-items: center; width: 3rem; height: 3rem; border-radius: 50%; font-size: 1.4rem; color: var(--c-secondary); background: color-mix(in srgb, var(--c-secondary) 9%, transparent); }

.styles { list-style: none; margin: var(--space-6) 0 0; padding: 0; display: grid; gap: var(--space-5); grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr)); }
.swatch {
  aspect-ratio: 4 / 5; border-radius: var(--radius); display: grid; place-items: center; position: relative; overflow: hidden;
  background: var(--paper); box-shadow: var(--shadow), 0 0 0 1px color-mix(in srgb, var(--trim) 50%, transparent) inset;
}
.swatch::before { content: ''; position: absolute; inset: 0.7rem; border: 1px solid var(--trim); border-radius: 6px; }
/* Stacked on phones: wide and short, so the three styles fit in a scroll or two */
@media (max-width: 600px) { .swatch { aspect-ratio: 16 / 9; } .swatch-names { font-size: 1.7rem; } .swatch-names br { display: none; } }
.swatch-names { font-family: var(--font-script); font-size: 2.2rem; line-height: 1.1; text-align: center; color: var(--ink); }
/* Each style's signature, in miniature */
.swatch.classic { background: radial-gradient(circle at 50% 0, color-mix(in srgb, var(--trim) 22%, transparent), transparent 60%), var(--paper); }
.swatch.floral { background:
  radial-gradient(circle at 12% 10%, #c9b6e4 0 9%, transparent 10%), radial-gradient(circle at 22% 4%, #e3d3f0 0 6%, transparent 7%),
  radial-gradient(circle at 88% 92%, #c9b6e4 0 10%, transparent 11%), radial-gradient(circle at 78% 98%, #e3d3f0 0 7%, transparent 8%),
  var(--paper); }
.swatch.ruby { background: radial-gradient(ellipse 40% 42% at 50% 50%, var(--paper) 97%, transparent 100%), var(--ink); }
.swatch.ruby::before { inset: 1.2rem; border-color: var(--trim); }

.how { list-style: none; margin: var(--space-6) 0 0; padding: 0; display: grid; gap: var(--space-5); grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr)); counter-reset: none; }
.num { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border-radius: 50%; border: 2px solid var(--c-gold); color: var(--c-accent-ink); font-weight: 600; }

.contact { text-align: center; }
.contacts { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-3); margin-top: var(--space-5); }
.contacts .btn { min-height: 48px; gap: var(--space-2); }
.foot { padding-block: var(--space-6); text-align: center; color: var(--c-muted); font-size: 0.85rem; border-top: 1px solid var(--c-line-soft); }
</style>
