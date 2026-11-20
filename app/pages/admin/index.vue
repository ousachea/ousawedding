<script setup lang="ts">
// Admin home: every couple, soonest wedding first. Open one to work on it, or add a new couple.
// The samples behind the home page's style preview (demo-*) are listed apart and can't be deleted.
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { list, select, loadList } = useCurrentWedding()
const api = useAdminApi()
const { push } = useToasts()
const { confirm } = useConfirm()

const names = (w: WeddingSummary) => `${w.names.en.partner1} & ${w.names.en.partner2}`
const isDemo = (w: WeddingSummary) => w.slug.startsWith('demo-')
const fmt = (w: WeddingSummary) => new Date(`${w.date}:00Z`).toLocaleDateString(locale.value === 'km' ? 'km-KH' : 'en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const daysLeft = (w: WeddingSummary) => Math.ceil((zonedTimeToUtc(w.date, w.timezone).getTime() - Date.now()) / 86_400_000)
const open = (w: WeddingSummary) => ({ path: localePath('/admin/overview'), query: { couple: w.slug } })

const q = ref('')
const couples = computed(() => list.value.filter(w => !w.isSample))
const samples = computed(() => list.value.filter(w => w.isSample))
const found = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return couples.value
  return couples.value.filter(w => [names(w), w.names.km.partner1, w.names.km.partner2, w.slug].join(' ').toLowerCase().includes(s))
})
// The list comes sorted by date: upcoming soonest first, past most recent first
const upcoming = computed(() => found.value.filter(w => daysLeft(w) >= 0))
const past = computed(() => found.value.filter(w => daysLeft(w) < 0).reverse())

async function remove(w: WeddingSummary) {
  if (!await confirm(t('admin.couples.deleteConfirm', { names: names(w) }), { action: t('common.delete') })) return
  await api(`/api/admin/weddings/${w.id}`, { method: 'DELETE' })
  await loadList()
  push(t('admin.couples.deleted', { names: names(w) }))
}

// New couple: the address is suggested from the names until edited by hand
const adding = ref(false)
const p1 = ref('')
const p2 = ref('')
const slug = ref('')
let slugEdited = false
const suggested = computed(() => [p1.value, p2.value]
  .map(n => n.trim().toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  .filter(Boolean).join('-'))
watch(suggested, (v) => { if (!slugEdited) slug.value = v })
const site = (useRuntimeConfig().public.siteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
const creating = ref(false)
async function create() {
  creating.value = true
  try {
    const created = await api<Wedding>('/api/admin/weddings', { method: 'POST', body: { slug: slug.value } })
    const [a, b] = [p1.value.trim(), p2.value.trim()]
    const pair = { partner1: a, partner2: b, parents1: '', parents2: '' }
    // Real names from the start, so the couple is no longer sample content (their alerts are sent)
    await api(`/api/admin/weddings/${created.id}`, {
      method: 'PATCH',
      body: {
        names: { en: pair, km: pair },
        monogram: `${a[0]} & ${b[0]}`.toUpperCase(),
        share: {
          en: { ...created.share.en, title: `${a} & ${b} | Wedding Invitation` },
          km: { ...created.share.km, title: `${a} & ${b} | ពិធីអាពាហ៍ពិពាហ៍` },
        },
      },
    })
    await loadList()
    await select(created.id)
    p1.value = p2.value = slug.value = ''
    slugEdited = false
    adding.value = false
    await navigateTo({ path: localePath('/admin/couple'), query: { couple: created.slug } })
  } catch {
    // the error toast is shown by api()
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="admin-page">
    <header class="page-head">
      <div>
        <h1>{{ t('admin.couples.title') }}</h1>
        <p class="muted">{{ t('admin.couples.hint') }}</p>
      </div>
      <button type="button" class="btn btn-primary" @click="adding = true">+ {{ t('admin.couples.new') }}</button>
    </header>

    <input v-if="couples.length > 3" v-model="q" type="search" class="input search" :placeholder="t('admin.couples.search')" :aria-label="t('admin.couples.search')">

    <p v-if="!couples.length" class="panel empty-state">{{ t('admin.couples.none') }}</p>
    <p v-else-if="!found.length" class="panel empty-state">{{ t('admin.couples.noMatch') }}</p>

    <section v-if="upcoming.length">
      <h2 class="sub">{{ t('admin.couples.upcoming') }} <span class="count">{{ upcoming.length }}</span></h2>
      <ul class="cards">
        <li v-for="w in upcoming" :key="w.id" class="panel card">
          <NuxtLink :to="open(w)" class="names">{{ names(w) }}</NuxtLink>
          <p class="when">
            {{ fmt(w) }} ·
            <strong v-if="daysLeft(w) === 0">{{ t('admin.couples.today') }}</strong>
            <template v-else>{{ t('admin.couples.daysLeft', { n: daysLeft(w) }, daysLeft(w)) }}</template>
          </p>
          <ul class="tags">
            <li class="badge">{{ t(`admin.settings.styles.${w.style}`).split(' (')[0] }}</li>
            <li class="badge" :class="w.hasTelegram ? 'responded' : 'pending'">{{ w.hasTelegram ? t('admin.couples.alertsCouple') : t('admin.couples.alertsYou') }}</li>
          </ul>
          <div class="actions">
            <NuxtLink :to="open(w)" class="btn btn-primary btn-sm">{{ t('admin.couples.open') }}</NuxtLink>
            <a :href="localePath(`/${w.slug}`)" target="wedding-invitation" class="btn btn-ghost btn-sm">{{ t('admin.nav.viewSite') }} ↗</a>
            <button type="button" class="btn btn-ghost btn-sm delete" @click="remove(w)">{{ t('common.delete') }}</button>
          </div>
        </li>
      </ul>
    </section>

    <details v-if="past.length" class="more" :open="!upcoming.length">
      <summary class="sub">{{ t('admin.couples.pastTitle') }} <span class="count">{{ past.length }}</span></summary>
      <ul class="rows">
        <li v-for="w in past" :key="w.id" class="row">
          <NuxtLink :to="open(w)" class="row-name">{{ names(w) }}</NuxtLink>
          <span class="muted small">{{ fmt(w) }}</span>
          <a :href="localePath(`/${w.slug}`)" target="wedding-invitation" class="btn btn-ghost btn-sm">{{ t('admin.nav.viewSite') }} ↗</a>
          <button type="button" class="btn btn-ghost btn-sm delete" @click="remove(w)">{{ t('common.delete') }}</button>
        </li>
      </ul>
    </details>

    <details v-if="samples.length" class="more">
      <summary class="sub">{{ t('admin.couples.samples') }} <span class="count">{{ samples.length }}</span></summary>
      <p class="muted small">{{ t('admin.couples.samplesHint') }}</p>
      <ul class="rows">
        <li v-for="w in samples" :key="w.id" class="row">
          <NuxtLink :to="open(w)" class="row-name">{{ names(w) }}</NuxtLink>
          <span class="muted small tabular">/{{ w.slug }}</span>
          <a :href="localePath(`/${w.slug}`)" target="wedding-invitation" class="btn btn-ghost btn-sm">{{ t('admin.nav.viewSite') }} ↗</a>
          <button v-if="!isDemo(w)" type="button" class="btn btn-ghost btn-sm delete" @click="remove(w)">{{ t('common.delete') }}</button>
        </li>
      </ul>
    </details>

    <AdminModal :open="adding" :title="t('admin.couples.new')" @close="adding = false">
      <form id="new-couple" class="form-grid" @submit.prevent="create">
        <div class="form-grid cols-2">
          <div class="field">
            <label for="n-p1">{{ t('admin.settings.partner1') }}</label>
            <input id="n-p1" v-model="p1" required maxlength="60" autocomplete="off" placeholder="Sokha">
          </div>
          <div class="field">
            <label for="n-p2">{{ t('admin.settings.partner2') }}</label>
            <input id="n-p2" v-model="p2" required maxlength="60" autocomplete="off" placeholder="Dara">
          </div>
        </div>
        <div class="field">
          <label for="n-slug">{{ t('admin.couples.address') }}</label>
          <input
            id="n-slug" v-model="slug" required maxlength="60" pattern="[a-z0-9]+(-[a-z0-9]+)*" autocapitalize="off" spellcheck="false"
            @input="slugEdited = true"
          >
          <p class="hint tabular">{{ site }}/{{ slug || '…' }}</p>
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="adding = false">{{ t('common.cancel') }}</button>
        <button type="submit" form="new-couple" class="btn btn-primary" :disabled="creating">{{ creating ? t('common.saving') : t('admin.couples.create') }}</button>
      </template>
    </AdminModal>
  </div>
</template>

<style scoped>
.page-head h1 { font-size: clamp(1.8rem, 4vw, 2.2rem); }
.page-head .muted { max-width: 36rem; }
.search { max-width: 28rem; }
.sub { font-size: 1.15rem; font-weight: 600; }
.count { margin-left: 0.3rem; padding: 0 0.5rem; border-radius: 999px; background: var(--c-line-soft); font-size: 0.85rem; font-weight: 500; color: var(--c-muted); font-variant-numeric: tabular-nums; }

.cards { list-style: none; margin: var(--space-3) 0 0; padding: 0; display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr)); }
.card { display: flex; flex-direction: column; gap: var(--space-2); transition: box-shadow 0.2s; }
.card:hover { box-shadow: var(--shadow-sm); }
.names { font-size: 1.3rem; font-weight: 700; line-height: 1.25; color: var(--c-secondary); text-decoration: none; text-wrap: balance; }
.names:hover { text-decoration: underline; }
.when { font-weight: 500; }
.tags { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-1); }
.actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: auto; padding-top: var(--space-3); }
/* Delete sits last and quiet: a confirmation follows, and it should never be the obvious tap */
.delete { color: var(--c-danger); margin-left: auto; }

.more summary { cursor: pointer; list-style: none; display: flex; align-items: center; min-height: 44px; }
.more summary::-webkit-details-marker { display: none; }
.more summary::before { content: '▸'; margin-right: var(--space-2); color: var(--c-muted); transition: rotate 0.2s; }
.more[open] summary::before { rotate: 90deg; }
.rows { list-style: none; margin: var(--space-2) 0 0; padding: 0; background: var(--c-surface); border: 1px solid var(--c-line-soft); border-radius: var(--radius); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); padding: var(--space-2) var(--space-4); }
.row + .row { border-top: 1px solid var(--c-line-soft); }
.row-name { flex: 1 1 12rem; font-weight: 600; color: var(--c-text); text-decoration: none; }
.row-name:hover { color: var(--c-secondary); text-decoration: underline; }
.row .delete { margin-left: 0; }
</style>
