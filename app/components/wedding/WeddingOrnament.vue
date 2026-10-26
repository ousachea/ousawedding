<script setup lang="ts">
// Gold line art. "lotus" and "kbach" are simplified, original motifs inspired by Khmer ornament.
withDefaults(defineProps<{ motif?: Motif, kind?: 'divider' | 'flower' | 'corner' }>(), { motif: 'lotus', kind: 'divider' })
</script>

<template>
  <svg
    v-if="motif !== 'none' && kind === 'divider'"
    class="ornament divider"
    viewBox="0 0 240 32"
    aria-hidden="true"
  >
    <g fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
      <path pathLength="1" d="M8 16 H88" />
      <path pathLength="1" d="M152 16 H232" />
      <template v-if="motif === 'lotus'">
        <path pathLength="1" d="M120 4 C112 12 112 22 120 28 C128 22 128 12 120 4 Z" />
        <path pathLength="1" d="M120 28 C110 26 102 20 100 10 C108 12 116 18 120 28" />
        <path pathLength="1" d="M120 28 C130 26 138 20 140 10 C132 12 124 18 120 28" />
        <path pathLength="1" d="M120 28 C108 30 96 26 90 18 C100 18 112 22 120 28" />
        <path pathLength="1" d="M120 28 C132 30 144 26 150 18 C140 18 128 22 120 28" />
      </template>
      <template v-else>
        <path pathLength="1" d="M120 6 C126 12 126 20 120 26 C114 20 114 12 120 6 Z" />
        <path pathLength="1" d="M108 16 C100 8 92 10 92 16 C92 21 98 22 101 18" />
        <path pathLength="1" d="M132 16 C140 8 148 10 148 16 C148 21 142 22 139 18" />
        <path pathLength="1" d="M108 16 H112 M128 16 H132" />
      </template>
      <circle cx="92" cy="16" r="1.4" fill="currentColor" />
      <circle cx="148" cy="16" r="1.4" fill="currentColor" />
    </g>
  </svg>

  <svg v-else-if="motif !== 'none' && kind === 'flower'" class="ornament flower" viewBox="0 0 64 48" aria-hidden="true">
    <g fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round">
      <path pathLength="1" d="M32 4 C24 14 24 30 32 42 C40 30 40 14 32 4 Z" />
      <path pathLength="1" d="M32 42 C20 40 12 30 10 18 C20 20 28 30 32 42" />
      <path pathLength="1" d="M32 42 C44 40 52 30 54 18 C44 20 36 30 32 42" />
      <path pathLength="1" d="M32 42 C18 46 6 40 2 32 C14 31 26 36 32 42" />
      <path pathLength="1" d="M32 42 C46 46 58 40 62 32 C50 31 38 36 32 42" />
    </g>
  </svg>

  <svg v-else-if="motif !== 'none'" class="ornament corner" viewBox="0 0 80 80" aria-hidden="true">
    <g fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
      <path pathLength="1" d="M4 76 V20 C4 10 10 4 20 4 H76" />
      <path pathLength="1" d="M12 76 V26 C12 18 18 12 26 12 H76" opacity="0.6" />
      <path pathLength="1" d="M20 20 C28 14 36 18 34 26 C32 32 24 30 26 24" />
      <path pathLength="1" d="M4 44 C12 40 16 46 12 50 M44 4 C40 12 46 16 50 12" />
    </g>
  </svg>
</template>

<style scoped>
.ornament { display: block; color: var(--c-accent); }
.divider { width: min(240px, 70%); height: auto; margin-inline: auto; }
.flower { width: 56px; height: auto; margin-inline: auto; }
.corner { width: 56px; height: 56px; }
</style>
