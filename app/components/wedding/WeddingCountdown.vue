<script setup lang="ts">
const props = defineProps<{ dateUtc: string, timezone: string }>()
const { t } = useI18n()

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

const units = computed(() => {
  const diff = now.value === null ? null : Math.max(0, target.value - now.value)
  const v = (fn: (d: number) => number) => (diff === null ? '–' : String(fn(diff)).padStart(2, '0'))
  return [
    { key: 'days', value: diff === null ? '–' : String(Math.floor(diff / 86_400_000)) },
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
      <p v-if="status === 'today' || status === 'passed'" class="done" role="status">
        {{ status === 'today' ? t('countdown.today') : t('countdown.passed') }}
      </p>
      <!-- aria-hidden: a ticking clock would be read aloud every second -->
      <div v-else v-reveal="120" class="units" aria-hidden="true">
        <div v-for="u in units" :key="u.key" class="unit">
          <span class="num-wrap">
            <Transition name="tick" mode="out-in">
              <span :key="u.value" class="num tabular">{{ u.value }}</span>
            </Transition>
          </span>
          <span class="lbl">{{ t(`countdown.${u.key}`) }}</span>
        </div>
      </div>
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
.num-wrap { display: block; overflow: hidden; }
.num { display: block; font-family: var(--font-serif); font-size: clamp(1.7rem, 8vw, 2.6rem); line-height: 1.1; color: #fff; }
.lbl { font-size: 0.75rem; letter-spacing: 0.08em; opacity: 0.85; }
.tick-enter-active, .tick-leave-active { transition: transform 0.25s var(--ease-out), opacity 0.25s var(--ease-out); }
.tick-enter-from { transform: translateY(40%); opacity: 0; }
.tick-leave-to { transform: translateY(-40%); opacity: 0; }
@media (min-width: 760px) {
  .units { max-width: 38rem; gap: var(--space-3); }
  .unit { padding: var(--space-4) var(--space-2); }
  .lbl { font-size: 0.85rem; }
}
.done { text-align: center; font-family: var(--font-serif); font-size: 1.4rem; }
</style>
