<script setup lang="ts">
// Edit everything about the wedding here.
const wedding = {
  bride: 'Bride Name',
  groom: 'Ousa',
  // ISO date with timezone offset so the countdown is correct for every guest
  date: '2027-02-14T16:00:00+07:00',
  dateLabel: 'Sunday, February 14, 2027',
  message:
    'Together with our families, we joyfully invite you to celebrate our wedding day and share in our happiness as we begin our life together.',
  events: [
    { title: 'Ceremony', time: '4:00 PM', place: 'Venue Name', address: 'Street, City' },
    { title: 'Reception', time: '6:30 PM', place: 'Venue Name', address: 'Street, City' },
  ],
  mapUrl: 'https://maps.google.com/?q=Phnom+Penh',
  rsvpBy: 'January 15, 2027',
  // Google Apps Script web app URL (ends in /exec) — see README for setup
  rsvpEndpoint: '',
}

useHead({ title: `${wedding.groom} & ${wedding.bride} — Wedding Invitation` })

const now = ref<number | null>(null)
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  now.value = Date.now()
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => clearInterval(timer))

const countdown = computed(() => {
  if (now.value === null) return null
  const diff = Math.max(0, new Date(wedding.date).getTime() - now.value)
  return [
    { label: 'Days', value: Math.floor(diff / 86_400_000) },
    { label: 'Hours', value: Math.floor(diff / 3_600_000) % 24 },
    { label: 'Minutes', value: Math.floor(diff / 60_000) % 60 },
    { label: 'Seconds', value: Math.floor(diff / 1000) % 60 },
  ]
})

const rsvp = reactive({ name: '', guests: 1, attending: 'yes', note: '' })
const submitted = ref(false)
const sending = ref(false)
const error = ref('')

async function submitRsvp() {
  if (!wedding.rsvpEndpoint) {
    error.value = 'RSVPs are not open yet. Please check back soon.'
    return
  }
  sending.value = true
  error.value = ''
  try {
    // No custom headers: a text/plain body avoids a CORS preflight, which Apps Script can't answer
    const res = await fetch(wedding.rsvpEndpoint, {
      method: 'POST',
      body: JSON.stringify(rsvp),
    })
    const result = await res.json()
    if (!result.ok) throw new Error(result.error)
    submitted.value = true
  } catch {
    error.value = 'Sorry, something went wrong sending your RSVP. Please try again.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <main>
    <section class="hero">
      <p class="eyebrow">We're getting married</p>
      <h1 class="names">
        {{ wedding.groom }}
        <span class="amp">&amp;</span>
        {{ wedding.bride }}
      </h1>
      <p class="date">{{ wedding.dateLabel }}</p>

      <ClientOnly>
        <div v-if="countdown" class="countdown">
          <div v-for="unit in countdown" :key="unit.label" class="unit">
            <span class="num">{{ unit.value }}</span>
            <span class="lbl">{{ unit.label }}</span>
          </div>
        </div>
      </ClientOnly>

      <a href="#details" class="scroll">View details ↓</a>
    </section>

    <section class="invite">
      <div class="divider">❦</div>
      <p class="message">{{ wedding.message }}</p>
    </section>

    <section id="details" class="details">
      <h2>When &amp; Where</h2>
      <div class="cards">
        <article v-for="event in wedding.events" :key="event.title" class="card">
          <h3>{{ event.title }}</h3>
          <p class="time">{{ event.time }}</p>
          <p class="place">{{ event.place }}</p>
          <p class="address">{{ event.address }}</p>
        </article>
      </div>
      <a :href="wedding.mapUrl" target="_blank" rel="noopener" class="button outline">
        Open in Maps
      </a>
    </section>

    <section class="rsvp">
      <h2>RSVP</h2>
      <p class="sub">Kindly reply by {{ wedding.rsvpBy }}</p>

      <p v-if="submitted" class="thanks">
        Thank you, {{ rsvp.name }}! We've received your reply.
      </p>

      <form v-else @submit.prevent="submitRsvp">
        <label>
          Full name
          <input v-model.trim="rsvp.name" type="text" required>
        </label>
        <fieldset>
          <legend>Will you attend?</legend>
          <label class="radio"><input v-model="rsvp.attending" type="radio" value="yes"> Joyfully accept</label>
          <label class="radio"><input v-model="rsvp.attending" type="radio" value="no"> Regretfully decline</label>
        </fieldset>
        <label v-if="rsvp.attending === 'yes'">
          Number of guests
          <input v-model.number="rsvp.guests" type="number" min="1" max="10">
        </label>
        <label>
          Message for the couple (optional)
          <textarea v-model="rsvp.note" rows="3" />
        </label>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button type="submit" class="button" :disabled="sending">
          {{ sending ? 'Sending…' : 'Send RSVP' }}
        </button>
      </form>
    </section>

    <footer>
      <p class="names small">{{ wedding.groom }} &amp; {{ wedding.bride }}</p>
      <p>{{ wedding.dateLabel }}</p>
    </footer>
  </main>
</template>

<style>
:root {
  --bg: #fbf8f3;
  --surface: #ffffff;
  --text: #3d3530;
  --muted: #8a7f76;
  --accent: #b08d57;
  --line: #e8dfd2;
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: 'Jost', system-ui, sans-serif;
  font-weight: 300;
  line-height: 1.7;
}

section {
  padding: 5rem 1.25rem;
  text-align: center;
}

h2 {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 400;
  font-size: 2.5rem;
  margin: 0 0 1rem;
}

/* Hero */
.hero {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 50% 30%, rgba(176, 141, 87, 0.12), transparent 60%),
    var(--bg);
  border-bottom: 1px solid var(--line);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.3em;
  font-size: 0.8rem;
  color: var(--muted);
  margin: 0;
}

.names {
  font-family: 'Great Vibes', cursive;
  font-weight: 400;
  font-size: clamp(3.5rem, 12vw, 7rem);
  line-height: 1.1;
  margin: 1rem 0;
  color: var(--text);
}

.names .amp {
  display: block;
  font-size: 0.6em;
  color: var(--accent);
}

.names.small { font-size: 2.5rem; margin: 0; }

.date {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.4rem;
  letter-spacing: 0.05em;
  margin: 0;
}

.countdown {
  display: flex;
  gap: 1rem;
  margin-top: 2.5rem;
}

.unit {
  display: flex;
  flex-direction: column;
  min-width: 4.5rem;
  padding: 0.75rem 0.5rem;
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: 6px;
}

.num {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2rem;
  line-height: 1;
  color: var(--accent);
}

.lbl {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--muted);
  margin-top: 0.35rem;
}

.scroll {
  margin-top: 3rem;
  color: var(--muted);
  text-decoration: none;
  font-size: 0.9rem;
  letter-spacing: 0.1em;
}

/* Invite message */
.divider {
  color: var(--accent);
  font-size: 2rem;
}

.message {
  max-width: 36rem;
  margin: 1rem auto 0;
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1.5rem;
}

/* Details */
.details { background: var(--surface); border-block: 1px solid var(--line); }

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1.5rem;
  max-width: 44rem;
  margin: 2rem auto;
}

.card {
  padding: 2rem 1.5rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
}

.card h3 {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600;
  font-size: 1.6rem;
  margin: 0;
}

.card p { margin: 0.25rem 0; }
.time { color: var(--accent); font-weight: 500; }
.address { color: var(--muted); font-size: 0.9rem; }

/* Buttons */
.button {
  display: inline-block;
  padding: 0.8rem 2rem;
  border: 1px solid var(--accent);
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font: inherit;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 0.85rem;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.button:hover { opacity: 0.85; }
.button:disabled { opacity: 0.6; cursor: wait; }
.button.outline { background: transparent; color: var(--accent); }

/* RSVP */
.sub { color: var(--muted); margin: 0 0 2rem; }

form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 28rem;
  margin: 0 auto;
  text-align: left;
}

label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem; }

input[type='text'],
input[type='number'],
textarea {
  font: inherit;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
}

input:focus,
textarea:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

legend { font-size: 0.9rem; margin-bottom: 0.4rem; }

.radio { flex-direction: row; align-items: center; gap: 0.5rem; }
.radio input { accent-color: var(--accent); }

form .button { align-self: center; margin-top: 0.5rem; }

.error {
  margin: 0;
  color: #a94442;
  text-align: center;
  font-size: 0.9rem;
}

.thanks {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.5rem;
  color: var(--accent);
}

footer {
  padding: 3rem 1.25rem;
  text-align: center;
  color: var(--muted);
  border-top: 1px solid var(--line);
}

footer p { margin: 0; }

@media (max-width: 480px) {
  .countdown { gap: 0.5rem; }
  .unit { min-width: 3.75rem; }
  .num { font-size: 1.6rem; }
}
</style>
