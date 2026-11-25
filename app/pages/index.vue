<script setup lang="ts">
// The site's home page: the business behind the invitations. Each couple's invitation lives at its own
// address (/<couple>); this page only introduces the service and how to get in touch.
const { t, locale } = useI18n()
const { data: site } = await useFetch<SiteInfo>('/api/public/site', { key: 'site' })
const loc = computed(() => locale.value as Locale)
const name = computed(() => site.value?.name || 'Theab Online')
const tagline = computed(() => site.value?.tagline[loc.value] || t('home.tagline'))
const about = computed(() => site.value?.about[loc.value] || t('home.about'))

const features = [
  { key: 'envelope', icon: 'envelope' },
  { key: 'languages', icon: 'lotus' },
  { key: 'schedule', icon: 'calendar' },
  { key: 'gallery', icon: 'camera' },
  { key: 'replies', icon: 'heart' },
  { key: 'gift', icon: 'gift' },
] as const
// Each style has a real sample invitation (/demo-<style>, sample content) shown live in the phone, so
// visitors can tap through it, switch language and see the envelope addressed to a name they type
// bar/ink: the phone's status bar takes the colour of the invitation's top bar in that style
const styles = [
  { key: 'classic', dot: '#5B2A86', bar: '#F5F0F6', ink: '#2A1F33' },
  { key: 'floral', dot: '#9F86C9', bar: '#F7F5F2', ink: '#3A3242' },
  { key: 'ruby', dot: '#8B0F1A', bar: '#8B0F1A', ink: '#FFF3E6' },
] as const
const style = ref<typeof styles[number]['key']>('classic')
const bar = computed(() => styles.find(st => st.key === style.value)!)
const previewLang = ref<Locale>(loc.value)
const guest = ref('')
const previewUrl = computed(() => `${previewLang.value === 'km' ? '/km' : ''}/demo-${style.value}/${guest.value.trim() ? `?to=${encodeURIComponent(guest.value.trim())}` : ''}`)
// Shimmer only while switching: the first load can finish before the page is ready to hear about it
const loading = ref(false)
watch(previewUrl, () => (loading.value = true))

// The sample opens its envelope and drifts down the invitation by itself, looping, until the visitor
// touches or scrolls it (then it's theirs to try). The sample is on this site, so its page is reachable.
const frame = ref<HTMLIFrameElement>()
let stopTour = () => {}
function tour() {
  stopTour()
  const win = frame.value?.contentWindow
  const doc = frame.value?.contentDocument
  if (!win || !doc || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  let timer: ReturnType<typeof setTimeout>
  let raf = 0
  const events = ['pointerdown', 'wheel', 'touchstart', 'keydown'] as const
  stopTour = () => {
    clearTimeout(timer)
    win.cancelAnimationFrame(raf)
    for (const e of events) win.removeEventListener(e, stopTour)
  }
  for (const e of events) win.addEventListener(e, stopTour, { passive: true })
  function drift() {
    let y = win!.scrollY
    let last = performance.now()
    const step = (now: number) => {
      // About 45px a second; kept as a float, since one frame's step is under a pixel
      y += (now - last) * 0.045
      last = now
      win!.scrollTo({ top: y, behavior: 'instant' })
      if (y + win!.innerHeight >= doc!.documentElement.scrollHeight - 2) {
        timer = setTimeout(() => {
          win!.scrollTo({ top: 0, behavior: 'instant' })
          timer = setTimeout(drift, 1500)
        }, 2500)
        return
      }
      raf = win!.requestAnimationFrame(step)
    }
    raf = win!.requestAnimationFrame(step)
  }
  timer = setTimeout(() => {
    // The envelope comes first on the page, so this is its "Open invitation" button
    ;(doc.querySelector('.actions .btn-primary') as HTMLElement | null)?.click()
    timer = setTimeout(drift, 3500)
  }, 1500)
}
function onFrameLoad() {
  loading.value = false
  tour()
}
// The first load can finish before the page is ready to hear it
onMounted(() => { if (frame.value?.contentDocument?.readyState === 'complete') tour() })
onBeforeUnmount(() => stopTour())

// The header gets a frosted background once the page has scrolled, slides away while scrolling down
// and comes back on the way up
const scrolled = ref(false)
const navHidden = ref(false)
let lastY = 0
function onScroll() {
  const y = scrollY
  scrolled.value = y > 8
  // Small moves (and the bounce at the ends) don't flip it
  if (Math.abs(y - lastY) > 6) navHidden.value = y > lastY && y > 120
  lastY = y
}
onMounted(() => { onScroll(); addEventListener('scroll', onScroll, { passive: true }) })
onBeforeUnmount(() => removeEventListener('scroll', onScroll))

// Price table: the base price, then each feature as included or a priced add-on. Hidden until a base price is set.
const pricing = computed(() => site.value?.pricing)
const money = (m: Money | null | undefined) => (m ? [m.usd != null ? `$${m.usd.toLocaleString('en-US')}` : '', m.khr != null ? `${m.khr.toLocaleString('en-US')}៛` : ''].filter(Boolean).join(' · ') : '')
const showPrices = computed(() => !!money(pricing.value?.base))
// The table lists what's included first, then the add-ons to tick
// Music is priced too, but not one of the six feature cards
const priced = [...features, { key: 'music', icon: 'music' }] as const
const includedFeatures = computed(() => priced.filter(f => !pricing.value?.addons[f.key]))
const addonFeatures = computed(() => priced.filter(f => pricing.value?.addons[f.key]))
// Always part of every invitation, so not priced; text in home.always
const ALWAYS = [
  { key: 'envelope', icon: 'rings' },
  { key: 'countdown', icon: 'hourglass' },
  { key: 'style', icon: 'dress' },
  { key: 'preview', icon: 'guests' },
  { key: 'changes', icon: 'clock' },
] as const
// Ticked add-ons add up into the total; a currency is totalled only when every chosen item has a price in it
const picked = ref<HomeFeature[]>([])
const total = computed<Money>(() => {
  const items = [pricing.value!.base, ...picked.value.map(k => pricing.value!.addons[k]!)]
  const sum = (c: 'usd' | 'khr') => (items.every(m => m[c] != null) ? items.reduce((n, m) => n + m[c]!, 0) : null)
  return { usd: sum('usd'), khr: sum('khr') }
})

// Contact form: each enquiry goes to the site owner on Telegram
const form = reactive({ name: '', reach: '', date: '', style: '', message: '', website: '' })
const sendState = ref<'idle' | 'sending' | 'sent' | 'failed'>('idle')
async function sendForm() {
  sendState.value = 'sending'
  try {
    await $fetch('/api/contact', { method: 'POST', body: { ...form, addons: picked.value } })
    sendState.value = 'sent'
  } catch {
    sendState.value = 'failed'
  }
}

const telegramUrl = computed(() => site.value?.telegram && `https://t.me/${site.value.telegram}`)
const hasContact = computed(() => !!(site.value && (site.value.telegram || site.value.phone || site.value.facebook || site.value.email)))

useHead(() => ({
  title: `${name.value} · ${t('home.eyebrow')}`,
  htmlAttrs: { lang: loc.value },
  meta: [
    { name: 'description', content: tagline.value },
    { property: 'og:title', content: name.value },
    { property: 'og:description', content: tagline.value },
  ],
}))
</script>

<template>
  <div class="home">
    <header class="top" :class="{ scrolled, hidden: navHidden }" @focusin="navHidden = false">
      <span class="brand">{{ name }}</span>
      <WeddingLanguageSwitcher />
    </header>

    <main>
      <section class="hero">
        <div class="hero-text">
          <h1>{{ tagline }}</h1>
          <p class="lead">{{ about }}</p>
          <div class="ctas">
            <a v-if="telegramUrl" :href="telegramUrl" class="btn btn-primary" target="_blank" rel="noopener">{{ t('home.ctaTelegram') }}</a>
            <a v-else href="#contact" class="btn btn-primary">{{ t('home.ctaContact') }}</a>
            <a href="#try" class="btn btn-ghost">{{ t('home.ctaStyles') }}</a>
          </div>
        </div>
        <div id="try" class="try">
          <div class="phone">
            <div class="screen">
              <!-- Laid out at a real iPhone's size (390 × 844), then scaled to the frame -->
              <div class="viewport">
                <div class="status" :style="{ background: bar.bar, color: bar.ink }" aria-hidden="true">
                  <span class="clock">9:41</span>
                  <svg class="status-icons" viewBox="0 0 70 13" fill="currentColor">
                    <rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="6" width="3" height="6" rx="1" /><rect x="10" y="3.5" width="3" height="8.5" rx="1" /><rect x="15" y="1" width="3" height="11" rx="1" />
                    <path d="M31 3.2a9.5 9.5 0 0 1 12.6 0l-1.3 1.4a7.6 7.6 0 0 0-10 0zM33.4 5.8a6 6 0 0 1 7.8 0l-1.3 1.4a4.1 4.1 0 0 0-5.2 0zM35.8 8.4a2.4 2.4 0 0 1 3 0L37.3 10z" />
                    <rect x="47.5" y="1" width="20" height="10.5" rx="3" fill="none" stroke="currentColor" opacity="0.45" /><rect x="49.5" y="3" width="14" height="6.5" rx="1.5" /><path d="M68.8 4.5v3.5a1.8 1.8 0 0 0 0-3.5z" opacity="0.45" />
                  </svg>
                </div>
                <span class="island" aria-hidden="true" />
                <iframe ref="frame" :src="previewUrl" :title="t('home.previewTitle')" @load="onFrameLoad" />
                <span class="home-bar" aria-hidden="true" />
                <span v-if="loading" class="loading" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div class="controls">
            <div class="tabs" role="radiogroup" :aria-label="t('home.stylesTitle')">
              <button
                v-for="st in styles" :key="st.key" type="button" role="radio" class="tab"
                :aria-checked="style === st.key" :style="{ '--dot': st.dot }" @click="style = st.key"
              >
                <span class="dot" aria-hidden="true" />{{ t(`home.styles.${st.key}.title`) }}
              </button>
            </div>
            <p class="style-text">{{ t(`home.styles.${style}.text`) }}</p>
            <div class="field">
              <label for="try-name">{{ t('home.tryName') }}</label>
              <input id="try-name" v-model.lazy="guest" maxlength="120" :placeholder="t('home.tryPlaceholder')" enterkeyhint="go">
            </div>
            <div class="row">
              <div class="seg" role="radiogroup" :aria-label="t('common.language')">
                <button type="button" role="radio" :aria-checked="previewLang === 'en'" @click="previewLang = 'en'">EN</button>
                <button type="button" role="radio" :aria-checked="previewLang === 'km'" lang="km" @click="previewLang = 'km'">ខ្មែរ</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="block" aria-labelledby="features-title">
        <h2 id="features-title" v-reveal>{{ t('home.featuresTitle') }}</h2>
        <ul class="features">
          <li v-for="(f, i) in features" :key="f.key" v-reveal="100 + (i % 3) * 30">
            <span class="badge-icon"><WeddingIcon :name="f.icon" /></span>
            <h3>{{ t(`home.features.${f.key}.title`) }}</h3>
            <p>{{ t(`home.features.${f.key}.text`) }}</p>
          </li>
        </ul>
      </section>

      <section v-if="showPrices" id="prices" class="block" aria-labelledby="prices-title">
        <h2 id="prices-title" v-reveal>{{ t('home.pricesTitle') }}</h2>
        <p v-reveal="80" class="block-lead">{{ t('home.pricesLead') }}</p>
        <div v-reveal="120" class="price-card">
          <p class="base">
            <span>{{ t('home.basePrice') }}<small>{{ t('home.baseNote') }}</small></span>
            <strong class="tabular">{{ money(pricing!.base) }}</strong>
          </p>
          <table class="prices">
            <tbody>
              <tr v-for="a in ALWAYS" :key="`always-${a.key}`">
                <th scope="row"><WeddingIcon :name="a.icon" />{{ t(`home.always.${a.key}`) }}</th>
                <td class="included"><WeddingIcon name="check" /> {{ t('home.included') }}</td>
              </tr>
              <tr v-for="f in includedFeatures" :key="f.key">
                <th scope="row"><WeddingIcon :name="f.icon" />{{ t(`home.features.${f.key}.title`) }}</th>
                <td class="included"><WeddingIcon name="check" /> {{ t('home.included') }}</td>
              </tr>
              <tr v-if="addonFeatures.length" class="group">
                <th colspan="2" scope="rowgroup">{{ t('home.addons') }}</th>
              </tr>
              <!-- Add-ons are tick boxes: the whole row toggles them -->
              <tr v-for="f in addonFeatures" :key="f.key" class="addon" :class="{ on: picked.includes(f.key) }">
                <th scope="row">
                  <label class="pick">
                    <input v-model="picked" type="checkbox" :value="f.key" class="visually-hidden">
                    <span class="box" aria-hidden="true" />
                    <WeddingIcon :name="f.icon" />{{ t(`home.features.${f.key}.title`) }}
                  </label>
                </th>
                <td class="tabular">+ {{ money(pricing!.addons[f.key]) }}</td>
              </tr>
            </tbody>
          </table>
          <!-- A receipt of what's picked: the invitation, each ticked add-on, then the total -->
          <ul class="receipt">
            <li><span>{{ t('home.basePrice') }}</span><span class="tabular">{{ money(pricing!.base) }}</span></li>
            <TransitionGroup name="line">
              <li v-for="k in picked" :key="k" class="extra">
                <span>+ {{ t(`home.features.${k}.title`) }}</span>
                <span class="tabular">{{ money(pricing!.addons[k]) }}</span>
                <button type="button" class="remove" :aria-label="t('home.remove', { item: t(`home.features.${k}.title`) })" @click="picked = picked.filter(p => p !== k)"><WeddingIcon name="close" /></button>
              </li>
            </TransitionGroup>
          </ul>
          <p class="total">
            <span>{{ t('home.total') }}</span>
            <strong :key="money(total)" class="tabular bump">{{ money(total) }}</strong>
          </p>
          <a href="#contact" class="btn btn-primary ask">{{ t('home.askPrice') }}</a>
        </div>
      </section>

      <section class="block" aria-labelledby="how-title">
        <h2 id="how-title" v-reveal>{{ t('home.howTitle') }}</h2>
        <ol class="how">
          <li v-for="(icon, i) in (['envelope', 'phone', 'heart'] as const)" :key="icon" v-reveal="60 + i * 30">
            <div class="how-art" aria-hidden="true"><span class="how-icon"><WeddingIcon :name="icon" /></span></div>
            <div class="how-text">
              <p class="how-step">{{ t('home.step', { n: i + 1 }) }}</p>
              <h3>{{ t(`home.how.${i + 1}.title`) }}</h3>
              <p>{{ t(`home.how.${i + 1}.text`) }}</p>
            </div>
          </li>
        </ol>
      </section>

      <section class="block" aria-labelledby="need-title">
        <h2 id="need-title" v-reveal>{{ t('home.needTitle') }}</h2>
        <p v-reveal="80" class="block-lead">{{ t('home.needLead') }}</p>
        <ul class="need">
          <li v-for="n in 6" :key="n" v-reveal="60 + n * 30"><WeddingIcon name="check" />{{ t(`home.need.${n}`) }}</li>
        </ul>
      </section>

      <section class="block" aria-labelledby="faq-title">
        <h2 id="faq-title" v-reveal>{{ t('home.faqTitle') }}</h2>
        <!-- One answer open at a time (same name) -->
        <div class="faq">
          <details v-for="n in 6" :key="n" v-reveal="40 + n * 30" name="faq">
            <summary>{{ t(`home.faq.${n}.q`) }}</summary>
            <p>{{ t(`home.faq.${n}.a`) }}</p>
          </details>
        </div>
      </section>

      <section id="contact" class="block contact" aria-labelledby="contact-title">
        <h2 id="contact-title" v-reveal>{{ t('home.contactTitle') }}</h2>
        <p v-reveal="80" class="block-lead">{{ t('home.contactLead') }}</p>
        <p v-if="sendState === 'sent'" class="sent" role="status">{{ t('home.form.sent') }}</p>
        <form v-else v-reveal="120" class="enquiry" @submit.prevent="sendForm">
          <!-- What they picked in the price table travels with the enquiry; shown here so they can check it -->
          <div v-if="showPrices && picked.length" class="wide chosen">
            <p class="chosen-title">{{ t('home.form.chosen') }}</p>
            <ul>
              <li>{{ t('home.basePrice') }}</li>
              <li v-for="k in picked" :key="k">+ {{ t(`home.features.${k}.title`) }}</li>
            </ul>
            <p class="chosen-total"><strong class="tabular">{{ money(total) }}</strong><a href="#prices">{{ t('home.form.change') }}</a></p>
          </div>
          <div class="field">
            <label for="c-name">{{ t('home.form.name') }}</label>
            <input id="c-name" v-model="form.name" required maxlength="120" autocomplete="name" enterkeyhint="next">
          </div>
          <div class="field">
            <label for="c-reach">{{ t('home.form.reach') }}</label>
            <input id="c-reach" v-model="form.reach" required maxlength="120" autocomplete="tel" :placeholder="t('home.form.reachHint')" enterkeyhint="next">
          </div>
          <div class="field">
            <label for="c-date">{{ t('home.form.date') }}</label>
            <input id="c-date" v-model="form.date" type="date">
          </div>
          <div class="field">
            <label for="c-style">{{ t('home.form.style') }}</label>
            <select id="c-style" v-model="form.style">
              <option value="">{{ t('home.form.anyStyle') }}</option>
              <option v-for="st in styles" :key="st.key" :value="st.key">{{ t(`home.styles.${st.key}.title`) }}</option>
            </select>
          </div>
          <div class="field wide">
            <label for="c-message">{{ t('home.form.message') }}</label>
            <textarea id="c-message" v-model="form.message" rows="3" maxlength="2000" />
          </div>
          <!-- Hidden from people; spam bots fill it in -->
          <input v-model="form.website" class="visually-hidden" tabindex="-1" autocomplete="off" aria-hidden="true">
          <p v-if="sendState === 'failed'" class="wide failed" role="alert">{{ t('home.form.failed') }}</p>
          <div class="wide"><button type="submit" class="btn btn-primary" :disabled="sendState === 'sending'">{{ sendState === 'sending' ? t('home.form.sending') : t('home.form.send') }}</button></div>
        </form>
        <div v-if="hasContact" class="contacts">
          <a v-if="telegramUrl" :href="telegramUrl" target="_blank" rel="noopener" class="btn btn-outline">Telegram · @{{ site!.telegram }}</a>
          <a v-if="site!.phone" :href="`tel:${site!.phone.replace(/\s/g, '')}`" class="btn btn-outline tabular"><WeddingIcon name="phone" /> {{ site!.phone }}</a>
          <a v-if="site!.facebook" :href="site!.facebook" target="_blank" rel="noopener" class="btn btn-outline">Facebook</a>
          <a v-if="site!.email" :href="`mailto:${site!.email}`" class="btn btn-outline">{{ site!.email }}</a>
        </div>
      </section>
    </main>

    <footer class="foot">© {{ new Date().getFullYear() }} {{ name }}</footer>
  </div>
</template>

<style scoped>
.home {
  /* Easier reading than the invitation fonts: sturdy serif headings, the phone's own font for text */
  --font-serif: 'Lora', 'Noto Serif Khmer', Georgia, serif;
  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Khmer', sans-serif;
  --font-heading: var(--font-serif);
  font-family: var(--font-sans); font-size: 1.0625rem;
  /* clip, not hidden: never slides sideways, and the sticky header keeps working */
  overflow-x: clip; overscroll-behavior-x: none;
  min-height: 100dvh; color: var(--c-text);
  background:
    radial-gradient(60rem 30rem at 85% -10%, color-mix(in oklab, var(--c-gold) 16%, transparent), transparent 70%),
    radial-gradient(50rem 30rem at -10% 10%, color-mix(in oklab, var(--c-secondary) 10%, transparent), transparent 70%),
    var(--c-bg);
}
.top, main, .foot { width: min(72rem, 100% - 2rem); margin-inline: auto; }
.top {
  /* Floats a little below the top edge (and the iPhone notch) rather than sitting flush against it */
  position: sticky; top: calc(env(safe-area-inset-top) + var(--space-2)); z-index: var(--z-nav); display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-3) var(--space-4); margin-top: var(--space-2); border-radius: 999px;
  transition: background-color 0.3s, box-shadow 0.3s, backdrop-filter 0.3s, translate 0.35s var(--ease-out), opacity 0.35s;
}
.top.hidden { translate: 0 calc(-100% - var(--space-4) - env(safe-area-inset-top)); opacity: 0; }
.top.scrolled { background: color-mix(in oklab, var(--c-bg) 75%, transparent); backdrop-filter: blur(12px); box-shadow: 0 0 0 1px var(--c-line-soft), var(--shadow-sm); }
.brand { font-family: var(--font-serif); font-size: 1.6rem; font-weight: 600; color: var(--c-secondary); }

/* Hero: words on the left, a phone showing an invitation on the right (stacked on phones) */
.hero { display: grid; gap: var(--space-7); align-items: center; padding-block: var(--space-7) var(--space-8); }
@media (min-width: 860px) { .hero { grid-template-columns: 1.2fr 1fr; } }
.hero h1 { margin-block: 0 var(--space-4); font-family: var(--font-serif); font-weight: 600; font-size: clamp(2.3rem, 6vw, 3.6rem); line-height: 1.08; color: var(--c-tertiary); text-wrap: balance; }
.hero h1:lang(km) { line-height: 1.5; font-size: clamp(1.8rem, 5vw, 2.6rem); }
.lead { font-size: 1.1rem; color: var(--c-muted); max-width: 34rem; text-wrap: pretty; }
.ctas { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-6); }
.ctas .btn { min-height: 48px; padding-inline: 1.4rem; }

/* An iPhone: titanium frame with side buttons, black border, Dynamic Island, status bar and home bar.
   The screen holds the real sample invitation laid out at 390 × 844 and scaled down to fit. */
.try { display: flex; flex-direction: column; align-items: center; gap: var(--space-5); }
.phone {
  --w: 18rem; --rim: 0.45rem; position: relative; width: var(--w); padding: var(--rim); border-radius: 3.1rem;
  background: linear-gradient(140deg var(--oklch), #6f6a76 0%, #2a2630 18%, #17141b 50%, #2a2630 82%, #77727e 100%);
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.6), inset 0 0 0 1px rgb(255 255 255 / 0.18),
    0 40px 70px -30px rgb(45 22 64 / 0.6), 0 18px 30px -18px rgb(0 0 0 / 0.35);
}
/* Side buttons: power on the right; action and volume on the left */
.phone::before, .phone::after { content: ''; position: absolute; width: 3px; border-radius: 2px; background: linear-gradient(90deg var(--oklch), #2a2630, #77727e); }
.phone::before { right: -3px; top: 27%; height: 12%; }
.phone::after { left: -3px; top: 17%; height: 4%; box-shadow: 0 3.4rem 0 #4a4550, 0 6.6rem 0 #4a4550; height: 2.6rem; }
.screen {
  position: relative; width: 100%; aspect-ratio: 390 / 844; overflow: hidden; background: #000;
  border-radius: calc(3.1rem - var(--rim)); box-shadow: 0 0 0 0.3rem #050407;
}
/* A faint glass reflection across the screen */
.screen::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(115deg, rgb(255 255 255 / 0.1) 0%, transparent 32%); }
.viewport { position: absolute; top: 0; left: 0; width: 390px; height: 844px; transform-origin: 0 0; scale: calc((var(--w) - 2 * var(--rim)) / 390px); }
.status { position: absolute; inset: 0 0 auto; height: 50px; display: flex; justify-content: space-between; align-items: center; padding: 6px 30px 0 44px; font: 600 16px/1 system-ui, -apple-system, sans-serif; }
.status-icons { width: 70px; height: 13px; }
.island { position: absolute; top: 11px; left: 50%; translate: -50% 0; width: 122px; height: 35px; border-radius: 20px; background: #000; }
.viewport iframe { position: absolute; top: 50px; left: 0; width: 390px; height: 794px; border: 0; background: #fff; }
.home-bar { position: absolute; bottom: 8px; left: 50%; translate: -50% 0; width: 134px; height: 5px; border-radius: 3px; background: rgb(0 0 0 / 0.55); pointer-events: none; }
.loading { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgb(255 255 255 / 0.7) 50%, transparent 70%) 0 0 / 200% 100%, var(--c-bg); }
@media (prefers-reduced-motion: no-preference) { .loading { animation: shimmer 1.2s linear infinite; } }
@keyframes shimmer { to { background-position: -200% 0, 0 0; } }

.controls { width: min(100%, 22rem); display: flex; flex-direction: column; gap: var(--space-4); }
.tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-1); padding: 4px; border-radius: 999px; background: var(--c-surface); box-shadow: 0 0 0 1px var(--c-line-soft) inset; }
.tab {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); min-height: 44px;
  border: 0; border-radius: 999px; background: none; color: var(--c-text); font: inherit; font-weight: 500; cursor: pointer;
  transition: background-color 0.2s, color 0.2s, scale 0.15s;
}
.tab:active, .seg button:active { scale: 0.97; }
.tab[aria-checked='true'] { background: var(--c-secondary); color: var(--c-on-secondary); }
.tab:focus-visible, .seg button:focus-visible { outline: 2px solid var(--c-secondary); outline-offset: 2px; }
.dot { width: 0.7rem; height: 0.7rem; border-radius: 50%; background: var(--dot); box-shadow: 0 0 0 2px rgb(255 255 255 / 0.8); }
.style-text { text-align: center; color: var(--c-muted); font-size: 0.95rem; min-height: 3em; text-wrap: pretty; }
.controls .field label { font-weight: 500; }
.row { display: flex; justify-content: center; }
.seg { display: flex; padding: 3px; border-radius: 999px; box-shadow: 0 0 0 1px var(--c-line) inset; }
.seg button { min-width: 3rem; min-height: 44px; border: 0; border-radius: 999px; background: none; color: var(--c-muted); font: inherit; cursor: pointer; transition: background-color 0.2s, color 0.2s, scale 0.15s; }
.seg button[aria-checked='true'] { background: var(--c-secondary); color: var(--c-on-secondary); }

.block { padding-block: var(--space-7); }
.block h2 { font-family: var(--font-serif); font-weight: 600; font-size: clamp(1.8rem, 4vw, 2.4rem); color: var(--c-tertiary); text-align: center; text-wrap: balance; }
.block h2:lang(km) { line-height: 1.6; }
.block-lead { text-align: center; color: var(--c-muted); margin: var(--space-2) auto 0; max-width: 36rem; }
.block h3 { text-wrap: balance; font-size: 1.15rem; color: var(--c-secondary); margin-block: var(--space-3) var(--space-1); }

.features { list-style: none; margin: var(--space-6) 0 0; padding: 0; display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
/* Six features: two rows of three, never four and two */
@media (min-width: 860px) { .features { grid-template-columns: repeat(3, 1fr); } }
.features li { padding: var(--space-5); background: var(--c-surface); border: 1px solid var(--c-line-soft); border-radius: var(--radius-lg); transition: translate 0.3s var(--ease-out), box-shadow 0.3s, border-color 0.3s; }
.badge-icon { transition: background-color 0.3s, color 0.3s, scale 0.3s var(--ease-out); }
@media (hover: hover) {
  .features li:hover { translate: 0 -4px; border-color: var(--c-line); box-shadow: var(--shadow); }
  .features li:hover .badge-icon { background: var(--c-secondary); color: var(--c-on-secondary); scale: 1.08; }
}
.features p, .how p { color: var(--c-muted); font-size: 0.95rem; }
.badge-icon { display: grid; place-items: center; width: 3rem; height: 3rem; border-radius: 50%; font-size: 1.4rem; color: var(--c-secondary); background: color-mix(in oklab, var(--c-secondary) 9%, transparent); }

/* How it works: three tall cards, each with a large icon on a tinted panel. In a row when wide, stacked on phones. */
.how { list-style: none; margin: var(--space-6) 0 0; padding: 0; display: grid; gap: var(--space-5); grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
.how li {
  display: flex; flex-direction: column; overflow: hidden; border-radius: var(--radius-lg);
  background: var(--c-surface); box-shadow: 0 0 0 1px var(--c-line-soft) inset, var(--shadow-sm);
  transition: translate 0.35s var(--ease-out), box-shadow 0.35s;
}
.how-art {
  display: grid; place-items: center; aspect-ratio: 16 / 10;
  background:
    radial-gradient(circle at 50% 50%, transparent 0 22%, color-mix(in oklab, var(--c-gold) 22%, transparent) 22.5% 23%, transparent 23.5% 32%, color-mix(in oklab, var(--c-gold) 14%, transparent) 32.5% 33%, transparent 33.5%),
    linear-gradient(160deg var(--oklch), color-mix(in oklab, var(--c-secondary) 14%, var(--c-bg)), color-mix(in oklab, var(--c-gold) 18%, var(--c-bg)));
}
.how-icon {
  display: grid; place-items: center; width: 5.5rem; height: 5.5rem; border-radius: 50%;
  font-size: 2.6rem; color: var(--c-secondary); background: var(--c-surface);
  box-shadow: 0 10px 24px -10px rgb(45 22 64 / 0.45), 0 0 0 6px color-mix(in oklab, var(--c-surface) 55%, transparent);
  transition: scale 0.35s var(--ease-out), rotate 0.35s var(--ease-out);
}
.how-text { padding: var(--space-4) var(--space-5) var(--space-5); text-align: center; }
.how-text h3 { margin-top: var(--space-1); }
.how-step { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--c-accent-ink); }
.how-step:lang(km) { letter-spacing: 0; text-transform: none; font-size: 0.9rem; }
.how li:active { translate: 0 -4px; box-shadow: 0 0 0 1px var(--c-line) inset, var(--shadow); }
.how li:active .how-icon { scale: 1.08; rotate: -6deg; }
@media (hover: hover) {
  .how li:hover { translate: 0 -4px; box-shadow: 0 0 0 1px var(--c-line) inset, var(--shadow); }
  .how li:hover .how-icon { scale: 1.08; rotate: -6deg; }
}

/* What to send: a two-column checklist with gold ticks */
.need { list-style: none; margin: var(--space-6) auto 0; padding: 0; max-width: 46rem; display: grid; gap: var(--space-3) var(--space-6); grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); }
.need li { position: relative; padding-left: 2rem; text-wrap: pretty; }
.need .icon { position: absolute; left: 0; top: 0.15em; width: 1.4rem; height: 1.4rem; padding: 0.25rem; border-radius: 50%; stroke-width: 2.5; color: var(--c-tertiary); background: var(--c-gold); }

.faq { max-width: 46rem; margin: var(--space-6) auto 0; display: flex; flex-direction: column; gap: var(--space-2); }
.faq details { border-radius: var(--radius); background: var(--c-surface); box-shadow: 0 0 0 1px var(--c-line-soft) inset; transition: box-shadow 0.2s; }
.faq details[open] { box-shadow: 0 0 0 1px var(--c-line) inset, var(--shadow-sm); }
.faq summary { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); min-height: 44px; padding: var(--space-3) var(--space-4); font-weight: 500; cursor: pointer; list-style: none; }
.faq summary::-webkit-details-marker { display: none; }
.faq summary::after { content: ''; flex: none; width: 0.9rem; height: 0.9rem; background: linear-gradient(var(--c-accent-ink) 0 0) center / 100% 2px no-repeat, linear-gradient(var(--c-accent-ink) 0 0) center / 2px 100% no-repeat; transition: rotate 0.2s var(--ease-in-out); }
.faq details[open] summary::after { rotate: 45deg; }
.faq summary:focus-visible { outline: 2px solid var(--c-secondary); outline-offset: 2px; border-radius: var(--radius); }
.faq details p { padding: 0 var(--space-4) var(--space-4); color: var(--c-muted); text-wrap: pretty; }
/* Answers slide open and closed, and fade in (browsers without ::details-content just open them) */
.faq { interpolate-size: allow-keywords; }
.faq details::details-content { block-size: 0; overflow: hidden; transition: block-size 0.24s var(--ease-out), content-visibility 0.24s allow-discrete; }
.faq details[open]::details-content { block-size: auto; transition-duration: 0.3s; }
@media (prefers-reduced-motion: no-preference) { .faq details[open] p { animation: answer 0.4s var(--ease-out); } }
@keyframes answer { from { opacity: 0; translate: 0 -6px; } }

/* Price table: base price on top, then each feature as included or + its price */
.price-card { max-width: 34rem; margin: var(--space-6) auto 0; padding: var(--space-5); border-radius: var(--radius-lg); background: var(--c-surface); box-shadow: 0 0 0 1px var(--c-line-soft) inset, var(--shadow); }
.base { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: var(--space-2) var(--space-3); padding-bottom: var(--space-4); border-bottom: 1px solid var(--c-line); }
.base span { font-weight: 500; display: flex; flex-direction: column; }
.base small { font-size: 0.85rem; font-weight: 400; color: var(--c-muted); }
.base strong { font-family: var(--font-serif); font-size: 1.9rem; color: var(--c-secondary); text-align: right; white-space: nowrap; margin-left: auto; }
.prices { width: 100%; border-collapse: collapse; }
.prices th, .prices td { padding: var(--space-3) 0; }
/* The divider is drawn on the row: the flex header cell would otherwise break it at the seam */
.prices tr { border-bottom: 1px solid var(--c-line-soft); }
.prices tr:last-child, .prices tr.group { border-bottom: 0; }
.prices th { display: flex; align-items: center; gap: var(--space-2); text-align: left; font-weight: 400; }
.prices th .icon { color: var(--c-accent-ink); }
.prices td { text-align: right; white-space: nowrap; font-weight: 500; color: var(--c-secondary); }
.prices td.included { color: var(--c-success); }
.prices td.included .icon { vertical-align: -0.25em; stroke-width: 1.8; }
.prices tr.group th { display: table-cell; padding-top: var(--space-5); font-size: 0.8rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--c-accent-ink); }
.prices tr.group th:lang(km) { letter-spacing: 0; text-transform: none; font-size: 0.95rem; }
.prices tr.addon { cursor: pointer; transition: background-color 0.15s; }
@media (hover: hover) { .prices tr.addon:hover { background: color-mix(in oklab, var(--c-secondary) 5%, transparent); } }
.prices tr.on td { color: var(--c-secondary); }
.pick { display: flex; align-items: center; gap: var(--space-2); min-height: 44px; cursor: pointer; }
.box {
  position: relative; flex: none; width: 1.35rem; height: 1.35rem; border-radius: 6px;
  box-shadow: inset 0 0 0 1.5px var(--c-line); background: var(--c-surface);
  transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s, scale 0.15s;
}
/* The tick: an L turned 45°, scaled in when checked */
.box::after {
  content: ''; position: absolute; left: 50%; top: 45%; width: 0.38rem; height: 0.7rem;
  border: solid var(--c-on-secondary); border-width: 0 2.5px 2.5px 0;
  translate: -50% -50%; rotate: 45deg; scale: 0.25; opacity: 0;
  transition: scale 0.25s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s;
}
.pick input:checked + .box { background: var(--c-secondary); box-shadow: inset 0 0 0 1.5px var(--c-secondary); }
.pick input:checked + .box::after { scale: 1; opacity: 1; }
.pick:active .box { scale: 0.97; }
.pick input:focus-visible + .box { outline: 2px solid var(--c-secondary); outline-offset: 2px; }
@media (hover: hover) { .prices tr.addon:hover .box { box-shadow: inset 0 0 0 1.5px var(--c-secondary); } }
/* The whole row toggles its add-on: the label stretches over it */
.prices tr.addon { position: relative; }
.prices tr.addon .pick::after { content: ''; position: absolute; inset: 0; }
.receipt { position: relative; list-style: none; margin: var(--space-4) 0 0; padding: var(--space-4) 0 var(--space-2); border-top: 1px solid var(--c-line); display: flex; flex-direction: column; gap: var(--space-2); font-size: 0.95rem; color: var(--c-muted); }
.receipt li { display: flex; justify-content: space-between; gap: var(--space-3); }
.receipt .extra { color: var(--c-secondary); align-items: center; }
.receipt li > :first-child { flex: 1; }
/* The invitation line keeps a gap where the add-ons have ×, so all prices line up */
.receipt li:first-child::after { content: ''; flex: none; width: 1.5rem; }
/* × is small to look at but a full fingertip to tap */
.remove {
  position: relative; flex: none; width: 1.5rem; height: 1.5rem; display: grid; place-items: center; padding: 0;
  border: 0; border-radius: 50%; background: color-mix(in oklab, var(--c-secondary) 10%, transparent);
  color: var(--c-secondary); font-size: 0.75rem; line-height: 1; cursor: pointer;
  transition: background-color 0.15s, color 0.15s, scale 0.15s;
}
.remove::after { content: ''; position: absolute; inset: -0.65rem; }
@media (hover: hover) { .remove:hover { background: var(--c-danger); color: #fff; } }
.remove:active { scale: 0.97; }
.remove:focus-visible { outline: 2px solid var(--c-secondary); outline-offset: 2px; }
/* Lines slide in when ticked and fade out when unticked (the others move up smoothly) */
.line-enter-active, .line-leave-active { transition: opacity 0.25s var(--ease-out), translate 0.25s var(--ease-out); }
.line-leave-active { transition-duration: 0.2s; }
.line-move { transition: transform 0.25s var(--ease-in-out); }
.line-enter-from, .line-leave-to { opacity: 0; translate: 0 -6px; }
.line-leave-active { position: absolute; width: 100%; }
.total { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-3); padding-top: var(--space-3); border-top: 1px dashed var(--c-line); font-weight: 500; }
.total strong { font-family: var(--font-serif); font-size: 1.6rem; color: var(--c-secondary); }
@media (prefers-reduced-motion: no-preference) {
  .bump { display: inline-block; animation: bump 0.35s var(--ease-out); }
  /* Staged once on load: the opening text, then the phone (they are on screen, so v-reveal leaves them) */
  .hero-text > *, .try { animation: rise 0.7s var(--ease-out) backwards; }
  .hero-text > :nth-child(2) { animation-delay: 0.1s; }
  .hero-text > :nth-child(3) { animation-delay: 0.2s; }
  .hero-text > :nth-child(4) { animation-delay: 0.3s; }
  .try { animation-delay: 0.35s; animation-duration: 0.9s; }
}
@keyframes bump { 40% { scale: 1.12; } }
@keyframes rise { from { opacity: 0; translate: 0 18px; } }
.ask { width: 100%; margin-top: var(--space-4); min-height: 48px; }

.contact { text-align: center; }
.enquiry { max-width: 40rem; margin: var(--space-6) auto 0; display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); text-align: left; }
.enquiry .wide { grid-column: 1 / -1; }
.home .field input, .home .field select, .home .field textarea { display: block; width: 100%; min-width: 0; box-sizing: border-box; }
.home .field input[type='date'] { -webkit-appearance: none; appearance: none; text-align: left; }
.home .field input[type='date']::-webkit-date-and-time-value { text-align: left; }
.enquiry .btn { min-height: 48px; min-width: 12rem; }
.failed { color: var(--c-danger); }
.chosen { padding: var(--space-4) var(--space-5); border-radius: var(--radius-lg); background: color-mix(in oklab, var(--c-secondary) 6%, var(--c-surface)); box-shadow: 0 0 0 1px color-mix(in oklab, var(--c-secondary) 25%, transparent) inset; }
.chosen-title { font-weight: 600; color: var(--c-secondary); }
.chosen ul { list-style: none; margin: var(--space-2) 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); }
.chosen li { padding: 0.15rem 0.7rem; border-radius: 999px; background: var(--c-surface); font-size: 0.9rem; box-shadow: 0 0 0 1px var(--c-line-soft) inset; }
.chosen-total { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-3); }
.chosen-total strong { font-family: var(--font-serif); font-size: 1.4rem; color: var(--c-secondary); }
.chosen-total a { min-height: 44px; display: inline-flex; align-items: center; color: var(--c-secondary); font-weight: 500; }
.sent { margin: var(--space-6) auto 0; max-width: 30rem; padding: var(--space-5); border-radius: var(--radius-lg); background: var(--c-surface); font-family: var(--font-serif); font-size: 1.3rem; color: var(--c-secondary); }
.contacts { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-3); margin-top: var(--space-6); }
.contacts .btn { min-height: 48px; gap: var(--space-2); }
.foot { padding-block: var(--space-6); text-align: center; color: var(--c-muted); font-size: 0.85rem; }
</style>
