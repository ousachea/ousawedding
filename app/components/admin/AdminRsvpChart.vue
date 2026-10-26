<script setup lang="ts">
// Part-to-whole bar for RSVP status. Colours validated for colour-blind separation;
// every segment is also direct-labelled and listed in the table, so colour is never the only cue.
const props = defineProps<{ attending: number, pending: number, declined: number }>()
const { t } = useI18n()

const segments = computed(() => {
  const total = props.attending + props.pending + props.declined
  return [
    { key: 'attending', label: t('admin.guests.statuses.attending'), value: props.attending, color: '#2F7A50' },
    { key: 'pending', label: t('admin.guests.statuses.pending'), value: props.pending, color: '#B58325' },
    { key: 'declined', label: t('admin.guests.statuses.declined'), value: props.declined, color: '#B03A40' },
  ].map(s => ({ ...s, pct: total ? Math.round((s.value / total) * 100) : 0, share: total ? s.value / total : 0 }))
})
const total = computed(() => props.attending + props.pending + props.declined)
const hovered = ref<string | null>(null)
</script>

<template>
  <figure class="chart">
    <figcaption class="title">{{ t('admin.dashboard.breakdown') }}</figcaption>
    <div class="legend" aria-hidden="true">
      <span v-for="s in segments" :key="s.key" class="legend-item">
        <span class="swatch" :style="{ background: s.color }" />{{ s.label }}
      </span>
    </div>
    <div v-if="total" class="bar" aria-hidden="true">
      <div
        v-for="s in segments.filter(x => x.value)"
        :key="s.key"
        class="seg"
        :style="{ flexGrow: s.share, background: s.color }"
        @mouseenter="hovered = s.key"
        @mouseleave="hovered = null"
      >
        <span v-if="hovered === s.key" class="tip tabular">{{ s.label }} · {{ s.value }} ({{ s.pct }}%)</span>
      </div>
    </div>
    <div v-else class="bar empty" aria-hidden="true" />
    <table class="table">
      <thead class="visually-hidden">
        <tr><th>{{ t('admin.guests.status') }}</th><th>#</th><th>%</th></tr>
      </thead>
      <tbody>
        <tr v-for="s in segments" :key="s.key">
          <th scope="row"><span class="swatch" :style="{ background: s.color }" aria-hidden="true" />{{ s.label }}</th>
          <td class="tabular">{{ s.value }}</td>
          <td class="tabular muted">{{ s.pct }}%</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>

<style scoped>
.chart { margin: 0; padding: var(--space-5); background: var(--c-surface); border: 1px solid var(--c-line-soft); border-radius: var(--radius); display: flex; flex-direction: column; gap: var(--space-3); }
.title { font-weight: 500; }
.legend { display: flex; flex-wrap: wrap; gap: var(--space-4); font-size: 0.85rem; color: var(--c-muted); }
.legend-item { display: inline-flex; align-items: center; gap: 6px; }
.swatch { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: baseline; }
.legend .swatch { margin-right: 0; }
.bar { display: flex; gap: 2px; height: 14px; }
.bar.empty { background: var(--c-line-soft); border-radius: 4px; }
.seg { position: relative; min-width: 4px; border-radius: 4px; cursor: default; }
.seg::before { content: ''; position: absolute; inset: -10px 0; }
.tip {
  position: absolute; bottom: calc(100% + 8px); left: 50%; translate: -50% 0; white-space: nowrap; z-index: 2;
  padding: 4px 8px; border-radius: var(--radius-sm); font-size: 0.8rem;
  background: var(--c-text); color: var(--c-bg); pointer-events: none;
}
.table { border-collapse: collapse; font-size: 0.9rem; }
.table th { text-align: left; font-weight: 400; padding: 4px 0; }
.table td { text-align: right; padding: 4px 0 4px var(--space-4); }
.muted { color: var(--c-muted); }
</style>
