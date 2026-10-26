<script setup lang="ts">
// RSVP on a static site: guests reply through the couple's form (e.g. a Google Form) until the deadline
const props = defineProps<{ data: PublicWedding, guestName?: string }>()
const { t } = useI18n()
const locale = useLocaleCode()
const w = computed(() => props.data.wedding)
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
            <a :href="w.rsvp.formUrl" target="_blank" rel="noopener" class="btn btn-primary">{{ t('rsvp.reply') }} ↗</a>
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
