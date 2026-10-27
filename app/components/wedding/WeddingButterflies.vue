<script setup lang="ts">
// Butterflies wandering over the whole page, each with its own pastel tint. Like the petals, a layer fixed
// to the screen that taps go straight through. Colours and paths are random per visit, so they are
// created in the browser only (the server renders the empty layer) and skipped when motion is reduced.
// On phones and tablets they come to the visitor's finger while it touches the screen, then wander off again.
type Butterfly = { id: number, size: number, hue: number, sat: number, flap: number }
const flock = ref<Butterfly[]>([])
const els = new Map<number, HTMLElement>()
// Each butterfly's current flight, replaced when it changes course
const flights = new Map<number, Animation>()
let stopped = false

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const heading = (from: [number, number], to: [number, number]) =>
  // Drawn heading up the screen, so add 90° to the direction of travel
  (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI + 90
// `angle` moved to within 180° of `ref`, so turning from one to the other takes the short way round
const near = (angle: number, ref: number) => ref + ((((angle - ref) % 360) + 540) % 360) - 180

// Where a butterfly is right now, mid-flight included
function position(el: HTMLElement): [number, number] {
  const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
  return [m.e, m.f]
}
// Read the position before cancelling: a cancelled flight snaps back to the start
function stop(b: Butterfly): [number, number] | null {
  const el = els.get(b.id)
  if (!el) return null
  const at = position(el)
  flights.get(b.id)?.cancel()
  return at
}

// One flight: a few random waypoints across the screen, flown at a gentle speed, turning to face the way it
// goes. When it lands on the last one it sets off again from there.
function fly(b: Butterfly, from: [number, number]) {
  const el = els.get(b.id)
  if (!el || stopped) return
  const w = innerWidth
  const h = innerHeight
  const points: Array<[number, number]> = [from]
  for (let i = 0; i < 4; i++) points.push([rand(-0.05, 1.05) * w, rand(0.05, 0.95) * h])
  const speed = rand(35, 70) // px per second
  let total = 0
  let turn = 0
  const legs = points.slice(1).map((p, i) => {
    const [x0, y0] = points[i]!
    const dist = Math.hypot(p[0] - x0, p[1] - y0)
    total += dist
    turn = i ? near(heading([x0, y0], p), turn) : heading([x0, y0], p)
    return { p, dist, angle: turn }
  })
  let done = 0
  const frames: Keyframe[] = [{ transform: `translate(${from[0]}px, ${from[1]}px) rotate(${legs[0]!.angle}deg)`, offset: 0 }]
  for (const leg of legs) {
    done += leg.dist
    frames.push({ transform: `translate(${leg.p[0]}px, ${leg.p[1]}px) rotate(${leg.angle}deg)`, offset: done / total, easing: 'ease-in-out' })
  }
  const anim = el.animate(frames, { duration: (total / speed) * 1000, fill: 'forwards', easing: 'linear' })
  flights.set(b.id, anim)
  anim.onfinish = () => fly(b, points.at(-1)!)
}

// Finger: each butterfly heads for its own spot in a loose ring around the touch, quicker than it wanders
let lastChase = 0
let resume: ReturnType<typeof setTimeout> | undefined
function chase(x: number, y: number) {
  const now = performance.now()
  if (now - lastChase < 120) return
  lastChase = now
  clearTimeout(resume)
  const n = flock.value.length
  for (const b of flock.value) {
    const from = stop(b)
    if (!from) continue
    const angle = (b.id / n) * Math.PI * 2 + rand(-0.3, 0.3)
    const radius = rand(30, 64)
    const to: [number, number] = [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]
    // Once there, turn to face the finger, the short way round
    const travel = heading(from, to)
    const face = near(heading(to, [x, y]), travel)
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1])
    const anim = els.get(b.id)!.animate([
      { transform: `translate(${from[0]}px, ${from[1]}px) rotate(${travel}deg)` },
      { transform: `translate(${to[0]}px, ${to[1]}px) rotate(${travel}deg)`, offset: 0.85 },
      { transform: `translate(${to[0]}px, ${to[1]}px) rotate(${face}deg)` },
    ], { duration: Math.max(450, (dist / 260) * 1000), fill: 'forwards', easing: 'ease-out' })
    flights.set(b.id, anim)
  }
}
const onTouch = (e: TouchEvent) => {
  const t = e.touches[0]
  if (t) chase(t.clientX, t.clientY)
}
// After the finger lifts, a short pause, then off they go from wherever they are
function release() {
  clearTimeout(resume)
  resume = setTimeout(() => {
    for (const b of flock.value) {
      const from = stop(b)
      if (from) fly(b, from)
    }
  }, 1500)
}

onMounted(async () => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('animate' in Element.prototype)) return
  const count = innerWidth >= 760 ? 5 : 3
  flock.value = Array.from({ length: count }, (_, id) => ({
    id,
    size: Math.round(rand(18, 30)),
    hue: Math.round(rand(0, 360)),
    sat: Math.round(rand(55, 80)),
    flap: +rand(0.22, 0.34).toFixed(2),
  }))
  await nextTick()
  // Start anywhere on screen, a little apart in time so they don't all turn at once
  for (const b of flock.value) setTimeout(() => fly(b, [rand(0, 1) * innerWidth, rand(0.1, 0.9) * innerHeight]), b.id * 700)
  // Passive: only watching, so scrolling and taps work as normal
  addEventListener('touchstart', onTouch, { passive: true })
  addEventListener('touchmove', onTouch, { passive: true })
  addEventListener('touchend', release, { passive: true })
  addEventListener('touchcancel', release, { passive: true })
})
onBeforeUnmount(() => {
  stopped = true
  clearTimeout(resume)
  removeEventListener('touchstart', onTouch)
  removeEventListener('touchmove', onTouch)
  removeEventListener('touchend', release)
  removeEventListener('touchcancel', release)
  for (const a of flights.values()) a.cancel()
})
</script>

<template>
  <div class="butterflies" aria-hidden="true">
    <div
      v-for="b in flock"
      :key="b.id"
      :ref="el => el ? els.set(b.id, el as HTMLElement) : els.delete(b.id)"
      class="butterfly"
      :style="{ '--size': `${b.size}px`, '--h': b.hue, '--s': `${b.sat}%`, '--flap': `${b.flap}s` }"
    >
      <svg class="bob" viewBox="-20 -18 40 34">
        <!-- Each side is one wing pair; they fold toward the body to flap -->
        <g v-for="side in ['l', 'r']" :key="side" class="wing" :class="side">
          <g :transform="side === 'r' ? 'scale(-1 1)' : undefined">
            <path class="upper" d="M0 -2 C-5 -13 -18 -16 -18 -6 C-18 1 -9 3 0 0 Z" />
            <path class="lower" d="M0 1 C-7 2 -15 6 -12.5 12 C-9.5 16.5 -3 10.5 0 3 Z" />
            <circle cx="-11" cy="-7" r="2.2" class="spot" />
            <circle cx="-8" cy="8" r="1.4" class="spot" />
          </g>
        </g>
        <ellipse class="body" cx="0" cy="1" rx="1.3" ry="7" />
        <path class="feelers" d="M-0.6 -5.5 C-2 -10 -4 -12.5 -5.5 -13.5 M0.6 -5.5 C2 -10 4 -12.5 5.5 -13.5" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
/* Same layer as the petals: above the content, below the menu bar and the envelope */
.butterflies { position: fixed; inset: 0; z-index: calc(var(--z-nav) - 1); overflow: hidden; pointer-events: none; }
.butterfly {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--size);
  margin: calc(var(--size) / -2) 0 0 calc(var(--size) / -2);
  opacity: 0.85;
  will-change: transform;
}
.bob { display: block; width: 100%; height: auto; overflow: visible; animation: bob 1.6s ease-in-out infinite alternate; }

/* Pastel tint per butterfly, lighter at the wing tips */
.upper { fill: hsl(var(--h) var(--s) 74%); }
.lower { fill: hsl(calc(var(--h) + 18) var(--s) 80%); }
.upper, .lower { stroke: hsl(var(--h) calc(var(--s) - 20%) 42%); stroke-width: 0.6; stroke-opacity: 0.6; }
.spot { fill: #fff; opacity: 0.7; }
.body { fill: hsl(var(--h) 25% 22%); }
.feelers { fill: none; stroke: hsl(var(--h) 25% 22%); stroke-width: 0.6; stroke-linecap: round; }

/* Hinged on the body: with view-box, the origin is measured from the drawing's (0, 0), where the body is */
.wing { transform-box: view-box; transform-origin: 0 0; animation: flap var(--flap) ease-in-out infinite alternate; }

@keyframes flap { from { transform: scaleX(1); } to { transform: scaleX(0.25); } }
@keyframes bob { from { translate: 0 -3px; } to { translate: 0 3px; } }
</style>
