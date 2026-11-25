<script setup lang="ts">
// RSVP on a static site: guests reply through the couple's form (e.g. a Google Form) until the deadline
const props = defineProps<{ data: PublicWedding, guestName?: string }>()
const { t } = useI18n()
const locale = useLocaleCode()
const w = computed(() => props.data.wedding)

// A burst of petals and gold from the reply button. The form opens in another tab, so the burst plays
// when the guest comes back to the invitation; with motion reduced, nothing plays.
const button = ref<HTMLElement>()
let replied = false
function burst() {
  const el = button.value
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const box = el.getBoundingClientRect()
  // Inside the page wrapper, so the pieces take the wedding's theme colours
  const host = el.closest('.wedding') ?? document.body
  for (let i = 0; i < 28; i++) {
    const petal = i % 3 !== 0
    const bit = document.createElement('span')
    bit.className = `burst ${petal ? 'burst-petal' : 'burst-gold'}`
    bit.style.left = `${box.left + box.width / 2}px`
    bit.style.top = `${box.top + box.height / 2}px`
    host.append(bit)
    const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.3
    const dist = 80 + Math.random() * 110
    const [x, y] = [Math.cos(angle) * dist, Math.sin(angle) * dist - 40]
    const spin = (Math.random() - 0.5) * 540
    bit.animate([
      { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 1 },
      { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${spin / 2}deg) scale(1)`, opacity: 1, offset: 0.45 },
      // then the petals drift down as they fade
      { transform: `translate(calc(-50% + ${x * 1.15}px), calc(-50% + ${y + 90}px)) rotate(${spin}deg) scale(0.9)`, opacity: 0 },
    ], { duration: 1800 + Math.random() * 600, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }).onfinish = () => bit.remove()
  }
}
function onReply() {
  replied = true
}
function onVisible() {
  if (replied && document.visibilityState === 'visible') {
    replied = false
    // Let the page settle back on screen first
    setTimeout(burst, 300)
  }
}

// The built-in form, used when no outside form is set: each reply is sent to the couple on Telegram
const choices = [
  { key: 'yes', value: true, icon: 'heart' },
  { key: 'no', value: false, icon: 'envelope' },
] as const
const form = reactive({ name: props.guestName ?? '', phone: '', attending: null as boolean | null, guests: 1, message: '', website: '' })
// A personal link's name is read after the page loads; it never replaces what the guest typed
watch(() => props.guestName, (name) => { if (name && !form.name) form.name = name })
const hasName = computed(() => form.name.trim().length > 0)
const sending = ref(false)
const failed = ref(false)
const sent = ref<'' | 'yes' | 'no'>('')
async function submit() {
  sending.value = true
  failed.value = false
  try {
    await $fetch('/api/rsvp', { method: 'POST', body: { ...form, url: location.href, slug: w.value.slug } })
    burst()
    sent.value = form.attending ? 'yes' : 'no'
  } catch {
    failed.value = true
  } finally {
    sending.value = false
  }
}
onMounted(() => document.addEventListener('visibilitychange', onVisible))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))
</script>

<template>
  <section id="rsvp" class="rsvp" aria-labelledby="rsvp-title">
    <div class="container narrow">
      <span v-reveal class="section-icon"><WeddingIcon name="envelope" /></span>
      <h2 v-reveal id="rsvp-title" class="section-title">{{ t('rsvp.title') }}</h2>
      <WeddingOrnament v-reveal="100" :motif="w.theme.motif" />

      <div v-reveal="150" class="panel">
        <p v-if="guestName" class="greeting">{{ t('rsvp.greeting', { name: guestName }) }}</p>
        <template v-if="data.deadlinePassed">
          <p class="center">{{ t('rsvp.closed', { date: data.display[locale].deadline }) }}</p>
        </template>
        <template v-else>
          <p class="center">{{ t('rsvp.intro') }}</p>
          <p class="center deadline">{{ t('rsvp.deadline', { date: data.display[locale].deadline }) }}</p>
          <p v-if="w.rsvp.formUrl" class="center">
            <a ref="button" :href="w.rsvp.formUrl" target="_blank" rel="noopener" class="btn btn-primary" @click="onReply">{{ t('rsvp.reply') }} <WeddingIcon name="out" /></a>
          </p>
          <div v-else-if="sent" class="thanks" role="status">
            <!-- A ring draws itself round, then the icon pops in -->
            <span class="thanks-mark">
              <svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" /></svg>
              <WeddingIcon :name="sent === 'yes' ? 'heart' : 'envelope'" />
            </span>
            <p class="thanks-title">{{ t(sent === 'yes' ? 'rsvp.thanksYes' : 'rsvp.thanksNo') }}</p>
            <!-- What they sent, so they can see it went through as meant -->
            <dl class="summary">
              <div v-if="form.name.trim()"><dt>{{ t('rsvp.name') }}</dt><dd>{{ form.name }}</dd></div>
              <div><dt>{{ t('rsvp.attending') }}</dt><dd>{{ t(`rsvp.${sent}`) }}</dd></div>
              <div v-if="sent === 'yes'"><dt>{{ t('rsvp.people') }}</dt><dd class="tabular">{{ form.guests }}</dd></div>
            </dl>
            <!-- The form keeps their answers; sending again gives the couple the newer reply -->
            <button type="button" class="change" @click="sent = ''">{{ t('rsvp.change') }}</button>
          </div>
          <form v-else class="form" @submit.prevent="submit">
            <fieldset class="field">
              <legend class="question">{{ t('rsvp.attending') }}</legend>
              <div class="choices">
                <label v-for="c in choices" :key="c.key" class="choice" :class="{ on: form.attending === c.value }">
                  <input v-model="form.attending" type="radio" name="attending" :value="c.value" required class="visually-hidden">
                  <span class="choice-icon"><WeddingIcon :name="c.icon" /></span>
                  <span class="choice-label">{{ t(`rsvp.${c.key}`) }}</span>
                  <span class="choice-check"><WeddingIcon name="check" /></span>
                </label>
              </div>
            </fieldset>

            <div class="field">
              <label for="rsvp-name">{{ t('rsvp.name') }}</label>
              <input id="rsvp-name" v-model="form.name" required maxlength="120" autocomplete="name" enterkeyhint="next">
            </div>

            <!-- Optional phone, offered once the guest has written their name -->
            <div class="expand" :class="{ open: hasName }" :inert="!hasName">
              <div class="field">
                <label for="rsvp-phone">{{ t('rsvp.phone') }} <span class="optional">{{ t('rsvp.optional') }}</span></label>
                <div class="with-icon">
                  <WeddingIcon name="phone" class="field-icon" />
                  <input id="rsvp-phone" v-model="form.phone" type="tel" maxlength="40" autocomplete="tel" inputmode="tel" enterkeyhint="next" placeholder="012 345 678" class="tabular">
                </div>
              </div>
            </div>

            <!-- Opens smoothly once the guest says they're coming -->
            <div class="expand" :class="{ open: form.attending }" :inert="!form.attending">
              <fieldset class="field">
                <legend class="label">{{ t('rsvp.guests') }}</legend>
                <p class="hint">{{ t('rsvp.guestsHint', { n: MAX_GUESTS }) }}</p>
                <!-- A tile per number of people, each with that many little figures -->
                <div class="party">
                  <label v-for="n in MAX_GUESTS" :key="n" class="seat" :class="{ on: form.guests === n }">
                    <input v-model="form.guests" type="radio" name="guests" :value="n" class="visually-hidden">
                    <span class="people" aria-hidden="true">
                      <svg v-for="p in n" :key="p" viewBox="0 0 12 16" width="12" height="16"><circle cx="6" cy="4" r="3" /><path d="M0.5 16c0-3.6 2.4-6 5.5-6s5.5 2.4 5.5 6z" /></svg>
                    </span>
                    <span class="seat-n tabular">{{ n }}</span>
                    <span class="seat-label">{{ n === 1 ? t('rsvp.justMe') : t('rsvp.peopleN', { n }) }}</span>
                  </label>
                </div>
              </fieldset>
            </div>

            <div class="field">
              <label for="rsvp-message">{{ t('rsvp.message') }}</label>
              <textarea id="rsvp-message" v-model="form.message" rows="3" maxlength="1000" :placeholder="t('rsvp.messageHint')" />
            </div>
            <!-- Hidden from people; spam bots fill it in -->
            <input v-model="form.website" class="trap" tabindex="-1" autocomplete="off" aria-hidden="true">
            <p v-if="failed" class="center error" role="alert">{{ t('rsvp.failed') }}</p>
            <p class="center">
              <button ref="button" type="submit" class="btn btn-primary send" :disabled="sending">
                <template v-if="sending">{{ t('rsvp.sending') }}<span class="dots" aria-hidden="true"><i /><i /><i /></span></template>
                <template v-else>{{ t('rsvp.send') }}</template>
              </button>
            </p>
          </form>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rsvp { padding-block: var(--space-8); }
.narrow { max-width: 36rem; }
@media (min-width: 760px) { .narrow { max-width: 40rem; } .panel { padding: var(--space-7) var(--space-6); } }
.section-title { text-align: center; font-size: clamp(1.9rem, 6vw, 2.6rem); margin-bottom: var(--space-3); }
.panel {
  display: flex; flex-direction: column; gap: var(--space-4);
  margin-top: var(--space-6);
  padding: var(--space-6) var(--space-5);
  background: var(--c-surface);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.center { text-align: center; }
.muted { color: var(--c-muted); }
.deadline { color: var(--c-muted); }
.greeting { text-align: center; font-family: var(--font-serif); font-size: 1.5rem; color: var(--c-secondary); }
.form { display: flex; flex-direction: column; gap: var(--space-5); }
.field { display: flex; flex-direction: column; gap: var(--space-2); border: 0; padding: 0; margin: 0; min-width: 0; }
.field label, .label { font-weight: 600; }
.field input:not([type="radio"]), .field textarea {
  width: 100%; padding: 0.75rem 0.9rem;
  background: var(--c-bg); border: 1px solid var(--c-line); border-radius: var(--radius);
  /* 16px or more, so iPhone doesn't zoom in on focus */
  font-size: max(1rem, 16px);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.field input:focus-visible, .field textarea:focus-visible {
  outline: none; border-color: var(--c-accent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--c-accent) 22%, transparent);
}
.field textarea { resize: vertical; }
.question { padding: 0; margin-bottom: var(--space-3); width: 100%; text-align: center; font-family: var(--font-serif); font-size: 1.35rem; color: var(--c-secondary); }

/* Yes / no as two cards side by side */
.choices { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.choice {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-2);
  padding: var(--space-5) var(--space-3);
  text-align: center; line-height: 1.3; cursor: pointer;
  background: var(--c-bg); border: 1.5px solid var(--c-line); border-radius: var(--radius-lg);
  isolation: isolate; overflow: hidden;
  transition: border-color 0.25s, transform 0.25s var(--ease-out), box-shadow 0.25s;
}
/* The colour spreads out from the icon */
.choice::before { content: ''; position: absolute; inset: 0; z-index: -1; background: color-mix(in oklab, var(--c-secondary) 8%, var(--c-bg)); clip-path: circle(0 at 50% 35%); transition: clip-path 0.3s var(--ease-out); }
.choice.on::before { clip-path: circle(120% at 50% 35%); }
@media (hover: hover) { .choice:hover { border-color: var(--c-accent); transform: translateY(-2px); box-shadow: var(--shadow); } }
.choice:active { transform: scale(0.97); }
.choice:focus-within { border-color: var(--c-accent); box-shadow: 0 0 0 3px color-mix(in oklab, var(--c-accent) 22%, transparent); }
.choice-icon {
  display: grid; place-items: center; width: 3rem; height: 3rem; border-radius: 50%;
  font-size: 1.5rem; color: var(--c-secondary);
  background: color-mix(in oklab, var(--c-secondary) 8%, transparent);
  transition: background-color 0.25s, color 0.25s;
}
.choice-label { font-weight: 600; }
.choice-check {
  position: absolute; top: var(--space-2); right: var(--space-2);
  display: grid; place-items: center; width: 1.4rem; height: 1.4rem; border-radius: 50%;
  font-size: 0.75rem; color: var(--c-on-secondary); background: var(--c-secondary);
  opacity: 0; transform: scale(0.4); transition: opacity 0.2s, transform 0.3s var(--ease-out);
}
.choice.on { border-color: var(--c-secondary); box-shadow: var(--shadow); }
.choice.on .choice-icon { background: var(--c-secondary); color: var(--c-on-secondary); animation: pop 0.3s var(--ease-out); }
.choice-check .icon { stroke-width: 2.5; }
.choice.on .choice-check { opacity: 1; transform: scale(1); }
@keyframes pop { 0% { transform: scale(1); } 40% { transform: scale(1.25) rotate(-8deg); } 100% { transform: scale(1); } }

/* Guest count opens below once "yes" is picked */
.expand { display: grid; grid-template-rows: 0fr; opacity: 0; margin-top: calc(var(--space-5) * -1); transition: grid-template-rows 0.24s var(--ease-out), opacity 0.2s, margin-top 0.24s var(--ease-out); }
.expand > * { overflow: hidden; }
.expand.open { grid-template-rows: 1fr; opacity: 1; margin-top: 0; transition-duration: 0.3s; }
/* The field inside also slides down into place as it opens */
.expand .field { transform: translateY(-10px); transition: transform 0.3s var(--ease-out); }
.expand.open .field { transform: none; }
.optional { font-weight: 400; color: var(--c-muted); }
.with-icon { position: relative; }
.with-icon .field-icon { position: absolute; left: 0.9rem; top: 50%; translate: 0 -50%; color: var(--c-muted); pointer-events: none; transition: color 0.2s; }
/* .field in front: outranks the plain `.field input` padding above, which would put the text under the icon */
.field .with-icon input { padding-left: 2.75rem; }
.with-icon:focus-within .field-icon { color: var(--c-accent); }
/* Room for the focus ring, which the opening animation's overflow would otherwise cut off */
.expand > * { padding: 3px; margin: -3px; }
.hint { margin-top: calc(var(--space-1) * -1); font-size: 0.9rem; color: var(--c-muted); }
.party { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-2); }
.seat {
  display: flex; flex-direction: column; align-items: center; gap: 2px; padding: var(--space-3) var(--space-1);
  border: 1.5px solid var(--c-line); border-radius: var(--radius); background: var(--c-bg); cursor: pointer; text-align: center;
  transition: border-color 0.2s, background-color 0.2s, transform 0.2s var(--ease-out), box-shadow 0.2s;
}
@media (hover: hover) { .seat:hover { border-color: var(--c-accent); } }
.seat:active { transform: scale(0.97); }
.seat:has(input:focus-visible) { outline: 2px solid var(--c-accent); outline-offset: 2px; }
.seat.on { border-color: var(--c-secondary); background: color-mix(in oklab, var(--c-secondary) 8%, var(--c-bg)); box-shadow: 0 0 0 3px color-mix(in oklab, var(--c-secondary) 14%, transparent); }
.people { display: flex; justify-content: center; gap: 1px; height: 16px; color: var(--c-line); transition: color 0.2s; }
.people svg { fill: currentColor; }
.seat.on .people { color: var(--c-accent); }
.seat.on .people svg { animation: hop 0.35s var(--ease-out) backwards; }
.seat.on .people svg:nth-child(2) { animation-delay: 0.03s; }
.seat.on .people svg:nth-child(3) { animation-delay: 0.06s; }
.seat.on .people svg:nth-child(4) { animation-delay: 0.09s; }
@keyframes hop { 40% { transform: translateY(-4px); } }
.seat-n { font-family: var(--font-serif); font-size: 1.7rem; line-height: 1.2; color: var(--c-text); }
.seat.on .seat-n { color: var(--c-secondary); }
.seat-label { font-size: 0.78rem; line-height: 1.25; color: var(--c-muted); }

.send { min-width: 11rem; }
.dots { display: inline-flex; gap: 3px; margin-left: 4px; }
.dots i { width: 4px; height: 4px; border-radius: 50%; background: currentColor; animation: dot 1s infinite; }
.dots i:nth-child(2) { animation-delay: 0.15s; }
.dots i:nth-child(3) { animation-delay: 0.3s; }
@keyframes dot { 0%, 100% { opacity: 0.25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }

.trap { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
.error { color: var(--c-danger); animation: shake 0.4s; }
@keyframes shake { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }

/* Thank-you: a ring draws round, the icon pops in, then the words rise */
.thanks { display: flex; flex-direction: column; align-items: center; gap: var(--space-4); padding-block: var(--space-3); text-align: center; }
.thanks-mark {
  position: relative; display: grid; place-items: center; width: 5.5rem; height: 5.5rem; border-radius: 50%;
  font-size: 2.2rem; color: var(--c-secondary); background: color-mix(in oklab, var(--c-accent) 14%, var(--c-surface));
}
/* .ring, not svg: the icon is an svg too and must stay upright */
.thanks-mark .ring { position: absolute; inset: -6px; width: calc(100% + 12px); height: calc(100% + 12px); transform: rotate(-90deg); }
.thanks-mark circle { fill: none; stroke: var(--c-accent); stroke-width: 2.5; stroke-linecap: round; stroke-dasharray: 183; stroke-dashoffset: 183; animation: draw 0.9s var(--ease-out) forwards; }
.thanks-mark > :not(.ring) { animation: pop-in 0.5s 0.6s var(--ease-out) backwards; }
.thanks-title { font-family: var(--font-serif); font-size: 1.45rem; line-height: 1.35; color: var(--c-secondary); max-width: 24rem; text-wrap: balance; animation: rise 0.6s 0.8s var(--ease-out) backwards; }
.summary {
  width: 100%; max-width: 22rem; margin: 0; padding: var(--space-2) var(--space-4);
  border-radius: var(--radius); background: var(--c-bg); border: 1px solid var(--c-line-soft); text-align: left;
  animation: rise 0.6s 1s var(--ease-out) backwards;
}
.summary div { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-4); padding-block: var(--space-2); }
.summary div + div { border-top: 1px solid var(--c-line-soft); }
.summary dt { color: var(--c-muted); font-size: 0.9rem; }
.summary dd { margin: 0; font-weight: 600; text-align: right; overflow-wrap: anywhere; }
.change {
  min-height: 44px; padding: 0 var(--space-3); border: 0; background: none; font: inherit; cursor: pointer;
  color: var(--c-secondary); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in oklab, currentColor 40%, transparent);
  animation: rise 0.6s 1.1s var(--ease-out) backwards;
}
@media (hover: hover) { .change:hover { text-decoration-color: currentColor; } }
@media (prefers-reduced-motion: reduce) { .thanks *, .thanks-mark circle { animation: none; } .thanks-mark circle { stroke-dashoffset: 0; } }
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes pop-in { from { transform: scale(0); opacity: 0; } 70% { transform: scale(1.2); } }
@keyframes rise { from { transform: translateY(12px); opacity: 0; } }
</style>

<style>
/* Burst pieces are added outside this component's markup, so these rules are not scoped */
.burst { position: fixed; z-index: var(--z-overlay); pointer-events: none; }
.burst-petal { width: 11px; height: 15px; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; background: color-mix(in oklab, var(--c-accent) 70%, #fff); }
.burst-gold { width: 6px; height: 6px; border-radius: 50%; background: radial-gradient(circle at 35% 30% var(--oklch), #f3e2a6, #c9a24a 60%, #8a6a22); }
</style>
