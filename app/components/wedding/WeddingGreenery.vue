<script setup lang="ts">
// Greenery behind the whole page: leafy vines down both sides, in two depths, fixed to the screen.
// Each vine is a repeating tile filling the screen's height. The middle of the page stays clear for the text.
const TILE = { w: 110, h: 360 }

// One tile of vine: a wavy stem with leaves on alternating sides. Fixed values, so server and client match.
const stem = 'M40 0 C70 60 10 120 40 180 C70 240 10 300 40 360'
const leaves = Array.from({ length: 12 }, (_, i) => {
  const y = 15 + i * 30
  // Follows the stem, which swings about 9 units either side of x = 40 twice per tile
  const x = 40 + Math.sin((y / 360) * Math.PI * 4) * 9
  const side = i % 2 ? 1 : -1
  const len = 18 + ((i * 7) % 3) * 4
  // Leaves point up and outward: up-right on the right of the stem, up-left on the left
  const lift = 35 + ((i * 13) % 20)
  return { x, y, angle: side > 0 ? -lift : 180 + lift, len, shade: i % 3 }
})
const leaf = (len: number) => `M0 0 C${len * 0.3} ${-len * 0.28} ${len * 0.75} ${-len * 0.24} ${len} 0 C${len * 0.75} ${len * 0.24} ${len * 0.3} ${len * 0.28} 0 0 Z`
const SHADES = ['#6f8a66', '#8ba17f', '#56704f']

// Far vines: small and faint. Near vines: larger and stronger. They stay still behind the page.
const layers = [
  { id: 'far', scale: 0.8, opacity: 0.16, inset: '6%' },
  { id: 'near', scale: 1.25, opacity: 0.24, inset: '-18px' },
]
const uid = useId()
</script>

<template>
  <div class="greenery" aria-hidden="true">
    <div v-for="l in layers" :key="l.id" class="layer" :style="{ opacity: l.opacity }">
      <svg v-for="side in ['left', 'right']" :key="side" class="vine" :class="side" :style="{ [side]: l.inset, width: `${TILE.w * l.scale}px` }">
        <defs>
          <pattern :id="`${uid}-${l.id}-${side}`" :width="TILE.w" :height="TILE.h" patternUnits="userSpaceOnUse" :patternTransform="`scale(${l.scale})`">
            <path :d="stem" fill="none" stroke="#5d7556" stroke-width="1.4" stroke-linecap="round" />
            <path
              v-for="(f, i) in leaves"
              :key="i"
              :d="leaf(f.len)"
              :transform="`translate(${f.x} ${f.y}) rotate(${f.angle})`"
              :fill="SHADES[f.shade]"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" :fill="`url(#${uid}-${l.id}-${side})`" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
/* Behind the content but above the page's paper background (the page is its own stacking context) */
.greenery { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
.layer { position: absolute; inset: 0; }
.vine { position: absolute; top: 0; height: 100%; }
.vine.right { scale: -1 1; }
</style>
