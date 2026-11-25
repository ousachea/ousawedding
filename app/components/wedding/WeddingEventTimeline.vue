<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
const props = defineProps<{ data: PublicWedding }>()
const { t } = useI18n()
const locale = useLocaleCode()
const L = useLocalized()
const w = computed(() => props.data.wedding)
const phones = computed(() => w.value.contact.phone.split(',').map(p => p.trim()).filter(Boolean))

// Khmer digits on the Khmer page
const intlLocale = computed(() => (locale.value === 'km' ? 'km-KH-u-nu-khmr' : 'en-US'))
// Written out rather than Intl, which some browsers lack Khmer data for (the server has it: hydration mismatch)
const num = (n: number) => (locale.value === 'km' ? kmDigits(n) : String(n))

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

// Focus: items crossing the middle of the screen stay clear, the rest fade back until scrolled to.
// Set up in the browser only (template refs don't run on the server), so without JavaScript nothing fades.
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
                <h4 class="event-title"><WeddingIcon :name="e.icon ?? 'calendar'" class="event-icon" /><span class="clamp event-name">{{ L(e.title) }}</span></h4>
                <!-- Safe as HTML: rebuilt by richText from a short list of tags -->
                <div v-if="L(e.description)" class="desc" v-html="richText(L(e.description))" />
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
        <!-- Every card has the same parts (badge, title, rule, text, then a foot pinned to the bottom),
             so side by side they line up row for row -->
        <div v-if="w.content[locale].dressCode" v-reveal class="info-card">
          <span class="info-badge"><WeddingIcon name="dress" /></span>
          <h3>{{ t('events.dressCode') }}</h3>
          <span class="info-rule" aria-hidden="true" />
          <p class="info-text">{{ w.content[locale].dressCode }}</p>
          <div class="info-foot">
            <p class="colours-label">{{ t('events.colours') }}</p>
            <!-- Visual only: the dress code text above says what to wear -->
            <ul class="colours" aria-hidden="true">
              <li v-for="c in colours" :key="c" :class="{ gold: c === 'var(--c-gold)' }" :style="{ '--swatch': c }" />
            </ul>
          </div>
        </div>
        <div v-if="w.content[locale].instructions" v-reveal="100" class="info-card">
          <span class="info-badge"><WeddingIcon name="info" /></span>
          <h3>{{ t('events.instructions') }}</h3>
          <span class="info-rule" aria-hidden="true" />
          <p class="info-text">{{ w.content[locale].instructions }}</p>
        </div>
        <div v-if="w.contact.phone || w.contact.email" v-reveal="200" class="info-card">
          <span class="info-badge"><WeddingIcon name="phone" /></span>
          <h3>{{ t('events.contact', { name: w.contact.name }) }}</h3>
          <span class="info-rule" aria-hidden="true" />
          <!-- Several numbers can be given, separated by commas; each is its own call button -->
          <div class="info-foot calls">
            <a v-for="phone in phones" :key="phone" :href="`tel:${phone.replace(/\s/g, '')}`" class="call tabular">
              <WeddingIcon name="phone" class="call-icon" />{{ phone }}
            </a>
            <a v-if="w.contact.email" :href="`mailto:${w.contact.email}`" class="call">{{ w.contact.email }}</a>
          </div>
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
/* The number, flower and icon fade; the words always stay readable.
   Opacity only: a blur here would be redrawn every frame while scrolling, which stutters on iPhone */
.focusing :is(.dot, .bloom, .event-icon) { transition: opacity 0.3s ease; }
.focusing .item:not(.active, :focus-within) :is(.dot, .bloom, .event-icon) { opacity: 0.35; }
@media (prefers-reduced-motion: reduce) { .focusing :is(.dot, .bloom, .event-icon) { transition: none; } }
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
.event-name { --lines: 3; }
.left { padding: 0 0.6em; border-radius: 999px; background: color-mix(in oklab, var(--c-accent) 14%, transparent); font-weight: 500; }
.desc { color: var(--c-muted); text-wrap: pretty; }
.desc :deep(:is(ul, ol)) { display: inline-block; margin: 0.3em 0; padding-left: 1.3em; text-align: left; }
.venue { font-style: normal; display: flex; gap: var(--space-2); font-size: 0.95rem; }
.venue-icon { color: var(--c-accent-ink); margin-top: 0.3em; }
.venue-text { display: flex; flex-direction: column; }
.venue strong { font-weight: 500; }
.venue-text span { color: var(--c-muted); }
.actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); align-items: flex-start; }

/* One column on phones; from tablet width three equal columns of equal height (never 2 + 1) */
.info { display: grid; gap: var(--space-4); max-width: 30rem; margin: var(--space-7) auto 0; }
@media (min-width: 760px) { .info { grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 58rem; } }
.info-card {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: var(--space-6) var(--space-5) var(--space-5);
  background: var(--c-surface); border: 1px solid var(--c-line); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s var(--ease-out), box-shadow 0.25s;
}
/* A gold hairline across the top of each card */
.info-card::before { content: ''; position: absolute; inset: 0 0 auto; height: 3px; background: linear-gradient(90deg, transparent, var(--c-gold), transparent); }
@media (hover: hover) { .info-card:hover { transform: translateY(-4px); box-shadow: var(--shadow); } }
.info-badge {
  display: grid; place-items: center; width: 3.5rem; height: 3.5rem; margin-bottom: var(--space-3);
  border-radius: 50%; font-size: 1.6rem; color: var(--c-secondary);
  background: color-mix(in oklab, var(--c-secondary) 9%, transparent);
  box-shadow: 0 0 0 6px color-mix(in oklab, var(--c-secondary) 4%, transparent);
}
/* The badge pops in as the card comes into view */
@media (prefers-reduced-motion: no-preference) { .info-card.revealed .info-badge { animation: badge 0.4s 0.2s var(--ease-out) backwards; } }
@keyframes badge { from { transform: scale(0.4) rotate(-20deg); opacity: 0; } 60% { transform: scale(1.12); } }
.info-card h3 { font-size: 1.3rem; color: var(--c-secondary); text-wrap: balance; }
.info-rule { width: 2.5rem; height: 2px; margin: var(--space-3) auto; border-radius: 2px; background: var(--c-gold); opacity: 0.7; }
.info-text { color: var(--c-text); text-wrap: pretty; }
/* Swatches and call buttons sit at the bottom, level across the row */
.info-foot { margin-top: auto; padding-top: var(--space-4); width: 100%; }
.calls { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.call {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  min-width: 11rem; min-height: 44px; padding: 0.55rem 1.1rem; border-radius: 999px;
  color: var(--c-secondary); text-decoration: none; font-weight: 500;
  border: 1px solid color-mix(in oklab, var(--c-secondary) 30%, transparent);
  transition: background-color 0.2s, color 0.2s, transform 0.15s;
}
@media (hover: hover) { .call:hover { background: var(--c-secondary); color: var(--c-on-secondary); } }
.call:active { transform: scale(0.97); }
.call-icon { font-size: 0.95rem; }
.colours-label { font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--c-muted); }
.colours-label:lang(km) { font-size: 0.85rem; letter-spacing: 0; text-transform: none; }
.colours { display: flex; justify-content: center; gap: var(--space-2); margin: var(--space-2) 0 0; padding: 0; list-style: none; }
/* A thin ring keeps light colours visible against the card */
.colours li { width: 30px; height: 30px; border-radius: 50%; background: var(--swatch); box-shadow: 0 0 0 2px var(--c-bg), 0 0 0 3px var(--c-line), 0 2px 6px -2px rgb(0 0 0 / 0.3); }
.colours li.gold { background: radial-gradient(circle at 35% 30% var(--oklch), var(--c-gold-light), var(--c-gold) 55%, var(--c-gold-deep)); }

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
/* The vine is drawn after the items, so lift the flower and number above its leaves */
.style-floral .bloom, .style-floral .dot { z-index: 1; }
.style-floral .bloom {
  display: block; position: absolute; left: -10.5px; top: -10.5px; width: 48px; height: 48px;
  fill: color-mix(in oklab, var(--c-accent) 45%, #fff); stroke: var(--c-accent); stroke-width: 0.8;
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
.style-floral .when { align-self: flex-start; padding: 0.15rem 0.6rem; border-radius: 999px; background: color-mix(in oklab, var(--c-secondary) 9%, transparent); font-size: 0.75rem; letter-spacing: 0.06em; color: color-mix(in oklab, var(--c-secondary) 85%, var(--c-text)); }
.style-floral .when > .icon { display: none; }
.style-floral .event-title { display: flex; align-items: center; gap: var(--space-2); margin-top: 2px; font-size: 1.15rem; line-height: 1.35; font-family: var(--font-serif); font-weight: 600; text-wrap: balance; }
.style-floral .event-icon { flex: none; font-size: 1.35rem; stroke-width: 1.9; color: var(--c-secondary); }
.style-floral .desc { font-size: 0.88rem; line-height: 1.7; text-wrap: pretty; }
.style-floral .venue { font-size: 0.85rem; }
.style-floral .left { background: color-mix(in oklab, var(--c-accent) 18%, transparent); }

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

/* Ruby style: each event is a red embossed arch (photo on top, handwritten title, white button) */
.style-ruby .timeline::before, .style-ruby .dot { display: none; }
.style-ruby .item { padding: 0 var(--space-3) var(--space-6); }
.style-ruby .day-title { font-family: var(--font-script); font-weight: 400; font-size: 2rem; color: var(--c-secondary); }
.style-ruby .card { background: var(--emboss), var(--c-secondary); color: #fff; border: 0; border-radius: 12rem 12rem 7rem 7rem; text-align: center; box-shadow: 0 18px 30px -18px rgb(80 0 10 / 0.7); }
.style-ruby .card-img { aspect-ratio: 1; }
.style-ruby .card-body { align-items: center; padding: var(--space-5) var(--space-5) 4rem; }
.style-ruby .when, .style-ruby .desc, .style-ruby .venue-icon { color: #fff; justify-content: center; }
.style-ruby .when { font-size: 1.1rem; }
.style-ruby .event-title { flex-direction: column; font-family: var(--font-script); font-weight: 400; font-size: 2.6rem; line-height: 1.2; }
.style-ruby .event-title:lang(km) { font-size: 1.6rem; line-height: 1.6; }
.style-ruby .event-icon { font-size: 2.2rem; color: #fff; }
.style-ruby .desc { opacity: 0.9; }
.style-ruby .venue { justify-content: center; text-align: center; text-transform: uppercase; letter-spacing: 0.04em; }
.style-ruby .venue-text { display: flex; flex-direction: column; }
.style-ruby .left { background: rgb(255 255 255 / 0.18); }
.style-ruby .actions .btn { background: #fff; border-color: #fff; color: var(--c-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
</style>
