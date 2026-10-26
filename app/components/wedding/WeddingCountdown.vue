<script setup lang="ts">
// `when`: the wedding date and time as shown; `eventDays`: start times of the schedule, marked on the calendar
const props = defineProps<{ dateUtc: string, timezone: string, when: string, eventDays: string[], icsUrl: string }>()
const { t } = useI18n()
const locale = useLocaleCode()

const now = ref<number | null>(null)
let timer: ReturnType<typeof setInterval> | undefined

// The clock starts only in the browser, so server and client render the same placeholder first
onMounted(() => {
  now.value = Date.now()
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => clearInterval(timer))

const target = computed(() => new Date(props.dateUtc).getTime())
const dayKey = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: props.timezone }).format(ms)

const status = computed(() => {
  if (now.value === null) return 'pending'
  if (now.value < target.value) return 'counting'
  return dayKey(now.value) === dayKey(target.value) ? 'today' : 'passed'
})

// Month calendar of the wedding, in the wedding's timezone. Depends only on data, so it renders on the server too.
const intlLocale = computed(() => (locale.value === 'km' ? 'km-KH-u-nu-khmr' : 'en-US'))
const calendar = computed(() => {
  const [y, m, d] = dayKey(target.value).split('-').map(Number) as [number, number, number]
  const eventDays = new Set(props.eventDays.map(iso => dayKey(Date.parse(iso))))
  const pad = (n: number) => String(n).padStart(2, '0')
  const num = new Intl.NumberFormat(intlLocale.value)
  const days = Array.from({ length: new Date(Date.UTC(y, m, 0)).getUTCDate() }, (_, i) => ({
    n: num.format(i + 1),
    wedding: i + 1 === d,
    event: eventDays.has(`${y}-${pad(m)}-${pad(i + 1)}`),
  }))
  // Leading blanks so the 1st falls under its weekday (weeks start on Monday)
  const cells = [...Array<null>((new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7).fill(null), ...days]
  // Khmer one-letter weekdays repeat (អ, ព, ស), so Khmer uses the short names
  const weekday = new Intl.DateTimeFormat(intlLocale.value, { weekday: locale.value === 'km' ? 'short' : 'narrow', timeZone: 'UTC' })
  return {
    title: new Intl.DateTimeFormat(intlLocale.value, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, 1)),
    // 2023-01-02 was a Monday
    weekdays: Array.from({ length: 7 }, (_, i) => weekday.format(Date.UTC(2023, 0, 2 + i))),
    weeks: Array.from({ length: Math.ceil(cells.length / 7) }, (_, i) => cells.slice(i * 7, i * 7 + 7)),
  }
})

const units = computed(() => {
  const diff = now.value === null ? null : Math.max(0, target.value - now.value)
  // Khmer digits on the Khmer page, matching the size of the Khmer letters
  const digits = (str: string) => (locale.value === 'km' ? str.replace(/\d/g, d => '០១២៣៤៥៦៧៨៩'[Number(d)]!) : str)
  const v = (fn: (d: number) => number) => (diff === null ? '–' : digits(String(fn(diff)).padStart(2, '0')))
  return [
    { key: 'days', value: diff === null ? '–' : digits(String(Math.floor(diff / 86_400_000))) },
    { key: 'hours', value: v(d => Math.floor(d / 3_600_000) % 24) },
    { key: 'minutes', value: v(d => Math.floor(d / 60_000) % 60) },
    { key: 'seconds', value: v(d => Math.floor(d / 1000) % 60) },
  ]
})
</script>

<template>
  <section class="countdown" aria-labelledby="countdown-title">
    <div class="container">
      <span v-reveal class="section-icon"><WeddingIcon name="hourglass" /></span>
      <h2 id="countdown-title" v-reveal class="title">{{ t('countdown.title') }}</h2>
      <p v-reveal="60" class="when">{{ when }}</p>
      <p v-if="status === 'today' || status === 'passed'" class="done" role="status">
        {{ status === 'today' ? t('countdown.today') : t('countdown.passed') }}
      </p>
      <!-- aria-hidden: a ticking clock would be read aloud every second -->
      <div v-else v-reveal="120" class="units" aria-hidden="true">
        <div v-for="u in units" :key="u.key" class="unit">
          <!-- One flip per digit, so only the digit that changes moves (52 → 51 flips just the 2) -->
          <span class="num tabular">
            <span v-for="(c, i) in u.value" :key="`${u.value.length}-${i}`" class="digit">
              <Transition name="flip" mode="out-in">
                <span :key="c" class="digit-face">{{ c }}</span>
              </Transition>
            </span>
          </span>
          <span class="lbl">{{ t(`countdown.${u.key}`) }}</span>
        </div>
      </div>

      <table v-reveal="200" class="calendar">
        <caption>{{ calendar.title }}</caption>
        <thead>
          <tr><th v-for="(w, i) in calendar.weekdays" :key="i" scope="col">{{ w }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="(week, i) in calendar.weeks" :key="i">
            <td v-for="(day, j) in week" :key="j">
              <span v-if="day" class="day tabular" :class="{ wedding: day.wedding, event: day.event && !day.wedding }">
                {{ day.n }}<WeddingIcon v-if="day.wedding" name="heart" class="heart" />
                <span v-if="day.wedding" class="visually-hidden">({{ t('countdown.weddingDay') }})</span>
                <span v-else-if="day.event" class="visually-hidden">({{ t('countdown.ceremonyDay') }})</span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-reveal="240" class="legend" aria-hidden="true">
        <span><span class="key wedding" />{{ t('countdown.weddingDay') }}</span>
        <span v-if="calendar.weeks.flat().some(d => d?.event && !d.wedding)"><span class="key event" />{{ t('countdown.ceremonyDay') }}</span>
      </p>
      <!-- One calendar file with every schedule item at its own time (works with phone, Outlook and Google calendars) -->
      <p v-reveal="280" class="add-cal">
        <a :href="icsUrl" class="btn btn-sm"><WeddingIcon name="calendar" />{{ t('events.calendar') }}</a>
      </p>
    </div>
  </section>
</template>

<style scoped>
.countdown { padding-block: var(--space-7); background: var(--c-tertiary); color: var(--c-bg); }
.section-icon { color: color-mix(in srgb, var(--c-accent) 70%, #fff); }
.title { text-align: center; font-size: 1.5rem; margin-bottom: var(--space-5); color: color-mix(in srgb, var(--c-accent) 55%, #fff); }
.units { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-2); max-width: 30rem; margin-inline: auto; }
.unit {
  display: flex; flex-direction: column; align-items: center;
  padding: var(--space-3) var(--space-1);
  border: 1px solid color-mix(in srgb, var(--c-accent) 45%, transparent);
  border-radius: var(--radius);
}
.num { display: flex; justify-content: center; font-family: var(--font-serif); font-variant-numeric: lining-nums tabular-nums; font-size: clamp(1.7rem, 8vw, 2.6rem); line-height: 1.1; color: #fff; perspective: 300px; }
.digit { display: inline-block; min-width: 0.6em; text-align: center; }
.digit-face { display: inline-block; transform-origin: 50% 50%; backface-visibility: hidden; }
.lbl { font-size: 0.75rem; letter-spacing: 0.08em; opacity: 0.85; }
.flip-leave-active { transition: transform 0.18s ease-in, opacity 0.18s ease-in; }
.flip-enter-active { transition: transform 0.22s var(--ease-out), opacity 0.22s var(--ease-out); }
.flip-leave-to { transform: rotateX(90deg); opacity: 0.3; }
.flip-enter-from { transform: rotateX(-90deg); opacity: 0.3; }
@media (prefers-reduced-motion: reduce) { .flip-enter-active, .flip-leave-active { transition: none; } }
@media (min-width: 760px) {
  .units { max-width: 38rem; gap: var(--space-3); }
  .unit { padding: var(--space-4) var(--space-2); }
  .lbl { font-size: 0.85rem; }
}
.done { text-align: center; font-family: var(--font-serif); font-size: 1.4rem; }
.when { text-align: center; margin: calc(-1 * var(--space-3)) 0 var(--space-5); font-family: var(--font-serif); font-size: 1.15rem; }

.calendar { margin: var(--space-6) auto 0; border-collapse: separate; border-spacing: 4px; text-align: center; }
.calendar caption { margin-bottom: var(--space-2); font-family: var(--font-serif); font-size: 1.3rem; color: color-mix(in srgb, var(--c-accent) 55%, #fff); }
.calendar th { font-size: 0.7rem; white-space: nowrap; font-weight: 500; opacity: 0.7; padding-bottom: var(--space-1); }
.calendar td { width: 2.6rem; height: 2.6rem; padding: 0; }
.day { position: relative; display: grid; place-items: center; width: 2.4rem; height: 2.4rem; margin: auto; border-radius: 50%; font-size: 0.95rem; }
.day.event { border: 1px solid color-mix(in srgb, var(--c-accent) 75%, transparent); }
.day.wedding { background: var(--c-accent); color: var(--c-tertiary); font-weight: 700; box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-accent) 30%, transparent); }
/* The big day beats twice like a heart, then rests */
@media (prefers-reduced-motion: no-preference) {
  .day.wedding { animation: heartbeat 2.8s ease-in-out infinite; }
}
@keyframes heartbeat {
  0%, 30%, 100% { transform: scale(1); }
  8% { transform: scale(1.16); }
  16% { transform: scale(1); }
  23% { transform: scale(1.1); }
}
.heart { position: absolute; top: -0.45rem; right: -0.45rem; width: 1rem; height: 1rem; color: #fff; fill: var(--c-secondary); }
.legend { display: flex; justify-content: center; flex-wrap: wrap; gap: var(--space-4); margin-top: var(--space-3); font-size: 0.8rem; opacity: 0.85; }
.legend > span { display: inline-flex; align-items: center; gap: var(--space-1); }
.key { width: 0.8rem; height: 0.8rem; border-radius: 50%; }
.key.wedding { background: var(--c-accent); }
.key.event { border: 1px solid var(--c-accent); }
.add-cal { margin-top: var(--space-5); text-align: center; }
.add-cal .btn { display: inline-flex; align-items: center; gap: var(--space-2); border: 1px solid var(--c-accent); color: color-mix(in srgb, var(--c-accent) 55%, #fff); background: transparent; }
.add-cal .btn:hover { background: color-mix(in srgb, var(--c-accent) 18%, transparent); }
@media (min-width: 760px) { .calendar td { width: 3.2rem; height: 3rem; } .day { width: 2.8rem; height: 2.8rem; } }

/* Floral style: on the paper, large lavender digits separated by colons */
.style-floral .countdown { background: transparent; color: var(--c-text); }
.style-floral .section-icon { color: var(--c-secondary); }
.style-floral .title { color: var(--c-text); font-family: var(--font-serif); font-weight: 600; font-size: 1.1rem; letter-spacing: 0.22em; text-transform: uppercase; }
.style-floral .title:lang(km) { font-size: 1.4rem; letter-spacing: 0.02em; text-transform: none; }
.style-floral .units { gap: 1rem; }
.style-floral .unit { position: relative; border: 0; padding-inline: 0; }
/* Colon centred in the gap and on the digits' line */
.style-floral .unit:not(:last-child)::after {
  content: ':'; position: absolute; right: -0.5rem; top: var(--space-3); translate: 50% 0;
  font-family: var(--font-serif); font-size: clamp(2.2rem, 10vw, 3.2rem); line-height: 1.1; color: var(--c-accent);
}
.style-floral .num { color: var(--c-accent); font-size: clamp(2.2rem, 10vw, 3.2rem); }
.style-floral .lbl { color: var(--c-text); opacity: 0.75; }
.style-floral .calendar caption { color: var(--c-secondary); }
.style-floral .day.wedding { background: var(--c-secondary); color: #fff; box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-secondary) 20%, transparent); }
.style-floral .heart { fill: var(--c-accent); }
.style-floral .key.wedding { background: var(--c-secondary); }
.style-floral .add-cal .btn { border-color: var(--c-secondary); color: var(--c-secondary); }
.style-floral .add-cal .btn:hover { background: color-mix(in srgb, var(--c-secondary) 10%, transparent); }
</style>
