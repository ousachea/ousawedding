<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { base, wedding, loadWedding } = useCurrentWedding()
const api = useAdminApi()
const { push } = useToasts()
const { continueIf } = useAdminSteps()

const DEFAULT_THEME: ThemeConfig = { background: '#F5F0F6', accent: '#C9A24A', secondary: '#5B2A86', tertiary: '#2D1640', text: '#2A1F33', headingFont: 'serif', motif: 'lotus', style: 'classic' }
// Choosing a style also applies its colours (still editable below)
const STYLE_THEMES: Record<WeddingStyle, ThemeConfig> = {
  classic: DEFAULT_THEME,
  floral: { background: '#F7F5F2', accent: '#9F86C9', secondary: '#7D5BAA', tertiary: '#5A4675', text: '#3A3242', headingFont: 'serif', motif: 'none', style: 'floral' },
  ruby: { background: '#8B0F1A', accent: '#C8364A', secondary: '#8B0F1A', tertiary: '#8B0F1A', text: '#2E1A1C', headingFont: 'serif', motif: 'none', style: 'ruby' },
}
// Fonts are not part of a style, so they are kept
const setStyle = (s: WeddingStyle) => (theme.value = { ...STYLE_THEMES[s], fontEn: theme.value?.fontEn, fontKm: theme.value?.fontKm })
// Every choice is loaded here so each sample shows in its own font
useHead({ link: [{ rel: 'stylesheet', href: fontsHref([...FONTS_EN, ...FONTS_KM]) }] })

const colorKeys = ['background', 'accent', 'secondary', 'tertiary', 'text'] as const

// Editable copy of the theme, saved with the form
const theme = ref<ThemeConfig | null>(null)
const { dirty, reset } = useUnsaved(theme)
watch(wedding, (w) => {
  if (!w) return
  theme.value = { fontEn: '', fontKm: '', ...structuredClone(toRaw(w).theme) }
  reset()
}, { immediate: true })
const styleName = (s: WeddingStyle) => t(`admin.settings.styles.${s}`).split(' (')[0]
const styleNote = (s: WeddingStyle) => t(`admin.settings.styles.${s}`).match(/\((.*)\)/)?.[1] ?? ''
const headingFamily = computed(() => theme.value?.headingFont === 'sans' ? 'system-ui, sans-serif' : `'${theme.value?.fontEn || 'Cormorant Garamond'}', serif`)

const saving = ref(false)
async function save(e?: Event) {
  if (!theme.value || saving.value) return
  saving.value = true
  try {
    await api(base.value, { method: 'PATCH', body: { theme: theme.value } })
    reset()
    await loadWedding()
    push(t('common.saved'))
  } finally {
    saving.value = false
  }
  await continueIf(e)
}
</script>

<template>
  <div v-if="theme" class="look">
    <form id="theme-form" class="sections" @submit.prevent="save">
      <section class="panel form-grid">
        <header class="section-head">
          <h2>{{ t('admin.settings.style') }}</h2>
          <p class="hint">{{ t('admin.settings.styleHint') }}</p>
        </header>
        <div class="choices">
          <label v-for="st in (['classic', 'floral', 'ruby'] as const)" :key="st" class="choice">
            <input type="radio" name="style" :value="st" :checked="(theme.style ?? 'classic') === st" class="visually-hidden" @change="setStyle(st)">
            <span class="strip" aria-hidden="true">
              <span v-for="key in colorKeys" :key="key" :style="{ background: STYLE_THEMES[st][key] }" />
            </span>
            <span class="choice-title">{{ styleName(st) }}</span>
            <span class="muted small">{{ styleNote(st) }}</span>
          </label>
        </div>
      </section>

      <section class="panel form-grid">
        <header class="section-head">
          <h2>{{ t('admin.look.colours') }}</h2>
          <p class="hint">{{ t('admin.look.coloursHint') }}</p>
        </header>
        <div class="swatches">
          <label v-for="key in colorKeys" :key="key" class="swatch" :for="`c-${key}`">
            <input :id="`c-${key}`" v-model="theme[key]" type="color">
            <span class="swatch-text">
              <span class="swatch-name">{{ t(`admin.settings.${key}`) }}</span>
              <span class="muted small tabular">{{ theme[key].toUpperCase() }}</span>
            </span>
          </label>
        </div>
        <div><button type="button" class="btn btn-ghost btn-sm" @click="setStyle(theme.style ?? 'classic')">{{ t('admin.settings.resetTheme') }}</button></div>
      </section>

      <section class="panel form-grid">
        <header class="section-head">
          <h2>{{ t('admin.look.fonts') }}</h2>
        </header>
        <fieldset class="bare">
          <legend class="label">{{ t('admin.settings.headingFont') }}</legend>
          <div class="choices two">
            <label v-for="f in (['serif', 'sans'] as const)" :key="f" class="choice">
              <input v-model="theme.headingFont" type="radio" name="heading-font" :value="f" class="visually-hidden">
              <span class="font-demo" :style="{ fontFamily: f === 'serif' ? `'${theme.fontEn || 'Cormorant Garamond'}', serif` : 'system-ui, sans-serif' }">Aa</span>
              <span class="choice-title">{{ t(`admin.settings.fonts.${f}`) }}</span>
            </label>
          </div>
        </fieldset>
        <div class="form-grid cols-2">
          <div class="field">
            <label for="s-font-en">{{ t('admin.settings.fontEn') }}</label>
            <select id="s-font-en" v-model="theme.fontEn">
              <option value="">{{ t('admin.settings.fontDefault', { name: 'Cormorant Garamond' }) }}</option>
              <option v-for="f in FONTS_EN" :key="f" :value="f">{{ f }}</option>
            </select>
            <p class="font-sample" :style="{ fontFamily: `'${theme.fontEn || 'Cormorant Garamond'}', serif` }">{{ wedding?.names.en.partner1 }} &amp; {{ wedding?.names.en.partner2 }}</p>
          </div>
          <div class="field">
            <label for="s-font-km">{{ t('admin.settings.fontKm') }}</label>
            <select id="s-font-km" v-model="theme.fontKm">
              <option value="">{{ t('admin.settings.fontDefault', { name: 'Noto Serif Khmer' }) }}</option>
              <option v-for="f in FONTS_KM" :key="f" :value="f">{{ f }}</option>
            </select>
            <p class="font-sample" lang="km" :style="{ fontFamily: `'${theme.fontKm || 'Noto Serif Khmer'}', serif` }">{{ wedding?.names.km.partner1 }} និង {{ wedding?.names.km.partner2 }}</p>
          </div>
        </div>
      </section>

      <section class="panel form-grid">
        <header class="section-head">
          <h2>{{ t('admin.settings.motif') }}</h2>
        </header>
        <div class="choices three">
          <label v-for="m in (['lotus', 'kbach', 'none'] as const)" :key="m" class="choice">
            <input v-model="theme.motif" type="radio" name="motif" :value="m" class="visually-hidden">
            <span class="choice-title">{{ t(`admin.settings.motifs.${m}`) }}</span>
          </label>
        </div>
      </section>

      <AdminStepNav form="theme-form" :saving="saving" :dirty="dirty" />
    </form>

    <!-- A quick look at the colours and heading font together, before saving -->
    <aside class="preview-wrap" :aria-label="t('admin.settings.preview')">
      <p class="muted small">{{ t('admin.settings.preview') }}</p>
      <div class="preview" :style="{ background: theme.background, color: theme.text }">
        <span class="p-rule" :style="{ background: theme.accent }" />
        <p class="p-invite" :style="{ color: `color-mix(in oklab, ${theme.accent} 50%, ${theme.text})` }">{{ t('admin.look.sampleInvite') }}</p>
        <p class="p-names" :style="{ fontFamily: headingFamily, color: theme.secondary }">{{ wedding?.names.en.partner1 }} &amp; {{ wedding?.names.en.partner2 }}</p>
        <p class="p-text">{{ t('admin.look.sampleText') }}</p>
        <span class="p-btn" :style="{ background: theme.secondary }"><abbr class="caps">RSVP</abbr></span>
        <span class="p-band" :style="{ background: theme.tertiary }">
          <span v-for="n in ['12', '08', '30']" :key="n" class="tabular">{{ n }}</span>
        </span>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.look { display: grid; gap: var(--space-5); align-items: start; max-width: 72rem; }
@media (min-width: 1000px) { .look { grid-template-columns: minmax(0, 1fr) 19rem; } }
.sections { display: flex; flex-direction: column; gap: var(--space-5); min-width: 0; }
.bare { border: 0; padding: 0; margin: 0; min-width: 0; }
.label { padding: 0; margin-bottom: var(--space-2); font-size: 0.9rem; font-weight: 500; }
.choices.two { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 26rem; }
.choices.three { grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 32rem; }
.choices.three .choice { align-items: center; text-align: center; }

.strip { display: flex; height: 2.6rem; border-radius: var(--radius-sm); overflow: hidden; box-shadow: 0 0 0 1px var(--c-line-soft); }
.strip span { flex: 1; }

.swatches { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); }
.swatch { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2); border: 1px solid var(--c-line-soft); border-radius: var(--radius); cursor: pointer; }
@media (hover: hover) { .swatch:hover { border-color: var(--c-line); } }
.swatch input[type='color'] { flex: none; width: 3rem; height: 3rem; padding: 0; border: 0; border-radius: 50%; background: none; cursor: pointer; }
.swatch input[type='color']::-webkit-color-swatch-wrapper { padding: 0; }
.swatch input[type='color']::-webkit-color-swatch { border: 1px solid var(--c-line); border-radius: 50%; }
.swatch input[type='color']::-moz-color-swatch { border: 1px solid var(--c-line); border-radius: 50%; }
.swatch-text { display: flex; flex-direction: column; min-width: 0; }
.swatch-name { font-size: 0.9rem; font-weight: 500; line-height: 1.3; }

.font-demo { font-size: 2rem; line-height: 1; }
.font-sample { margin-top: var(--space-1); font-size: 1.6rem; line-height: 1.4; }

.preview-wrap { display: flex; flex-direction: column; gap: var(--space-2); }
@media (min-width: 1000px) { .preview-wrap { position: sticky; top: 5rem; } }
.preview {
  display: flex; flex-direction: column; align-items: center; gap: var(--space-3); overflow: hidden;
  padding: var(--space-6) var(--space-4) 0; border-radius: var(--radius-lg); text-align: center;
  box-shadow: var(--shadow-sm), 0 0 0 1px var(--c-line-soft);
  transition: background-color 0.3s, color 0.3s;
}
.p-rule { width: 3rem; height: 2px; }
.p-invite { font-size: 0.75rem; letter-spacing: 0.18em; text-transform: uppercase; }
.p-names { font-size: 1.9rem; line-height: 1.15; text-wrap: balance; }
.p-text { font-size: 0.9rem; max-width: 15rem; }
.p-btn { padding: 0.5rem 1.4rem; border-radius: 999px; color: #fff; font-size: 0.85rem; font-weight: 600; }
.p-band { display: flex; justify-content: center; gap: var(--space-4); align-self: stretch; margin-top: var(--space-3); padding: var(--space-3); color: #fff; font-size: 1.4rem; font-weight: 600; }
</style>
