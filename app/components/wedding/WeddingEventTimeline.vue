<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
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
type Item = PublicWedding['events'][number]
// Items grouped by day: the date and countdown show once per day, each item only its time.
// `n` is the item's number across the whole schedule.
const days = computed(() => {
  const out: Array<{ date: string, first: Item, items: Array<{ e: Item, n: number }> }> = []
  props.data.events.forEach((e, n) => {
    const date = e.display[locale.value].date
    const last = out.at(-1)
    if (last?.date === date) last.items.push({ e, n })
    else out.push({ date, first: e, items: [{ e, n }] })
  })
  return out
})
// The wedding colours, shown with the dress code: the theme's purples, then gold
const colours = computed(() => [w.value.theme.accent, w.value.theme.secondary, w.value.theme.tertiary, 'var(--c-gold)'])
const started = (e: Item) => now.value !== null && now.value >= Date.parse(e.startUtc)

// Focus: items crossing the middle of the screen stay sharp, the rest blur until scrolled to.
// Set up in the browser only (template refs don't run on the server), so without JavaScript nothing blurs.
const active = ref(new Set<string>())
const focusing = ref(false)
let io: IntersectionObserver | undefined
const visible = new Set<string>()
function observe(el: Element | ComponentPublicInstance | null) {
  if (!(el instanceof Element) || !('IntersectionObserver' in window)) return
  io ??= new IntersectionObserver((entries) => {
    for (const en of entries) {
      const id = (en.target as HTMLElement).dataset.id!
      if (en.isIntersecting) visible.add(id)
      else visible.delete(id)
    }
    // Between two items, keep the last one sharp
    if (visible.size) active.value = new Set(visible)
  }, { rootMargin: '-35% 0px -35% 0px' })
  io.observe(el)
  focusing.value = true
}
onBeforeUnmount(() => io?.disconnect())

function remaining(e: Item) {
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
  <section id="schedule" class="schedule" :class="{ focusing }" aria-labelledby="schedule-title">
    <div class="container">
      <span v-reveal class="section-icon"><WeddingIcon name="calendar" /></span>
      <h2 v-reveal id="schedule-title" class="section-title">{{ t('events.title') }}</h2>
      <WeddingOrnament v-reveal="100" :motif="w.theme.motif" />

      <p v-if="!data.events.length" class="empty">{{ t('events.empty') }}</p>
      <div v-for="day in days" v-else :key="day.date" class="day">
        <h3 v-reveal class="day-title">
          {{ day.date }}<span v-if="!started(day.first) && remaining(day.first)" class="left">{{ remaining(day.first) }}</span>
        </h3>
        <ol class="timeline">
          <li v-for="({ e, n }, i) in day.items" :key="e.id" :ref="observe" v-reveal class="item" :class="{ active: active.has(e.id) }" :data-id="e.id" :style="{ '--row': i + 1 }">
            <!-- Floral style: a flower opens behind the number as the vine reaches it -->
            <svg v-if="w.theme.style === 'floral'" class="bloom" viewBox="-24 -24 48 48" aria-hidden="true">
              <ellipse v-for="a in [0, 72, 144, 216, 288]" :key="a" cx="0" cy="-14" rx="7.5" ry="10" :transform="`rotate(${a})`" />
            </svg>
            <span class="dot" aria-hidden="true">{{ num(n + 1) }}</span>
            <article class="card">
              <img v-if="e.imageUrl" :src="e.imageUrl" alt="" class="card-img" loading="lazy" decoding="async" width="640" height="360">
              <div class="card-body">
                <p class="when tabular">
                  <WeddingIcon name="clock" />
                  <span class="time">{{ e.display[locale].time }}</span>
                  <span v-if="started(e)" class="left">{{ remaining(e) }}</span>
                </p>
                <h4 class="event-title"><WeddingIcon :name="e.icon ?? 'calendar'" class="event-icon" />{{ L(e.title) }}</h4>
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
      </div>

      <div v-if="w.content[locale].dressCode || w.content[locale].instructions || w.contact.phone || w.contact.email" class="info">
        <div v-if="w.content[locale].dressCode" v-reveal class="info-card">
          <WeddingIcon name="dress" class="info-icon" />
          <h3>{{ t('events.dressCode') }}</h3>
          <p>{{ w.content[locale].dressCode }}</p>
          <p class="colours-label">{{ t('events.colours') }}</p>
          <!-- Visual only: the dress code text above says what to wear -->
          <ul class="colours" aria-hidden="true">
            <li v-for="c in colours" :key="c" :class="{ gold: c === 'var(--c-gold)' }" :style="{ '--swatch': c }" />
          </ul>
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

.timeline { list-style: none; padding: 0; margin: var(--space-4) auto 0; max-width: 40rem; position: relative; }
.day + .day { margin-top: var(--space-6); }
.focusing .item > * { transition: filter 0.45s var(--ease-out), opacity 0.45s var(--ease-out); }
.focusing .item:not(.active, :focus-within) > * { filter: blur(3px); opacity: 0.4; }
@media (prefers-reduced-motion: reduce) { .focusing .item > * { transition: none; } }
.day-title { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: var(--space-2); margin-top: var(--space-6); font-family: var(--font-serif); font-size: 1.3rem; text-align: center; color: var(--c-accent-ink); }
.day-title .left { font-family: var(--font-sans); font-size: 0.8rem; color: var(--c-text); }
@media (min-width: 760px) { .timeline { max-width: 44rem; } .event-title { font-size: 1.7rem; } }
.timeline::before { content: ''; position: absolute; left: 11px; top: 8px; bottom: 8px; width: 1px; background: var(--c-line); }
.item { position: relative; padding-left: 2.5rem; padding-bottom: var(--space-5); }
.dot {
  position: absolute; left: -2px; top: 1.2rem; width: 27px; height: 27px; display: grid; place-items: center;
  border-radius: 50%; background: var(--c-bg); border: 1px solid var(--c-accent);
  color: var(--c-accent-ink); font-size: 0.75rem; font-weight: 600; font-variant-numeric: tabular-nums;
}
/* The dot of the item being read pulses softly */
.dot::after { content: ''; position: absolute; inset: -1px; border-radius: 50%; border: 1px solid var(--c-accent); opacity: 0; }
@media (prefers-reduced-motion: no-preference) {
  .focusing .item.active .dot::after { animation: ring 2.8s var(--ease-out) infinite; }
}
@keyframes ring { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.4); opacity: 0; } }
/* The line draws down with the reader: view(block 50% 50%) measures against a line across the middle of the
   screen, so the tip sits at the centre of the screen. Each dot fills in as the tip reaches it. */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .timeline::before { transform-origin: top; animation: grow linear both; animation-timeline: view(block 50% 50%); }
    .dot { animation: reach linear both; animation-timeline: view(block 50% 50%); }
  }
}
@keyframes grow { from { transform: scaleY(0); } }
@keyframes reach {
  0%, 40% { background: var(--c-bg); }
  60%, 100% { background: var(--c-dot-on); border-color: var(--c-dot-on); color: var(--c-on-secondary); }
}
.timeline { --c-dot-on: var(--c-accent); }
.style-floral .timeline { --c-dot-on: var(--c-secondary); }
.card { background: var(--c-surface); border: 1px solid var(--c-line-soft); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; }
.card-img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.card-body { padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-2); }
.when { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-2); font-size: 0.9rem; color: var(--c-accent-ink); font-weight: 500; }
.event-title { margin: 0; font-size: 1.5rem; display: flex; align-items: center; gap: var(--space-2); }
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
.colours-label { margin-top: var(--space-3); font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--c-muted); }
.colours-label:lang(km) { font-size: 0.85rem; letter-spacing: 0; text-transform: none; }
.colours { display: flex; justify-content: center; gap: var(--space-2); margin: var(--space-2) 0 0; padding: 0; list-style: none; }
/* A thin ring keeps light colours visible against the card */
.colours li { width: 30px; height: 30px; border-radius: 50%; background: var(--swatch); box-shadow: 0 0 0 2px var(--c-bg), 0 0 0 3px var(--c-line), 0 2px 6px -2px rgb(0 0 0 / 0.3); }
.colours li.gold { background: radial-gradient(circle at 35% 30%, var(--c-gold-light), var(--c-gold) 55%, var(--c-gold-deep)); }

/* Floral style: no cards. On phones one column, line on the left, each item clearly on its own.
   From tablet width, items zig-zag left and right of a centre line. */
.style-floral .timeline::before { left: 13px; background: var(--c-text); opacity: 0.35; }
.style-floral .item { padding: 0 0 var(--space-6) 2.75rem; }
.style-floral .item:last-child { padding-bottom: var(--space-2); }
.style-floral .dot { left: 0; top: 0; background: var(--c-bg); border-color: var(--c-text); color: var(--c-text); }
/* The line becomes a vine: pairs of leaves along it, unveiled from the top as the line grows. The flower
   behind each number (drawn before it, so it sits underneath) opens as the vine reaches it. */
.style-floral .timeline::after {
  content: ''; position: absolute; left: 1.5px; top: 8px; bottom: 8px; width: 24px; pointer-events: none;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='46'%3E%3Cg fill='%238fa886' opacity='.85'%3E%3Cpath d='M12 16C8 16 3 13 2 7C7 7 11 10 12 16Z'/%3E%3Cpath d='M12 39C16 39 21 36 22 30C17 30 13 33 12 39Z'/%3E%3C/g%3E%3C/svg%3E") repeat-y;
}
.bloom { display: none; }
.style-floral .bloom {
  display: block; position: absolute; left: -10.5px; top: -10.5px; width: 48px; height: 48px;
  fill: color-mix(in srgb, var(--c-accent) 45%, #fff); stroke: var(--c-accent); stroke-width: 0.8;
}
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .style-floral .timeline::after { animation: unveil linear both; animation-timeline: view(block 50% 50%); }
    .style-floral .bloom { animation: open linear both; animation-timeline: view(block 50% 50%); }
  }
}
@keyframes unveil { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0); } }
@keyframes open { 0%, 40% { scale: 0; rotate: -70deg; } 70%, 100% { scale: 1; rotate: 0deg; } }
.style-floral .card { background: none; border: 0; box-shadow: none; border-radius: 0; overflow: visible; }
.style-floral .card-body { padding: 0; gap: var(--space-2); }
.style-floral .day-title { margin-bottom: var(--space-5); padding-bottom: var(--space-2); border-bottom: 1px solid var(--c-line-soft); }
.style-floral .day + .day { margin-top: var(--space-7); }
/* Time first, as a small label, so each item starts clearly */
.style-floral .when { align-self: flex-start; padding: 0.15rem 0.6rem; border-radius: 999px; background: color-mix(in srgb, var(--c-secondary) 9%, transparent); font-size: 0.75rem; letter-spacing: 0.06em; color: var(--c-secondary); }
.style-floral .when > .icon { display: none; }
.style-floral .event-title { display: flex; align-items: center; gap: var(--space-2); margin-top: 2px; font-size: 1.15rem; line-height: 1.35; font-family: var(--font-serif); font-weight: 600; text-wrap: balance; }
.style-floral .event-icon { flex: none; font-size: 1.35rem; color: var(--c-secondary); }
.style-floral .desc { font-size: 0.88rem; line-height: 1.7; text-wrap: pretty; }
.style-floral .venue { font-size: 0.85rem; }
.style-floral .left { background: color-mix(in srgb, var(--c-accent) 18%, transparent); }

@media (min-width: 700px) {
  .style-floral .timeline::before { left: 50%; }
  .style-floral .timeline::after { left: calc(50% - 12px); }
  .style-floral .bloom { left: -24.5px; }
  .style-floral .item:nth-child(even) .bloom { left: auto; right: -24.5px; }
  /* Two columns; each item spans two rows starting one row after the previous, so left and right interleave */
  .style-floral .timeline { display: grid; grid-template-columns: 1fr 1fr; column-gap: 0; }
  .style-floral .item { grid-column: 2; grid-row: var(--row) / span 2; padding: 0 0 var(--space-7) 2.75rem; }
  .style-floral .item:nth-child(even) { grid-column: 1; padding: 0 2.75rem var(--space-7) 0; text-align: right; }
  .style-floral .dot { left: -14px; }
  .style-floral .item:nth-child(even) .dot { left: auto; right: -14px; }
  .style-floral .item:nth-child(even) .when { align-self: flex-end; }
  .style-floral .item:nth-child(even) .event-title { flex-direction: row-reverse; }
  .style-floral .item:nth-child(even) .actions { justify-content: flex-end; }
  .style-floral .item:nth-child(even) .venue { flex-direction: row-reverse; }
}
</style>
