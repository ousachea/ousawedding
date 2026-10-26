<script setup lang="ts">
defineProps<{ label: string, value: string | number, hint?: string }>()
</script>

<template>
  <div class="stat">
    <p class="label">{{ label }}</p>
    <p class="value tabular">{{ value }}</p>
    <p v-if="hint" class="hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.stat { padding: var(--space-4) var(--space-5); background: var(--c-surface); border: 1px solid var(--c-line-soft); border-radius: var(--radius); }
.label { font-size: 0.85rem; color: var(--c-muted); }
.value { font-size: 1.9rem; font-weight: 500; line-height: 1.2; color: var(--c-text); }
.hint { font-size: 0.8rem; color: var(--c-muted); }
</style>
