<script setup lang="ts">
// Gold line-art icons on a 24px grid. Paths only (pathLength=1) so they can draw in like the ornaments.
const ICONS = {
  rings: ['M3 14a6 6 0 1 0 12 0a6 6 0 1 0-12 0', 'M9 14a6 6 0 1 0 12 0a6 6 0 1 0-12 0', 'M13.4 5.4 15 3.2l1.6 2.2L15 8z'],
  heart: ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'],
  calendar: [
    'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M3 10h18', 'M8 3v4', 'M16 3v4',
    'M12 18.5s-3-1.8-3-3.8a1.5 1.5 0 0 1 3-.9a1.5 1.5 0 0 1 3 .9c0 2-3 3.8-3 3.8z',
  ],
  hourglass: ['M7 3h10', 'M7 21h10', 'M8 3v3c0 3 4 4 4 6s-4 3-4 6v3', 'M16 3v3c0 3-4 4-4 6s4 3 4 6v3'],
  camera: [
    'M5 7h2.5L9 4h6l1.5 3H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z',
    'M8.5 13.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0',
  ],
  envelope: ['M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M3.5 6.5 12 13l8.5-6.5'],
  clock: ['M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0', 'M12 7v5l3 2'],
  pin: ['M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z', 'M9.5 9.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0'],
  dress: ['M9.5 3 10 7', 'M14.5 3 14 7', 'M10 7h4c0 1.6-.5 2.8-.5 4L18 20c-3.5 1.3-8.5 1.3-12 0l4.5-9c0-1.2-.5-2.4-.5-4z', 'M10.5 11h3'],
  info: ['M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0', 'M12 11v5', 'M12 7.6v.4'],
  phone: ['M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z'],
}
type IconName = keyof typeof ICONS
defineProps<{ name: IconName }>()
</script>

<template>
  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="d in ICONS[name]" :key="d" :d="d" pathLength="1" />
  </svg>
</template>

<style scoped>
.icon { width: 1.25em; height: 1.25em; flex: none; }
</style>
