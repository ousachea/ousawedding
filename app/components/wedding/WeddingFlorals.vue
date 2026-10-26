<script setup lang="ts">
// Watercolour-style flowers for the "floral" style, drawn in SVG and tinted from the theme accent:
// roses (deep, blush or white), pale anemones, filler blooms, and greenery (leaves, ferns, vines,
// eucalyptus, lavender, grass). `variant` + `seed` pick one of several layouts so no two spots match;
// `flip` mirrors it. Movement: flowers sway on their stems, greenery flutters, and with scroll-driven
// animation support each flower blooms open as it scrolls in and the cluster drifts (parallax).
// Fixed numbers only (no randomness), so server and browser draw the same picture.
const props = withDefaults(defineProps<{ flip?: boolean, variant?: 'corner' | 'sprig' | 'garland', seed?: number }>(), { variant: 'corner', seed: 0 })
const uid = useId()

type Pt = [number, number]
type Tint = 'deep' | 'blush' | 'white'
const deg = (d: number) => (d * Math.PI) / 180
// Trig results rounded, so every browser engine prints the same numbers as the server
const cos = (d: number): number => Math.round(Math.cos(deg(d)) * 1e4) / 1e4
const sin = (d: number): number => Math.round(Math.sin(deg(d)) * 1e4) / 1e4
const at = (x: number, y: number, a: number, dist: number): Pt => [x + cos(a) * dist, y + sin(a) * dist]

// A cupped petal pointing up from (0,0), with a slightly notched tip
const petal = (l: number, w: number) =>
  `M0 0C${-w * 0.95} ${-l * 0.22} ${-w * 0.85} ${-l * 0.9} ${-w * 0.3} ${-l}Q0 ${-l * 0.93} ${w * 0.3} ${-l}C${w * 0.85} ${-l * 0.9} ${w * 0.95} ${-l * 0.22} 0 0Z`
// A pointed leaf from (0,0) to the right
const leafPath = (l: number, w: number) => `M0 0C${l * 0.3} ${-w} ${l * 0.7} ${-w} ${l} 0C${l * 0.7} ${w} ${l * 0.3} ${w} 0 0Z`
const veins = (l: number, w: number) => [0.3, 0.5, 0.7].map(t => `M${l * t} 0L${l * (t + 0.12)} ${-w * 0.55}M${l * t} 0L${l * (t + 0.12)} ${w * 0.55}`).join('')

function rose(cx: number, cy: number, r: number, turn: number, tint: Tint) {
  const rings: Array<[number, number, number, number]> = [[7, 1, 0.62, 0], [6, 0.78, 0.52, 25], [5, 0.56, 0.42, 50], [4, 0.36, 0.32, 80]]
  return {
    kind: 'rose' as const, cx, cy, r, tint,
    petals: rings.flatMap(([n, len, wid, off], ring) => Array.from({ length: n }, (_, i) => ({
      d: petal(r * len, r * wid), t: `translate(${cx} ${cy}) rotate(${turn + off + (360 / n) * i})`, ring,
    }))),
    core: `M${cx - r * 0.16} ${cy + r * 0.02}c${r * 0.04} ${-r * 0.2} ${r * 0.3} ${-r * 0.2} ${r * 0.3} 0s${-r * 0.2} ${r * 0.18} ${-r * 0.34} ${r * 0.04}m${r * 0.08} ${-r * 0.02}c0 ${-r * 0.1} ${r * 0.14} ${-r * 0.1} ${r * 0.14} 0`,
  }
}
function anemone(cx: number, cy: number, r: number, turn: number) {
  return {
    kind: 'anemone' as const, cx, cy, r,
    petals: Array.from({ length: 6 }, (_, i) => `translate(${cx} ${cy}) rotate(${turn + i * 60})`),
    d: petal(r, r * 0.68),
    stamens: Array.from({ length: 14 }, (_, i) => at(cx, cy, i * 25.7, r * 0.32)),
  }
}
const bloom = (cx: number, cy: number, r: number) =>
  ({ kind: 'bloom' as const, cx, cy, r, petals: Array.from({ length: 5 }, (_, i) => at(cx, cy, i * 72 - 90, r * 0.62)) })

// Greenery
const leaf = (x: number, y: number, l: number, w: number, a: number) => ({ x, y, l, w, a })
function fern(x: number, y: number, len: number, a: number) {
  const [ex, ey] = at(x, y, a, len)
  const [mx, my] = at(x, y, a + 8, len * 0.5)
  return {
    stem: `M${x} ${y}Q${mx} ${my} ${ex} ${ey}`,
    leaflets: Array.from({ length: 12 }, (_, i) => {
      const t = (i + 1) / 13
      const [px, py] = at(x, y, a + Math.round(8 * Math.sin(t * Math.PI) * 10) / 10, len * t)
      return { x: px, y: py, a: a + (i % 2 ? 58 : -58), l: 15 * (1 - t) + 4, w: 3.4 * (1 - t) + 1.2 }
    }),
  }
}
function vine(x: number, y: number, len: number, a: number) {
  const pts = Array.from({ length: 17 }, (_, i): Pt => {
    const [px, py] = at(x, y, a, (len * i) / 16)
    const wave = Math.round(Math.sin(i * 0.9) * 60) / 10
    return [px + cos(a + 90) * wave, py + sin(a + 90) * wave]
  })
  return {
    path: `M${pts.map(p => p.join(' ')).join('L')}`,
    leaves: pts.filter((_, i) => i % 2 && i < 16).map(([px, py], i) => ({ x: px, y: py, a: a + (i % 2 ? 50 : -50), l: 11, w: 6 })),
  }
}
function lavender(x: number, y: number, len: number, a: number) {
  return {
    stem: `M${x} ${y}l${cos(a) * len} ${sin(a) * len}`,
    buds: Array.from({ length: 9 }, (_, i) => {
      const [px, py] = at(x, y, a, (len * (i + 2)) / 11)
      return { x: px + (i % 2 ? 2.2 : -2.2), y: py, a: a + 90 + (i % 2 ? 30 : -30) }
    }),
  }
}
function eucalyptus(x: number, y: number, len: number, a: number) {
  return {
    stem: `M${x} ${y}l${cos(a) * len} ${sin(a) * len}`,
    leaves: Array.from({ length: 6 }, (_, i): [number, number, number] => {
      const [px, py] = at(x, y, a, len * (0.15 + i * 0.15))
      const side = i % 2 ? 90 : -90
      return [px + cos(a + side) * 7, py + sin(a + side) * 7, 7.5 - i * 0.6]
    }),
  }
}
// A few fine curved grass blades fanning from one point
const wisp = (x: number, y: number, len: number, a: number) => [-14, 0, 12].map((s) => {
  const [ex, ey] = at(x, y, a + s, len * (1 - Math.abs(s) / 40))
  const [cx, cy] = at(x, y, a + s + 12, len * 0.55)
  return `M${x} ${y}Q${cx} ${cy} ${ex} ${ey}`
})

type Flower = ReturnType<typeof rose> | ReturnType<typeof anemone> | ReturnType<typeof bloom>
type Layout = {
  box: string, wash: [number, number, number, number]
  leaves: ReturnType<typeof leaf>[], ferns: ReturnType<typeof fern>[], vines: ReturnType<typeof vine>[]
  lavender: ReturnType<typeof lavender>[], eucalyptus: ReturnType<typeof eucalyptus>[], wisps: string[][]
  flowers: Flower[], berries: Pt[]
}
const LAYOUTS: Record<'corner' | 'sprig' | 'garland', Layout[]> = {
  corner: [
    {
      box: '0 0 320 240', wash: [150, 100, 140, 80],
      leaves: [leaf(100, 100, 90, 22, 200), leaf(120, 95, 95, 22, -20), leaf(205, 70, 70, 17, -40), leaf(60, 160, 72, 18, 140), leaf(215, 110, 80, 18, 25), leaf(120, 150, 70, 16, 80)],
      ferns: [fern(150, 40, 115, -62), fern(40, 150, 105, 158)],
      vines: [vine(170, 130, 140, 28)],
      lavender: [lavender(175, 45, 90, -40), lavender(190, 55, 75, -18)],
      eucalyptus: [eucalyptus(240, 150, 85, 35)],
      wisps: [wisp(270, 60, 55, -75)],
      flowers: [rose(112, 92, 52, 10, 'deep'), rose(212, 62, 36, 40, 'blush'), rose(268, 116, 22, 70, 'white'), anemone(56, 168, 30, 15),
        bloom(158, 152, 10), bloom(172, 162, 8), bloom(292, 62, 9), bloom(22, 98, 9), bloom(36, 108, 7)],
      berries: [[300, 92], [307, 100], [296, 103], [140, 186], [148, 194], [134, 196]],
    },
    {
      box: '0 0 320 240', wash: [140, 95, 135, 75],
      leaves: [leaf(80, 70, 80, 20, 160), leaf(90, 80, 85, 20, 20), leaf(165, 110, 75, 18, 60), leaf(230, 60, 70, 17, -30), leaf(40, 150, 65, 16, 110)],
      ferns: [fern(195, 115, 125, 18), fern(70, 45, 95, -125), fern(150, 60, 80, -70)],
      vines: [vine(10, 200, 190, -12)],
      lavender: [lavender(120, 40, 85, -95), lavender(135, 45, 70, -70)],
      eucalyptus: [eucalyptus(280, 90, 75, 75), eucalyptus(30, 110, 60, 200)],
      wisps: [wisp(250, 170, 50, 40), wisp(20, 40, 45, -110)],
      flowers: [rose(84, 74, 44, 30, 'blush'), rose(162, 112, 34, 0, 'deep'), anemone(232, 62, 26, 20), anemone(42, 152, 20, 40), rose(252, 142, 20, 60, 'white'),
        bloom(200, 90, 9), bloom(120, 150, 8), bloom(290, 120, 8), bloom(14, 100, 7)],
      berries: [[110, 40], [116, 33], [104, 31], [215, 175], [222, 182]],
    },
  ],
  sprig: [
    {
      box: '0 0 220 130', wash: [90, 65, 85, 45],
      leaves: [leaf(70, 66, 70, 17, 200), leaf(80, 60, 75, 17, -15), leaf(70, 72, 55, 14, 90)],
      ferns: [fern(95, 75, 80, 25)], vines: [], wisps: [wisp(190, 40, 35, -60)],
      lavender: [lavender(110, 50, 80, -30)], eucalyptus: [eucalyptus(30, 80, 60, 160)],
      flowers: [rose(72, 64, 32, 20, 'deep'), anemone(140, 82, 20, 0), bloom(112, 40, 8), bloom(176, 64, 8), bloom(28, 44, 7)],
      berries: [[188, 88], [194, 95], [184, 98]],
    },
    {
      box: '0 0 220 130', wash: [110, 65, 90, 45],
      leaves: [leaf(100, 62, 60, 15, 190), leaf(60, 75, 55, 14, -10)],
      ferns: [fern(120, 70, 90, -20), fern(80, 70, 70, 200)], vines: [], wisps: [wisp(30, 100, 40, -130)],
      lavender: [lavender(40, 50, 70, -120)], eucalyptus: [],
      flowers: [anemone(102, 62, 24, 10), rose(52, 72, 22, 50, 'blush'), bloom(150, 40, 8), bloom(160, 90, 7), bloom(20, 60, 7)],
      berries: [[180, 70], [186, 77], [176, 80]],
    },
    {
      box: '0 0 220 130', wash: [120, 70, 90, 40],
      leaves: [leaf(140, 66, 60, 15, -25), leaf(130, 72, 55, 14, 160)],
      ferns: [fern(60, 60, 80, 200)], vines: [vine(10, 95, 200, -10)], wisps: [],
      lavender: [lavender(170, 55, 65, -60)], eucalyptus: [eucalyptus(190, 80, 50, 20)],
      flowers: [rose(150, 58, 26, 15, 'white'), rose(110, 80, 18, 70, 'deep'), bloom(80, 50, 8), bloom(196, 40, 7)],
      berries: [[40, 40], [46, 47], [36, 50]],
    },
  ],
  garland: [
    {
      box: '0 0 420 80', wash: [210, 40, 190, 26],
      leaves: [leaf(200, 40, 50, 13, 200), leaf(220, 40, 50, 13, -20)],
      ferns: [fern(30, 45, 70, -15), fern(390, 45, 70, 195)],
      vines: [vine(0, 42, 205, -3), vine(420, 42, 205, 183)],
      lavender: [lavender(170, 40, 45, -100), lavender(250, 40, 45, -80)], eucalyptus: [], wisps: [],
      flowers: [rose(210, 40, 18, 0, 'blush'), bloom(150, 46, 7), bloom(270, 46, 7), bloom(90, 38, 6), bloom(330, 38, 6)],
      berries: [[180, 58], [186, 64], [240, 58], [234, 64]],
    },
  ],
}
const art = computed(() => {
  const list = LAYOUTS[props.variant]
  return list[props.seed % list.length]!
})
// Petal colours per rose tint: deep at the centre, light at the edges
const TINTS: Record<Tint, [string, string, string, string]> = {
  deep: ['color-mix(in srgb, var(--c-accent) 55%, #2a1846)', 'var(--c-accent)', 'color-mix(in srgb, var(--c-accent) 70%, #fff)', 'color-mix(in srgb, var(--c-accent) 40%, #fff)'],
  blush: ['color-mix(in srgb, var(--c-accent) 50%, #9c3d63)', 'color-mix(in srgb, var(--c-accent) 55%, #e59bb4)', 'color-mix(in srgb, var(--c-accent) 30%, #f8d3df)', '#fbeef3'],
  white: ['color-mix(in srgb, var(--c-accent) 60%, #fff)', 'color-mix(in srgb, var(--c-accent) 20%, #fff)', '#fbf9fd', '#fffefe'],
}
// Each flower sways at its own pace
const motion = (i: number) => ({ '--dur': `${5.5 + (i * 1.7) % 3}s`, '--delay': `${-(i * 1.3) % 4}s` })
</script>

<template>
  <svg class="florals" :class="[{ flip }, variant]" :viewBox="art.box" aria-hidden="true">
    <defs>
      <!-- A light paint texture: roughens edges a little but keeps the drawing crisp -->
      <filter :id="`${uid}-paint`" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="4" />
        <feDisplacementMap in="SourceGraphic" scale="2.2" />
      </filter>
      <filter :id="`${uid}-bleed`"><feGaussianBlur stdDeviation="10" /></filter>
      <!-- Petals are drawn rotated around each flower's centre, so the centre is (0,0) in their space -->
      <template v-for="(f, i) in art.flowers" :key="`g${i}`">
        <radialGradient v-if="f.kind === 'rose'" :id="`${uid}-f${i}`" gradientUnits="userSpaceOnUse" cx="0" cy="0" :r="f.r">
          <stop offset="0" :style="{ stopColor: TINTS[f.tint][0] }" />
          <stop offset="0.45" :style="{ stopColor: TINTS[f.tint][1] }" />
          <stop offset="0.8" :style="{ stopColor: TINTS[f.tint][2] }" />
          <stop offset="1" :style="{ stopColor: TINTS[f.tint][3] }" />
        </radialGradient>
        <radialGradient v-else-if="f.kind === 'anemone'" :id="`${uid}-f${i}`" gradientUnits="userSpaceOnUse" cx="0" cy="0" :r="f.r">
          <stop offset="0.2" :style="{ stopColor: 'color-mix(in srgb, var(--c-accent) 45%, #fff)' }" />
          <stop offset="1" stop-color="#fdfbff" />
        </radialGradient>
      </template>
      <linearGradient :id="`${uid}-leaf`" x1="0" x2="1">
        <stop offset="0" stop-color="#6f8a69" />
        <stop offset="1" stop-color="#b7c8af" />
      </linearGradient>
    </defs>

    <!-- Pigment bleeding into wet paper behind the cluster -->
    <g :filter="`url(#${uid}-bleed)`" opacity="0.3">
      <ellipse :cx="art.wash[0]" :cy="art.wash[1]" :rx="art.wash[2]" :ry="art.wash[3]" :style="{ fill: 'color-mix(in srgb, var(--c-accent) 45%, #fff)' }" />
    </g>

    <g :filter="`url(#${uid}-paint)`">
      <!-- Greenery, in two layers that flutter out of step -->
      <g class="greens">
        <path v-for="(w, i) in art.wisps.flat()" :key="`w${i}`" :d="w" fill="none" stroke="#7d9476" stroke-width="0.9" stroke-linecap="round" opacity="0.7" />
        <g v-for="(v, i) in art.vines" :key="`vi${i}`">
          <path :d="v.path" fill="none" stroke="#6f8a69" stroke-width="1.1" stroke-linecap="round" />
          <path v-for="(l, j) in v.leaves" :key="j" :d="leafPath(l.l, l.w)" :transform="`translate(${l.x} ${l.y}) rotate(${l.a})`" fill="#8fa886" opacity="0.9" />
        </g>
        <g v-for="(f, i) in art.ferns" :key="`fe${i}`">
          <path :d="f.stem" fill="none" stroke="#5f7a59" stroke-width="1" stroke-linecap="round" />
          <path v-for="(l, j) in f.leaflets" :key="j" :d="leafPath(l.l, l.w)" :transform="`translate(${l.x} ${l.y}) rotate(${l.a})`" fill="#86a07e" opacity="0.92" />
        </g>
      </g>
      <g class="greens greens-2">
        <g v-for="(l, i) in art.leaves" :key="`l${i}`" :transform="`translate(${l.x} ${l.y}) rotate(${l.a})`">
          <path :d="leafPath(l.l, l.w)" :fill="`url(#${uid}-leaf)`" opacity="0.88" />
          <path :d="`M1 0L${l.l - 3} 0${veins(l.l, l.w)}`" fill="none" stroke="#56704f" stroke-width="0.7" stroke-linecap="round" opacity="0.5" />
        </g>
        <g v-for="(e, i) in art.eucalyptus" :key="`e${i}`">
          <path :d="e.stem" stroke="#7a8f80" stroke-width="1.1" fill="none" />
          <circle v-for="(c, j) in e.leaves" :key="j" :cx="c[0]" :cy="c[1]" :r="c[2]" fill="#a3b8aa" stroke="#6f8676" stroke-width="0.6" opacity="0.9" />
        </g>
        <g v-for="(v, i) in art.lavender" :key="`v${i}`">
          <path :d="v.stem" stroke="#738a6c" stroke-width="1" fill="none" />
          <ellipse
            v-for="(b, j) in v.buds" :key="j" :cx="b.x" :cy="b.y" rx="2.6" ry="4.4" :transform="`rotate(${b.a} ${b.x} ${b.y})`"
            :style="{ fill: 'color-mix(in srgb, var(--c-accent) 80%, #3b2466)' }" opacity="0.85"
          />
        </g>
      </g>

      <!-- Flowers: each sways on its own and blooms open as it scrolls into view -->
      <g v-for="(f, i) in art.flowers" :key="`f${i}`" class="flower" :style="motion(i)">
        <template v-if="f.kind === 'rose'">
          <path
            v-for="(p, j) in f.petals" :key="j" :d="p.d" :transform="p.t" :fill="`url(#${uid}-f${i})`"
            :style="{ stroke: 'color-mix(in srgb, var(--c-accent) 55%, #2a1846)' }" stroke-width="0.7" :stroke-opacity="0.3 + p.ring * 0.1" :opacity="0.9 + p.ring * 0.03"
          />
          <path :d="f.core" fill="none" :style="{ stroke: 'color-mix(in srgb, var(--c-accent) 55%, #2a1846)' }" stroke-width="1.1" stroke-linecap="round" opacity="0.7" />
        </template>
        <template v-else-if="f.kind === 'anemone'">
          <path v-for="(t, j) in f.petals" :key="j" :d="f.d" :transform="t" :fill="`url(#${uid}-f${i})`" :style="{ stroke: 'color-mix(in srgb, var(--c-accent) 50%, #fff)' }" stroke-width="0.6" />
          <circle v-for="(s, j) in f.stamens" :key="`s${j}`" :cx="s[0]" :cy="s[1]" r="1.1" fill="#3b2f52" />
          <circle :cx="f.cx" :cy="f.cy" :r="f.r * 0.2" fill="#2f2545" />
        </template>
        <template v-else>
          <circle v-for="(p, j) in f.petals" :key="j" :cx="p[0]" :cy="p[1]" :r="f.r * 0.45" fill="#fcf9ff" :style="{ stroke: 'color-mix(in srgb, var(--c-accent) 55%, #fff)' }" stroke-width="0.6" />
          <circle :cx="f.cx" :cy="f.cy" :r="f.r * 0.2" fill="#d9b867" />
        </template>
      </g>
      <circle v-for="(b, i) in art.berries" :key="`y${i}`" :cx="b[0]" :cy="b[1]" r="3" fill="#43375f" />
    </g>
  </svg>
</template>

<style scoped>
.florals { display: block; width: 100%; height: auto; overflow: visible; pointer-events: none; }
.flip { transform: scaleX(-1); --dir: -1; }
.flower, .greens { transform-box: fill-box; }
.flower { transform-origin: 50% 85%; }
.greens { transform-origin: 30% 50%; }
.greens-2 { transform-origin: 60% 60%; }

@media (prefers-reduced-motion: no-preference) {
  /* Phone tilt (--tilt-x/-y from the page, -1..1): flowers move more than the greenery, for depth */
  .flower { translate: calc(var(--tilt-x, 0) * var(--dir, 1) * 7px) calc(var(--tilt-y, 0) * 5px); }
  .greens { translate: calc(var(--tilt-x, 0) * var(--dir, 1) * 3px) calc(var(--tilt-y, 0) * 2px); }

  /* Always: a gentle breeze */
  .flower { animation: sway var(--dur) ease-in-out var(--delay) infinite alternate; }
  .greens { animation: flutter 6.5s ease-in-out infinite alternate; }
  .greens-2 { animation-duration: 8s; animation-delay: -3s; }

  /* Where scroll-driven animation is supported: flowers bloom open as they scroll in, and the cluster drifts */
  @supports (animation-timeline: view()) {
    /* Named on the <svg> (it has a CSS box); SVG shapes inside cannot be view() subjects themselves */
    .florals { view-timeline-name: --florals; animation: drift linear both; animation-timeline: view(); }
    .sprig, .garland { --drift: 14px; }
    .flower {
      animation: sway var(--dur) ease-in-out var(--delay) infinite alternate, bloom linear both;
      animation-timeline: auto, --florals;
      animation-range: normal, entry 5% cover 35%;
    }
  }
}
@keyframes sway { from { rotate: -3deg; } to { rotate: 3deg; } }
@keyframes flutter { from { rotate: -1.6deg; } to { rotate: 1.4deg; } }
@keyframes bloom { from { scale: 0.35; opacity: 0; } }
@keyframes drift { from { translate: 0 var(--drift, 26px); } to { translate: 0 calc(-1 * var(--drift, 26px)); } }
</style>
