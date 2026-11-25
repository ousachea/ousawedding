<script setup lang="ts">
// Arrows that move an item one place, with its position between them. After a move, focus stays on the
// arrow tapped (or the other one at the top or bottom), so tapping again keeps moving the same item.
// The parent must key the item, so this component moves with it.
const props = defineProps<{ index: number, count: number, name: string, horizontal?: boolean }>()
const emit = defineEmits<{ move: [step: -1 | 1] }>()
const { t } = useI18n()
const prev = ref<HTMLButtonElement>()
const next = ref<HTMLButtonElement>()

async function go(step: -1 | 1) {
  emit('move', step)
  await nextTick()
  const first = props.index === 0
  const last = props.index === props.count - 1
  const target = step < 0 ? (first ? next : prev) : (last ? prev : next)
  target.value?.focus({ preventScroll: true })
}
const label = (step: -1 | 1) => `${t(props.horizontal ? (step < 0 ? 'admin.gallery.moveUp' : 'admin.gallery.moveDown') : (step < 0 ? 'admin.settings.moveUp' : 'admin.settings.moveDown'))}: ${props.name}`
</script>

<template>
  <div class="mover" :class="{ horizontal }" role="group" :aria-label="t('admin.events.order')">
    <button ref="prev" type="button" class="arrow" :disabled="index === 0" :aria-label="label(-1)" @click="go(-1)">
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path :d="horizontal ? 'M12.5 5l-5 5 5 5' : 'M5 12.5l5-5 5 5'" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>
    <span class="pos tabular" aria-hidden="true">{{ index + 1 }}</span>
    <button ref="next" type="button" class="arrow" :disabled="index === count - 1" :aria-label="label(1)" @click="go(1)">
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path :d="horizontal ? 'M7.5 5l5 5-5 5' : 'M5 7.5l5 5 5-5'" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>
  </div>
</template>

<style scoped>
.mover { display: flex; flex-direction: column; align-items: center; }
.mover.horizontal { flex-direction: row; gap: var(--space-1); }
.arrow {
  display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 0; border-radius: var(--radius-sm);
  background: transparent; color: var(--c-secondary); cursor: pointer;
  transition: background-color 0.15s, scale 0.15s var(--ease-out);
}
@media (hover: hover) { .arrow:hover:not(:disabled) { background: color-mix(in oklab, var(--c-secondary) 10%, transparent); } }
.arrow:active:not(:disabled) { scale: 0.97; }
.arrow:disabled { color: var(--c-line); cursor: default; }
.arrow:focus-visible { outline: 2px solid var(--c-secondary); outline-offset: -2px; }
.pos { min-width: 1.2rem; text-align: center; font-size: 0.85rem; font-weight: 700; color: var(--c-muted); line-height: 1; }
</style>
