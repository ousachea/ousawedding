<script setup lang="ts">
// Petals drifting down over the whole page: a layer fixed to the screen, so they keep falling while
// the visitor scrolls. Taps go straight through, and the menu bar stays on top.
// Fixed positions so server and client render the same markup.
const petals = [
  { left: 4, delay: 0, dur: 17, size: 14 },
  { left: 23, delay: 4, dur: 19, size: 12 },
  { left: 45, delay: 2, dur: 18, size: 13 },
  { left: 56, delay: 10, dur: 21, size: 10 },
  { left: 77, delay: 14, dur: 20, size: 9 },
  { left: 95, delay: 9, dur: 19, size: 10 },
]
</script>

<template>
  <div class="petals" aria-hidden="true">
    <svg
      v-for="(p, i) in petals"
      :key="i"
      class="petal"
      viewBox="0 0 20 28"
      :style="{ left: `${p.left}%`, width: `${p.size}px`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }"
    >
      <path d="M10 1 C3 9 3 19 10 27 C17 19 17 9 10 1 Z" fill="currentColor" />
    </svg>
  </div>
</template>

<style scoped>
/* Above the page content, below the menu bar (--z-nav) and the envelope */
.petals { position: fixed; inset: 0; z-index: calc(var(--z-nav) - 1); overflow: hidden; pointer-events: none; }
.petal {
  position: absolute;
  top: -40px;
  height: auto;
  color: var(--c-accent);
  opacity: 0;
  animation: fall linear infinite;
}
@keyframes fall {
  0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
  10% { opacity: 0.35; }
  50% { transform: translate3d(28px, 50vh, 0) rotate(160deg); }
  90% { opacity: 0.3; }
  100% { transform: translate3d(-12px, 105vh, 0) rotate(320deg); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .petals { display: none; }
}
</style>
