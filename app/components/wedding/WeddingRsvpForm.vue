<script setup lang="ts">
// RSVP on a static site: guests reply through the couple's form (e.g. a Google Form) until the deadline
const props = defineProps<{ data: PublicWedding, guestName?: string }>()
const { t } = useI18n()
const locale = useLocaleCode()
const w = computed(() => props.data.wedding)

// A burst of petals and gold from the reply button. The form opens in another tab, so the burst plays
// when the guest comes back to the invitation; with motion reduced, nothing plays.
const button = ref<HTMLElement>()
let replied = false
function burst() {
  const el = button.value
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const box = el.getBoundingClientRect()
  // Inside the page wrapper, so the pieces take the wedding's theme colours
  const host = el.closest('.wedding') ?? document.body
  for (let i = 0; i < 28; i++) {
    const petal = i % 3 !== 0
    const bit = document.createElement('span')
    bit.className = `burst ${petal ? 'burst-petal' : 'burst-gold'}`
    bit.style.left = `${box.left + box.width / 2}px`
    bit.style.top = `${box.top + box.height / 2}px`
    host.append(bit)
    const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.3
    const dist = 80 + Math.random() * 110
    const [x, y] = [Math.cos(angle) * dist, Math.sin(angle) * dist - 40]
    const spin = (Math.random() - 0.5) * 540
    bit.animate([
      { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 1 },
      { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${spin / 2}deg) scale(1)`, opacity: 1, offset: 0.45 },
      // then the petals drift down as they fade
      { transform: `translate(calc(-50% + ${x * 1.15}px), calc(-50% + ${y + 90}px)) rotate(${spin}deg) scale(0.9)`, opacity: 0 },
    ], { duration: 1800 + Math.random() * 600, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }).onfinish = () => bit.remove()
  }
}
function onReply() {
  replied = true
}
function onVisible() {
  if (replied && document.visibilityState === 'visible') {
    replied = false
    // Let the page settle back on screen first
    setTimeout(burst, 300)
  }
}
onMounted(() => document.addEventListener('visibilitychange', onVisible))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))
</script>

<template>
  <section id="rsvp" class="rsvp" aria-labelledby="rsvp-title">
    <div class="container narrow">
      <span v-reveal class="section-icon"><WeddingIcon name="envelope" /></span>
      <h2 v-reveal id="rsvp-title" class="section-title">{{ t('rsvp.title') }}</h2>
      <WeddingOrnament v-reveal="100" :motif="w.theme.motif" />

      <div v-reveal="150" class="panel">
        <p v-if="guestName" class="greeting">{{ t('rsvp.greeting', { name: guestName }) }}</p>
        <template v-if="data.deadlinePassed">
          <p class="center">{{ t('rsvp.closed', { date: data.display[locale].deadline }) }}</p>
        </template>
        <template v-else>
          <p class="center">{{ t('rsvp.intro') }}</p>
          <p class="center deadline">{{ t('rsvp.deadline', { date: data.display[locale].deadline }) }}</p>
          <p v-if="w.rsvp.formUrl" class="center">
            <a ref="button" :href="w.rsvp.formUrl" target="_blank" rel="noopener" class="btn btn-primary" @click="onReply">{{ t('rsvp.reply') }} ↗</a>
          </p>
          <p v-else class="center muted">{{ t('rsvp.noForm') }}</p>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rsvp { padding-block: var(--space-8); }
.narrow { max-width: 36rem; }
@media (min-width: 760px) { .narrow { max-width: 40rem; } .panel { padding: var(--space-7) var(--space-6); } }
.section-title { text-align: center; font-size: clamp(1.9rem, 6vw, 2.6rem); margin-bottom: var(--space-3); }
.panel {
  display: flex; flex-direction: column; gap: var(--space-4);
  margin-top: var(--space-6);
  padding: var(--space-6) var(--space-5);
  background: var(--c-surface);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.center { text-align: center; }
.muted { color: var(--c-muted); }
.deadline { color: var(--c-muted); }
.greeting { text-align: center; font-family: var(--font-serif); font-size: 1.5rem; color: var(--c-secondary); }
</style>

<style>
/* Burst pieces are added outside this component's markup, so these rules are not scoped */
.burst { position: fixed; z-index: var(--z-overlay); pointer-events: none; }
.burst-petal { width: 11px; height: 15px; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; background: color-mix(in srgb, var(--c-accent) 70%, #fff); }
.burst-gold { width: 6px; height: 6px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #f3e2a6, #c9a24a 60%, #8a6a22); }
</style>
