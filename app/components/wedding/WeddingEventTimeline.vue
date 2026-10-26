<script setup lang="ts">
const props = defineProps<{ data: PublicWedding }>()
const { t } = useI18n()
const locale = useLocaleCode()
const L = useLocalized()
const w = computed(() => props.data.wedding)

// Khmer digits on the Khmer page
const intlLocale = computed(() => (locale.value === 'km' ? 'km-KH-u-nu-khmr' : 'en-US'))
const num = (n: number) => new Intl.NumberFormat(intlLocale.value).format(n)

// Time left until each item. Set only after mount (then every minute) so server and client HTML match.
const now = ref<number | null>(null)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  now.value = Date.now()
  timer = setInterval(() => (now.value = Date.now()), 60_000)
})
onBeforeUnmount(() => clearInterval(timer))
function remaining(e: PublicWedding['events'][number]) {
  if (now.value === null) return ''
  const start = Date.parse(e.startUtc)
  if (now.value >= Date.parse(e.endUtc)) return t('events.done')
  if (now.value >= start) return t('events.happening')
  const mins = Math.floor((start - now.value) / 60_000)
  const [value, unit] = mins >= 1440 ? [Math.floor(mins / 1440), 'day' as const] : mins >= 60 ? [Math.floor(mins / 60), 'hour' as const] : [Math.max(mins, 1), 'minute' as const]
  return new Intl.RelativeTimeFormat(intlLocale.value).format(value, unit)
}
</script>

<template>
  <section id="schedule" class="schedule" aria-labelledby="schedule-title">
    <div class="container">
      <span v-reveal class="section-icon"><WeddingIcon name="calendar" /></span>
      <h2 v-reveal id="schedule-title" class="section-title">{{ t('events.title') }}</h2>
      <WeddingOrnament v-reveal="100" :motif="w.theme.motif" />

      <p v-if="!data.events.length" class="empty">{{ t('events.empty') }}</p>
      <ol v-else class="timeline">
        <li v-for="(e, i) in data.events" :key="e.id" v-reveal class="item">
          <span class="dot" aria-hidden="true">{{ num(i + 1) }}</span>
          <article class="card">
            <img v-if="e.imageUrl" :src="e.imageUrl" alt="" class="card-img" loading="lazy" decoding="async" width="640" height="360">
            <div class="card-body">
              <p class="when tabular">
                <WeddingIcon name="clock" />
                <span>{{ e.display[locale].date }}</span>
                <span class="time">{{ e.display[locale].time }}</span>
                <span v-if="remaining(e)" class="left">{{ remaining(e) }}</span>
              </p>
              <h3 class="event-title"><WeddingIcon :name="e.icon ?? 'calendar'" class="event-icon" />{{ L(e.title) }}</h3>
              <p v-if="L(e.description)" class="desc">{{ L(e.description) }}</p>
              <address v-if="L(e.venue) || L(e.address)" class="venue">
                <WeddingIcon name="pin" class="venue-icon" />
                <span class="venue-text">
                  <strong>{{ L(e.venue) }}</strong>
                  <span v-if="L(e.address)">{{ L(e.address) }}</span>
                </span>
              </address>
              <div v-if="e.mapUrl" class="actions">
                <a :href="e.mapUrl" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
                  {{ t('events.directions') }}
                </a>
              </div>
            </div>
          </article>
        </li>
      </ol>

      <div v-if="w.content[locale].dressCode || w.content[locale].instructions || w.contact.phone || w.contact.email" class="info">
        <div v-if="w.content[locale].dressCode" v-reveal class="info-card">
          <WeddingIcon name="dress" class="info-icon" />
          <h3>{{ t('events.dressCode') }}</h3>
          <p>{{ w.content[locale].dressCode }}</p>
        </div>
        <div v-if="w.content[locale].instructions" v-reveal="100" class="info-card">
          <WeddingIcon name="info" class="info-icon" />
          <h3>{{ t('events.instructions') }}</h3>
          <p>{{ w.content[locale].instructions }}</p>
        </div>
        <div v-if="w.contact.phone || w.contact.email" v-reveal="200" class="info-card">
          <WeddingIcon name="phone" class="info-icon" />
          <h3>{{ t('events.contact', { name: w.contact.name }) }}</h3>
          <p>
            <a v-if="w.contact.phone" :href="`tel:${w.contact.phone.replace(/\s/g, '')}`" class="tabular">{{ w.contact.phone }}</a>
            <template v-if="w.contact.phone && w.contact.email"><br></template>
            <a v-if="w.contact.email" :href="`mailto:${w.contact.email}`">{{ w.contact.email }}</a>
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.schedule { padding-block: var(--space-8); }
.section-title { text-align: center; font-size: clamp(1.9rem, 6vw, 2.6rem); margin-bottom: var(--space-3); }
.empty { text-align: center; color: var(--c-muted); margin-top: var(--space-5); }

.timeline { list-style: none; padding: 0; margin: var(--space-6) auto 0; max-width: 40rem; position: relative; }
@media (min-width: 760px) { .timeline { max-width: 44rem; } .event-title { font-size: 1.7rem; } }
.timeline::before { content: ''; position: absolute; left: 11px; top: 8px; bottom: 8px; width: 1px; background: var(--c-line); }
.item { position: relative; padding-left: 2.5rem; padding-bottom: var(--space-5); }
.dot {
  position: absolute; left: -2px; top: 1.2rem; width: 27px; height: 27px; display: grid; place-items: center;
  border-radius: 50%; background: var(--c-bg); border: 1px solid var(--c-accent);
  color: var(--c-accent-ink); font-size: 0.75rem; font-weight: 600; font-variant-numeric: tabular-nums;
}
/* Each dot pulses softly; the gold line draws downward as the schedule scrolls by */
.dot::after { content: ''; position: absolute; inset: -1px; border-radius: 50%; border: 1px solid var(--c-accent); opacity: 0; }
@media (prefers-reduced-motion: no-preference) {
  .dot::after { animation: ring 2.8s var(--ease-out) infinite; }
  .item:nth-child(2) .dot::after { animation-delay: 0.9s; }
  .item:nth-child(3n) .dot::after { animation-delay: 1.8s; }
}
@keyframes ring { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.4); opacity: 0; } }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .timeline::before { transform-origin: top; animation: grow linear both; animation-timeline: view(); animation-range: entry 10% cover 70%; }
  }
}
@keyframes grow { from { transform: scaleY(0); } }
.card { background: var(--c-surface); border: 1px solid var(--c-line-soft); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; }
.card-img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.card-body { padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-2); }
.when { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-2); font-size: 0.9rem; color: var(--c-accent-ink); font-weight: 500; }
.event-title { font-size: 1.5rem; display: flex; align-items: center; gap: var(--space-2); }
.event-icon { color: var(--c-accent); }
.left { padding: 0 0.6em; border-radius: 999px; background: color-mix(in srgb, var(--c-accent) 14%, transparent); font-weight: 500; }
.desc { color: var(--c-muted); }
.venue { font-style: normal; display: flex; gap: var(--space-2); font-size: 0.95rem; }
.venue-icon { color: var(--c-accent-ink); margin-top: 0.3em; }
.venue-text { display: flex; flex-direction: column; }
.venue strong { font-weight: 500; }
.venue-text span { color: var(--c-muted); }
.actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); align-items: flex-start; }

.info { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); max-width: 52rem; margin: var(--space-6) auto 0; }
.info-card { padding: var(--space-5); border: 1px solid var(--c-line); border-radius: var(--radius-lg); text-align: center; }
.info-icon { font-size: 30px; color: var(--c-accent-ink); margin: 0 auto var(--space-2); display: block; }
.info-card h3 { font-size: 1.25rem; margin-bottom: var(--space-2); color: var(--c-secondary); }
.info-card a { color: var(--c-secondary); }
</style>
