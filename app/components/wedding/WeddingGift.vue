<script setup lang="ts">
// Wedding gift: the couple's KHQR codes, which guests scan with any Cambodian banking app.
// Each bank is a row; tapping it opens its code and closes the others, and all close once the section
// is scrolled away, so the page stays short. A guest reading on their phone can't scan their own screen,
// so each code can also be saved to the photos; tapping a code shows it large, to scan from another phone.
const props = defineProps<{ data: PublicWedding }>()
const { t } = useI18n()
const w = computed(() => props.data.wedding)
const gifts = computed(() => w.value.gifts ?? [])

const openId = ref<string | null>(null)
const toggle = (id: string) => (openId.value = openId.value === id ? null : id)

const section = ref<HTMLElement>()
let observer: IntersectionObserver | undefined
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => { if (!entry!.isIntersecting) openId.value = null })
  observer.observe(section.value!)
})
onBeforeUnmount(() => observer?.disconnect())

// The code leans towards the pointer or finger, like a card held in the hand
function tilt(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  el.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -14}deg`)
  el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 14}deg`)
}
function untilt(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  el.style.removeProperty('--rx')
  el.style.removeProperty('--ry')
}

const dialog = ref<HTMLDialogElement>()
const zoomed = ref<GiftQr | null>(null)
const morph = useMorph()
const small = () => section.value?.querySelector<HTMLElement>('.bank-item.open .qr img')
const large = () => dialog.value?.querySelector('img')
function show(g: GiftQr) {
  morph(small, () => {
    zoomed.value = g
    dialog.value?.showModal()
  }, large, 300)
}
const hide = () => morph(large, () => dialog.value?.close(), small, 240)
// Bank logos (the banks' app icons, in public/banks/), matched from the bank name typed in Settings
const LOGOS: Array<[RegExp, string]> = [[/\baba\b/i, 'aba'], [/acleda/i, 'acleda'], [/canadia/i, 'canadia']]
const logoFor = (bank: string) => LOGOS.find(([re]) => re.test(bank))?.[1]
const fileName = (g: GiftQr) => `KHQR-${[g.bank, g.name].filter(Boolean).join(' ').replace(/[^\p{L}\p{N}]+/gu, '-') || 'gift'}.${g.image.split('.').pop()}`
</script>

<template>
  <section id="gift" ref="section" class="gift" aria-labelledby="gift-title">
    <div class="container narrow">
      <span v-reveal class="section-icon"><WeddingIcon name="gift" /></span>
      <h2 v-reveal id="gift-title" class="section-title">{{ t('gift.title') }}</h2>
      <WeddingOrnament v-reveal="100" :motif="w.theme.motif" />
      <i18n-t v-reveal="150" keypath="gift.intro" tag="p" class="intro" scope="global"><template #khqr><abbr class="caps">KHQR</abbr></template></i18n-t>

      <div class="banks">
        <div v-for="(g, i) in gifts" :key="g.id" v-reveal="150 + i * 30" class="bank-item" :class="{ open: openId === g.id }">
          <button
            :id="`gift-head-${g.id}`" type="button" class="head"
            :aria-expanded="openId === g.id" :aria-controls="`gift-panel-${g.id}`" @click="toggle(g.id)"
          >
            <img v-if="logoFor(g.bank)" :src="`/banks/${logoFor(g.bank)}.jpg`" alt="" class="logo" width="44" height="44">
            <span v-else class="logo logo-blank"><WeddingIcon name="gift" /></span>
            <span class="head-text">
              <span class="bank">{{ g.bank || t('gift.title') }}</span>
              <span class="name">{{ g.name }}</span>
            </span>
            <span class="head-action">{{ t(openId === g.id ? 'gift.hide' : 'gift.show') }}</span>
            <span class="chevron" aria-hidden="true" />
          </button>

          <!-- Opens smoothly; closed panels are inert so their buttons can't be reached -->
          <div :id="`gift-panel-${g.id}`" class="qr-panel" role="region" :aria-labelledby="`gift-head-${g.id}`" :inert="openId !== g.id">
            <div class="panel-inner">
              <button
                type="button" class="qr" :aria-label="t('gift.enlarge', { name: g.name })"
                @click="show(g)" @pointermove="tilt" @pointerleave="untilt" @pointercancel="untilt"
              >
                <img :src="g.image" :alt="t('gift.alt', { name: g.name })" decoding="async">
                <span class="corners" aria-hidden="true"><i /><i /><i /><i /></span>
                <span class="scan" aria-hidden="true" />
                <span class="shine" aria-hidden="true" />
              </button>
              <p class="tap">{{ t('gift.tapHint') }}</p>
              <a :href="g.image" :download="fileName(g)" class="btn btn-primary btn-sm save"><WeddingIcon name="download" /> {{ t('gift.save') }}</a>
            </div>
          </div>
        </div>
      </div>
      <p v-reveal="300" class="hint">{{ t('gift.hint') }}</p>
    </div>

    <dialog ref="dialog" class="zoom" @cancel.prevent="hide" @click.self="hide" @close="zoomed = null">
      <template v-if="zoomed">
        <img :src="zoomed.image" :alt="t('gift.alt', { name: zoomed.name })">
        <p class="zoom-name"><template v-if="zoomed.bank">{{ zoomed.bank }} · </template>{{ zoomed.name }}</p>
        <button type="button" class="btn btn-ghost" @click="hide">{{ t('gift.close') }}</button>
      </template>
    </dialog>
  </section>
</template>

<style scoped>
.gift { padding-block: var(--space-8); }
.narrow { max-width: 32rem; }
.section-title { text-align: center; font-size: clamp(1.9rem, 6vw, 2.6rem); margin-bottom: var(--space-3); }
.intro { margin-top: var(--space-5); text-align: center; text-wrap: pretty; }

.banks { display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-6); }
.bank-item {
  background: var(--c-surface); border: 1px solid var(--c-line); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm); overflow: hidden;
  transition: box-shadow 0.25s, border-color 0.25s, transform 0.25s var(--ease-out);
}
.bank-item.open { border-color: color-mix(in oklab, var(--c-accent) 60%, var(--c-line)); box-shadow: var(--shadow); }

/* The row: logo, bank and name, and a chevron that turns when open */
.head {
  display: flex; align-items: center; gap: var(--space-3); width: 100%;
  padding: var(--space-3) var(--space-4); text-align: left; cursor: pointer;
  background: none; border: 0; color: inherit;
}
.head:focus-visible { outline: 2px solid var(--c-accent); outline-offset: -4px; border-radius: var(--radius-lg); }
@media (hover: hover) { .bank-item:not(.open):hover { transform: translateY(-2px); box-shadow: var(--shadow); } }
.head:active .logo { transform: scale(0.97); }
/* Scaled a touch inside a rounded square, so icons that come with their own corners all end up alike */
.logo {
  flex: none; width: 2.75rem; height: 2.75rem; border-radius: 24%; object-fit: cover;
  clip-path: inset(3% round 24%); box-shadow: 0 1px 3px rgb(0 0 0 / 0.15);
  transition: transform 0.3s var(--ease-out);
}
.logo-blank { display: grid; place-items: center; font-size: 1.3rem; color: var(--c-secondary); background: color-mix(in oklab, var(--c-secondary) 10%, transparent); }
.open .logo { animation: wiggle 0.5s var(--ease-out); }
@keyframes wiggle { 30% { transform: rotate(-8deg) scale(1.08); } 60% { transform: rotate(5deg); } }
.head-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.bank { font-family: var(--font-serif); font-size: 1.2rem; line-height: 1.25; color: var(--c-secondary); }
.name { font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--c-muted); }
.head-action { font-size: 0.8rem; color: var(--c-accent-ink); white-space: nowrap; }
.chevron {
  flex: none; width: 0.6rem; height: 0.6rem; margin: 0 0.2rem 0.2rem;
  border-right: 2px solid var(--c-accent-ink); border-bottom: 2px solid var(--c-accent-ink);
  transform: rotate(45deg); transition: transform 0.3s var(--ease-in-out);
}
.open .chevron { transform: translateY(0.2rem) rotate(225deg); }

/* The panel slides open; the code inside rises and settles */
.qr-panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.24s var(--ease-out); }
.open .qr-panel { grid-template-rows: 1fr; transition-duration: 0.3s; }
.panel-inner {
  overflow: hidden; min-height: 0;
  display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
  padding: 0 var(--space-4);
  transition: padding 0.24s var(--ease-out);
}
.open .panel-inner { transition-duration: 0.3s; padding: var(--space-2) var(--space-4) var(--space-5); }
.panel-inner > * { opacity: 0; transform: translateY(14px) scale(0.94); transition: opacity 0.2s, transform 0.3s var(--ease-out); }
.open .panel-inner > * { opacity: 1; transform: none; }
.open .panel-inner > :nth-child(2) { transition-delay: 0.03s; }
.open .panel-inner > :nth-child(3) { transition-delay: 0.06s; }

/* The code sits on white so every banking app can read it, whatever the theme. It tilts towards the pointer. */
.qr {
  position: relative; display: block; width: min(100%, 17rem); padding: 0; cursor: zoom-in;
  background: #fff; border: 0; border-radius: var(--radius); overflow: hidden;
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.08), 0 16px 32px -18px rgb(0 0 0 / 0.35);
  transform: perspective(700px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition: transform 0.25s var(--ease-out), box-shadow 0.3s;
  touch-action: manipulation;
}
.qr:active { scale: 0.97; }
.qr img { display: block; width: 100%; aspect-ratio: 1; object-fit: contain; }
.qr:focus-visible { outline: 2px solid var(--c-accent); outline-offset: 3px; }
/* Gold viewfinder corners that close in on the code as it opens */
.corners i { position: absolute; width: 18%; height: 18%; border: 3px solid var(--c-gold); transition: inset 0.6s 0.15s var(--ease-out), opacity 0.4s 0.15s; opacity: 0; }
.corners i:nth-child(1) { inset: -6% auto auto -6%; border-width: 3px 0 0 3px; border-radius: 10px 0 0 0; }
.corners i:nth-child(2) { inset: -6% -6% auto auto; border-width: 3px 3px 0 0; border-radius: 0 10px 0 0; }
.corners i:nth-child(3) { inset: auto auto -6% -6%; border-width: 0 0 3px 3px; border-radius: 0 0 0 10px; }
.corners i:nth-child(4) { inset: auto -6% -6% auto; border-width: 0 3px 3px 0; border-radius: 0 0 10px 0; }
.open .corners i { opacity: 1; }
.open .corners i:nth-child(1) { inset: 3% auto auto 3%; }
.open .corners i:nth-child(2) { inset: 3% 3% auto auto; }
.open .corners i:nth-child(3) { inset: auto auto 3% 3%; }
.open .corners i:nth-child(4) { inset: auto 3% 3% auto; }
/* A scan line passes down the code once when it opens; a gold gleam crosses it on hover */
.scan, .shine { position: absolute; pointer-events: none; opacity: 0; }
.scan { left: 6%; right: 6%; top: 0; height: 3px; border-radius: 3px; background: var(--c-gold); box-shadow: 0 0 12px 3px color-mix(in oklab, var(--c-gold) 60%, transparent); }
.shine { inset: 0; opacity: 1; background: linear-gradient(105deg, transparent 35%, rgb(243 226 166 / 0.5) 50%, transparent 65%); transform: translateX(-110%); }
@media (prefers-reduced-motion: no-preference) {
  .open .scan { animation: scan 1.4s 0.35s ease-in-out; }
  @media (hover: hover) { .qr:hover .shine { animation: sweep 1s var(--ease-out); } }
}
@keyframes scan { 0% { top: 4%; opacity: 0; } 15%, 85% { opacity: 1; } 100% { top: 96%; opacity: 0; } }
@keyframes sweep { to { transform: translateX(110%); } }
.tap { font-size: 0.8rem; color: var(--c-muted); }
.save { min-width: 12rem; }
.hint { margin-top: var(--space-5); text-align: center; font-size: 0.9rem; color: var(--c-muted); text-wrap: pretty; }

/* Large view, to scan from another phone */
.zoom {
  width: min(26rem, calc(100vw - 2rem)); padding: var(--space-5); border: 0; border-radius: var(--radius-lg);
  background: var(--c-surface); color: var(--c-text); text-align: center; box-shadow: var(--shadow);
}
.zoom::backdrop { background: rgb(20 12 24 / 0.6); backdrop-filter: blur(4px); }
.zoom img { display: block; width: 100%; height: auto; border-radius: var(--radius); background: #fff; }
.zoom-name { margin-block: var(--space-3); font-family: var(--font-serif); font-size: 1.2rem; color: var(--c-secondary); }
@media (prefers-reduced-motion: no-preference) {
  .zoom[open] { animation: zoom-in 0.25s var(--ease-out); }
  .zoom[open]::backdrop { animation: fade 0.25s; }
}
@keyframes zoom-in { from { opacity: 0; transform: scale(0.95); } }
@keyframes fade { from { opacity: 0; } }
</style>
