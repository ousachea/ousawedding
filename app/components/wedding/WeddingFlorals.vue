<script setup lang="ts">
// Watercolour-style flower cluster for the "floral" style: soft roses, sage leaves, filler blooms and berries.
// Drawn in SVG and tinted from the theme accent; a turbulence filter roughens the edges like wet paint.
// `flip` mirrors it for the opposite corner.
defineProps<{ flip?: boolean }>()
const uid = useId()

// Roses: [cx, cy, radius, rotation]
const ROSES: Array<[number, number, number, number]> = [[96, 72, 44, 0], [170, 46, 30, 40], [48, 140, 25, -30], [212, 96, 17, 15]]
// Leaves: [x, y, length, width, angle]
const LEAVES: Array<[number, number, number, number, number]> = [
  [130, 100, 58, 15, 30], [60, 98, 52, 14, 150], [190, 70, 46, 12, -10], [20, 60, 50, 13, 200],
  [150, 18, 40, 10, -60], [92, 128, 44, 12, 95], [228, 120, 36, 9, 40], [16, 168, 38, 10, 150],
]
const BUDS: Array<[number, number]> = [[236, 40], [128, 150], [12, 112]]
const BERRIES: Array<[number, number]> = [[244, 62], [250, 70], [240, 74], [110, 168], [118, 176]]

// Three rings of petals around each rose centre, outer ones larger
function petals(cx: number, cy: number, r: number, rot: number) {
  const ring = (n: number, dist: number, rx: number, ry: number, offset: number, shade: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = rot + offset + (360 / n) * i
      const rad = (a * Math.PI) / 180
      return { x: cx + Math.cos(rad) * dist * r, y: cy + Math.sin(rad) * dist * r, rx: rx * r, ry: ry * r, a, shade }
    })
  return [...ring(6, 0.46, 0.56, 0.42, 0, 0), ...ring(5, 0.26, 0.42, 0.32, 30, 1), ...ring(3, 0.1, 0.28, 0.22, 60, 2)]
}
const leaf = (l: number, w: number) => `M0 0C${l / 3} ${-w} ${(2 * l) / 3} ${-w} ${l} 0C${(2 * l) / 3} ${w} ${l / 3} ${w} 0 0Z`
</script>

<template>
  <svg class="florals" :class="{ flip }" viewBox="0 0 260 200" aria-hidden="true">
    <defs>
      <filter :id="`${uid}-paint`" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" />
        <feDisplacementMap in="SourceGraphic" scale="6" />
        <feGaussianBlur stdDeviation="0.5" />
      </filter>
      <filter :id="`${uid}-bleed`"><feGaussianBlur stdDeviation="9" /></filter>
      <radialGradient v-for="(mix, i) in [[20, 70], [35, 85], [55, 100]]" :id="`${uid}-petal${i}`" :key="i" cx="40%" cy="35%" r="75%">
        <stop offset="0" :style="{ stopColor: `color-mix(in srgb, var(--c-accent) ${mix[0]}%, #fff)` }" />
        <stop offset="1" :style="{ stopColor: `color-mix(in srgb, var(--c-accent) ${mix[1]}%, #3a2a5a)` }" />
      </radialGradient>
      <linearGradient :id="`${uid}-leaf`" x1="0" x2="1">
        <stop offset="0" stop-color="#7f9878" />
        <stop offset="1" stop-color="#b9c9b2" />
      </linearGradient>
    </defs>

    <!-- Soft colour wash behind the cluster, like pigment bleeding into wet paper -->
    <g :filter="`url(#${uid}-bleed)`" opacity="0.35">
      <ellipse cx="110" cy="80" rx="95" ry="55" :style="{ fill: 'color-mix(in srgb, var(--c-accent) 45%, #fff)' }" />
    </g>

    <g :filter="`url(#${uid}-paint)`">
      <g v-for="(l, i) in LEAVES" :key="`l${i}`" :transform="`translate(${l[0]} ${l[1]}) rotate(${l[4]})`">
        <path :d="leaf(l[2], l[3])" :fill="`url(#${uid}-leaf)`" opacity="0.8" />
        <path :d="`M2 0L${l[2] - 4} 0`" stroke="#5f775a" stroke-width="0.8" opacity="0.45" />
      </g>
      <g v-for="(b, i) in BERRIES" :key="`b${i}`">
        <circle :cx="b[0]" :cy="b[1]" r="2.6" fill="#4b3f6b" opacity="0.85" />
      </g>
      <g v-for="(b, i) in BUDS" :key="`u${i}`">
        <circle v-for="k in 5" :key="k" :cx="b[0] + Math.cos(k * 1.256) * 4.5" :cy="b[1] + Math.sin(k * 1.256) * 4.5" r="4" fill="#fbf8ff" :style="{ stroke: 'color-mix(in srgb, var(--c-accent) 50%, #fff)' }" stroke-width="0.6" />
        <circle :cx="b[0]" :cy="b[1]" r="1.8" :style="{ fill: 'color-mix(in srgb, var(--c-accent) 70%, #000)' }" />
      </g>
      <g v-for="(r, i) in ROSES" :key="`r${i}`">
        <ellipse
          v-for="(p, j) in petals(...r)"
          :key="j"
          :cx="p.x" :cy="p.y" :rx="p.rx" :ry="p.ry"
          :transform="`rotate(${p.a} ${p.x} ${p.y})`"
          :fill="`url(#${uid}-petal${p.shade})`"
          opacity="0.72"
        />
        <path
          :d="`M${r[0]} ${r[1]}m-${r[2] * 0.12} 0a${r[2] * 0.12} ${r[2] * 0.1} 0 1 1 ${r[2] * 0.2} ${r[2] * 0.06}a${r[2] * 0.2} ${r[2] * 0.16} 0 1 1-${r[2] * 0.3} -${r[2] * 0.1}`"
          fill="none" :style="{ stroke: 'color-mix(in srgb, var(--c-accent) 60%, #2a1d44)' }" stroke-width="1" opacity="0.5"
        />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.florals { display: block; width: 100%; height: auto; overflow: visible; pointer-events: none; }
.flip { transform: scaleX(-1); }
</style>
