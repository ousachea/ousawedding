<script setup lang="ts">
const props = defineProps<{ data: PublicWedding }>()
const { t } = useI18n()
const locale = useLocaleCode()
const L = useLocalized()
const w = computed(() => props.data.wedding)

function googleCalendarUrl(e: PublicWedding['events'][number]) {
  const fmt = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const names = w.value.names[locale.value]
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${L(e.title)} · ${names.partner1} & ${names.partner2}`,
    dates: `${fmt(e.startUtc)}/${fmt(e.endUtc)}`,
    details: [L(e.description), e.mapUrl].filter(Boolean).join('\n'),
    location: [L(e.venue), L(e.address)].filter(Boolean).join(', '),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

const icsUrl = (e: PublicWedding['events'][number]) =>
  `/api/public/weddings/${w.value.slug}/events/${e.id}.ics?lang=${locale.value}`
</script>

<template>
  <section id="schedule" class="schedule" aria-labelledby="schedule-title">
    <div class="container">
      <h2 v-reveal id="schedule-title" class="section-title">{{ t('events.title') }}</h2>
      <WeddingOrnament v-reveal="100" :motif="w.theme.motif" />

      <p v-if="!data.events.length" class="empty">{{ t('events.empty') }}</p>
      <ol v-else class="timeline">
        <li v-for="e in data.events" :key="e.id" v-reveal class="item">
          <span class="dot" aria-hidden="true" />
          <article class="card">
            <img v-if="e.imageUrl" :src="e.imageUrl" alt="" class="card-img" loading="lazy" decoding="async" width="640" height="360">
            <div class="card-body">
              <p class="when tabular">
                <span>{{ e.display[locale].date }}</span>
                <span class="time">{{ e.display[locale].time }}</span>
              </p>
              <h3 class="event-title">{{ L(e.title) }}</h3>
              <p v-if="L(e.description)" class="desc">{{ L(e.description) }}</p>
              <address v-if="L(e.venue) || L(e.address)" class="venue">
                <strong>{{ L(e.venue) }}</strong>
                <span v-if="L(e.address)">{{ L(e.address) }}</span>
              </address>
              <div class="actions">
                <a v-if="e.mapUrl" :href="e.mapUrl" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
                  {{ t('events.directions') }}
                </a>
                <details class="calendar">
                  <summary class="btn btn-ghost btn-sm">{{ t('events.calendar') }}</summary>
                  <div class="calendar-menu">
                    <a :href="googleCalendarUrl(e)" target="_blank" rel="noopener">{{ t('events.googleCalendar') }}</a>
                    <a :href="icsUrl(e)">{{ t('events.icsCalendar') }}</a>
                  </div>
                </details>
              </div>
            </div>
          </article>
        </li>
      </ol>

      <div v-if="w.content[locale].dressCode || w.content[locale].instructions || w.contact.phone || w.contact.email" class="info">
        <div v-if="w.content[locale].dressCode" v-reveal class="info-card">
          <h3>{{ t('events.dressCode') }}</h3>
          <p>{{ w.content[locale].dressCode }}</p>
        </div>
        <div v-if="w.content[locale].instructions" v-reveal="100" class="info-card">
          <h3>{{ t('events.instructions') }}</h3>
          <p>{{ w.content[locale].instructions }}</p>
        </div>
        <div v-if="w.contact.phone || w.contact.email" v-reveal="200" class="info-card">
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
  position: absolute; left: 4px; top: 1.4rem; width: 15px; height: 15px;
  border-radius: 50%; background: var(--c-bg); border: 1px solid var(--c-accent);
  box-shadow: inset 0 0 0 3px var(--c-bg), inset 0 0 0 8px var(--c-accent);
}
.item.revealed .dot { animation: ring 1.2s var(--ease-out) 0.3s; }
@keyframes ring {
  0% { box-shadow: inset 0 0 0 3px var(--c-bg), inset 0 0 0 8px var(--c-accent), 0 0 0 0 color-mix(in srgb, var(--c-accent) 50%, transparent); }
  100% { box-shadow: inset 0 0 0 3px var(--c-bg), inset 0 0 0 8px var(--c-accent), 0 0 0 12px transparent; }
}
.calendar[open] .calendar-menu { animation: menu 0.18s var(--ease-out); }
@keyframes menu { from { opacity: 0; transform: translateY(-4px); } }
.card { background: var(--c-surface); border: 1px solid var(--c-line-soft); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; }
.card-img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.card-body { padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-2); }
.when { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); font-size: 0.9rem; color: var(--c-accent-ink); font-weight: 500; }
.event-title { font-size: 1.5rem; }
.desc { color: var(--c-muted); }
.venue { font-style: normal; display: flex; flex-direction: column; font-size: 0.95rem; }
.venue strong { font-weight: 500; }
.venue span { color: var(--c-muted); }
.actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); align-items: flex-start; }
.calendar { position: relative; }
.calendar summary { list-style: none; border: 1px solid var(--c-line-soft); }
.calendar summary::-webkit-details-marker { display: none; }
.calendar-menu {
  position: absolute; z-index: 2; top: calc(100% + 4px); left: 0; min-width: 13rem;
  display: flex; flex-direction: column; padding: var(--space-1);
  background: var(--c-surface); border: 1px solid var(--c-line); border-radius: var(--radius); box-shadow: var(--shadow);
}
.calendar-menu a { padding: 0.55rem 0.8rem; border-radius: var(--radius-sm); text-decoration: none; font-size: 0.9rem; }
.calendar-menu a:hover { background: var(--c-line-soft); }

.info { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); max-width: 52rem; margin: var(--space-6) auto 0; }
.info-card { padding: var(--space-5); border: 1px solid var(--c-line); border-radius: var(--radius-lg); text-align: center; }
.info-card h3 { font-size: 1.25rem; margin-bottom: var(--space-2); color: var(--c-secondary); }
.info-card a { color: var(--c-secondary); }
</style>
