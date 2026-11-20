<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { me } = useAdminSession()
const { list, id, wedding, select, loadList } = useCurrentWedding()
const { toasts } = useToasts()
const { state: confirmState } = useConfirm()
const { push } = useToasts()
const api = useAdminApi()
const menuOpen = ref(false)

const { steps, index: stepIndex, step } = useAdminSteps()
const isOverview = computed(() => route.path.replace(/\/$/, '') === localePath('/admin'))
const dateLabel = computed(() => wedding.value ? new Date(wedding.value.date).toLocaleDateString(locale.value === 'km' ? 'km-KH' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
watch(() => route.path, () => (menuOpen.value = false))
// Keep the current step in view in the tablet step row
const strip = ref<HTMLElement>()
const showCurrentStep = () => nextTick(() => strip.value?.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'center' }))
watch(stepIndex, showCurrentStep)
onMounted(showCurrentStep)

onMounted(() => { if (!list.value.length) loadList() })

async function createWedding() {
  const slug = window.prompt(t('admin.wedding.slugPrompt'))?.trim().toLowerCase()
  if (!slug) return
  const created = await api<Wedding>('/api/admin/weddings', { method: 'POST', body: { slug } })
  await loadList()
  await select(created.id)
  push(t('common.saved'))
  // A new couple starts at the first step
  await navigateTo(localePath('/admin/couple'))
}

async function logout() {
  await $fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {})
  me.value = null
  await navigateTo(localePath('/admin/login'))
}

function answer(ok: boolean) {
  confirmState.value?.resolve(ok)
  confirmState.value = null
}

useHead({ title: () => t('admin.title'), meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
</script>

<template>
  <div class="admin">
    <aside class="side" :class="{ open: menuOpen }">
      <div class="side-head">
        <NuxtLink :to="localePath('/admin')" class="couple">
          <span v-if="wedding" class="couple-names">{{ wedding.names.en.partner1 }} &amp; {{ wedding.names.en.partner2 }}</span>
          <span v-else class="couple-names">{{ t('admin.title') }}</span>
          <span v-if="wedding" class="couple-date">{{ dateLabel }}</span>
        </NuxtLink>
        <button type="button" class="btn btn-ghost btn-sm menu-btn" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
          {{ t('admin.nav.menu') }}
        </button>
      </div>
      <!-- Tablets in portrait: the steps stay in view as a row to tap, instead of only behind Menu -->
      <nav ref="strip" class="step-strip" :aria-label="t('admin.nav.steps')">
        <NuxtLink
          v-for="(s, i) in steps" :key="s.key" :to="localePath(s.to)" class="strip-step"
          :class="{ active: i === stepIndex, done: i < stepIndex }" :aria-current="i === stepIndex ? 'step' : undefined"
        >
          <span class="strip-dot">{{ i + 1 }}</span>{{ t(`admin.steps.${s.key}.title`) }}
        </NuxtLink>
      </nav>
      <div class="side-body">
        <!-- Which couple is being edited: first, as the steps below all belong to it -->
        <div v-if="list.length > 1 || me?.role === 'owner'" class="field wedding-select">
          <label for="wedding-select">{{ t('admin.wedding.select') }}</label>
          <select v-if="list.length" id="wedding-select" :value="id" @change="select(($event.target as HTMLSelectElement).value)">
            <option v-for="w in list" :key="w.id" :value="w.id">{{ w.names.en.partner1 }} & {{ w.names.en.partner2 }} · {{ w.date.slice(0, 10) }}</option>
          </select>
          <button v-if="me?.role === 'owner'" type="button" class="btn btn-ghost btn-sm" @click="createWedding">+ {{ t('admin.wedding.create') }}</button>
        </div>
        <NuxtLink :to="localePath('/admin')" class="overview-link" :class="{ active: isOverview }">{{ t('admin.nav.overview') }}</NuxtLink>
        <!-- The steps are done in order, so they are numbered and joined by a thread -->
        <ol class="steps" :aria-label="t('admin.nav.steps')">
          <li v-for="(s, i) in steps" :key="s.key">
            <NuxtLink :to="localePath(s.to)" class="step" :class="{ active: i === stepIndex }" :aria-current="i === stepIndex ? 'step' : undefined">
              <span class="dot">{{ i + 1 }}</span>
              <span class="step-text">
                <span class="step-title">{{ t(`admin.steps.${s.key}.title`) }}</span>
                <span class="step-hint">{{ t(`admin.steps.${s.key}.short`) }}</span>
              </span>
            </NuxtLink>
          </li>
        </ol>
        <div class="side-foot">
          <!-- Every invitation link opens the same named tab, so viewing it never piles up tabs -->
          <a v-if="wedding" :href="localePath(`/${wedding.slug}`)" target="wedding-invitation" class="btn btn-outline btn-sm">{{ t('admin.nav.viewSite') }} ↗</a>
          <NuxtLink :to="localePath('/admin/business')" class="btn btn-ghost btn-sm" :class="{ current: route.path.endsWith('/admin/business') }">{{ t('admin.business.title') }}</NuxtLink>
          <p v-if="me" class="muted small">{{ me.email }}</p>
          <button type="button" class="btn btn-ghost btn-sm" @click="logout">{{ t('admin.nav.logout') }}</button>
        </div>
      </div>
    </aside>

    <main class="content">
      <template v-if="wedding">
        <header v-if="step" class="step-head">
          <p class="step-count">{{ t('admin.stepOf', { n: stepIndex + 1, total: steps.length }) }}</p>
          <h1>{{ t(`admin.steps.${step.key}.title`) }}</h1>
          <p class="step-lead">{{ t(`admin.steps.${step.key}.hint`) }}</p>
        </header>
        <slot />
      </template>
      <p v-else-if="list.length" class="muted">{{ t('common.loading') }}</p>
      <p v-else class="muted">{{ t('admin.wedding.none') }}</p>
    </main>

    <div class="toasts" role="status" aria-live="polite">
      <p v-for="toast in toasts" :key="toast.id" class="toast" :class="toast.kind">{{ toast.message }}</p>
    </div>

    <AdminModal :open="!!confirmState" :title="t('common.confirm')" @close="answer(false)">
      <p>{{ confirmState?.message }}</p>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="answer(false)">{{ t('common.cancel') }}</button>
        <button type="button" class="btn" :class="confirmState?.danger ? 'btn-primary' : 'btn-outline'" @click="answer(true)">
          {{ confirmState?.action || t('common.confirm') }}
        </button>
      </template>
    </AdminModal>
  </div>
</template>

<style src="~/assets/css/admin.css"></style>

<style scoped>
.admin { min-height: 100dvh; display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto 1fr; align-content: start; background: var(--c-bg); }
.side { min-width: 0; background: var(--c-surface); border-bottom: 1px solid var(--c-line-soft); }
.side-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) var(--space-4); padding-top: max(var(--space-3), env(safe-area-inset-top)); }
/* The couple's names in the invitation's serif: the one place the admin borrows the invitation's voice */
.couple { display: flex; flex-direction: column; text-decoration: none; color: var(--c-secondary); min-width: 0; }
.couple-names { font-family: var(--font-serif); font-size: 1.45rem; font-weight: 600; line-height: 1.15; }
.couple-date { font-size: 0.82rem; color: var(--c-muted); }
.side-body { display: none; flex-direction: column; gap: var(--space-4); padding: var(--space-2) var(--space-4) var(--space-5); }
.side.open .side-body { display: flex; animation: drop 0.2s var(--ease-out); }
@keyframes drop { from { opacity: 0; transform: translateY(-6px); } }

.overview-link { padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); text-decoration: none; color: var(--c-text); font-weight: 500; }
.overview-link:hover { background: var(--c-line-soft); }
.overview-link.active { background: color-mix(in srgb, var(--c-secondary) 9%, transparent); color: var(--c-secondary); }

.steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.steps li { position: relative; }
/* The gold thread joining one step's dot to the next */
.steps li:not(:last-child)::after { content: ''; position: absolute; left: calc(0.75rem + 0.9rem - 1px); top: 2.6rem; bottom: -0.35rem; width: 2px; background: var(--c-line); }
.step { display: flex; align-items: flex-start; gap: var(--space-3); padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); text-decoration: none; color: var(--c-text); }
.step:hover { background: var(--c-line-soft); }
.dot { flex: none; display: grid; place-items: center; width: 1.8rem; height: 1.8rem; border-radius: 50%; border: 2px solid var(--c-accent); background: var(--c-surface); color: var(--c-accent-ink); font-size: 0.85rem; font-weight: 600; font-variant-numeric: tabular-nums; position: relative; z-index: 1; }
.step-text { display: flex; flex-direction: column; padding-top: 0.15rem; min-width: 0; }
.step-title { font-weight: 500; }
.step-hint { font-size: 0.8rem; color: var(--c-muted); }
.step.active { background: color-mix(in srgb, var(--c-secondary) 8%, transparent); }
.step.active .dot { background: var(--c-secondary); border-color: var(--c-secondary); color: var(--c-on-secondary); }
.step.active .step-title { color: var(--c-secondary); font-weight: 600; }
.step:focus-visible { outline: 2px solid var(--c-secondary); outline-offset: 2px; }

.side-foot { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-3); padding-top: var(--space-4); border-top: 1px solid var(--c-line-soft); }
.wedding-select { gap: var(--space-2); width: 100%; padding-bottom: var(--space-3); border-bottom: 1px solid var(--c-line-soft); }
.wedding-select .btn { align-self: flex-start; }
.side-foot .current { background: var(--c-line-soft); }

.content { padding: var(--space-5) max(1rem, env(safe-area-inset-right)) 0 max(1rem, env(safe-area-inset-left)); min-width: 0; }
.step-head { display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-5); max-width: 44rem; }
.step-count { font-size: 0.85rem; font-weight: 500; color: var(--c-accent-ink); }
.step-head h1 { font-family: var(--font-serif); font-size: clamp(2rem, 5vw, 2.6rem); font-weight: 600; line-height: 1.1; color: var(--c-secondary); }
.step-lead { color: var(--c-muted); max-width: 38rem; }

.step-strip { display: none; }
@media (min-width: 640px) and (max-width: 959px) {
  .step-strip {
    display: flex; gap: var(--space-2); overflow-x: auto; scrollbar-width: none;
    padding: 0 var(--space-4) var(--space-3); scroll-padding-inline: var(--space-4);
  }
  .step-strip::-webkit-scrollbar { display: none; }
  .strip-step {
    flex: none; display: inline-flex; align-items: center; gap: var(--space-2);
    min-height: 44px; padding: 0.35rem 1rem 0.35rem 0.4rem; border-radius: 999px;
    border: 1px solid var(--c-line); background: var(--c-bg);
    text-decoration: none; color: var(--c-text); font-weight: 500; white-space: nowrap;
    transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  }
  .strip-dot {
    display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%;
    border: 2px solid var(--c-accent); color: var(--c-accent-ink); font-size: 0.85rem; font-weight: 600; font-variant-numeric: tabular-nums;
  }
  .strip-step.done .strip-dot { background: color-mix(in srgb, var(--c-accent) 18%, transparent); }
  .strip-step.active { background: var(--c-secondary); border-color: var(--c-secondary); color: var(--c-on-secondary); }
  .strip-step.active .strip-dot { background: var(--c-on-secondary); border-color: var(--c-on-secondary); color: var(--c-secondary); }
  .strip-step:focus-visible { outline: 2px solid var(--c-secondary); outline-offset: 2px; }
  /* The open menu lists the steps again; hide the row meanwhile */
  .side.open .step-strip { display: none; }
}
@media (min-width: 960px) {
  .admin { grid-template-columns: 17.5rem 1fr; grid-template-rows: 1fr; }
  .side { border-bottom: 0; border-right: 1px solid var(--c-line-soft); position: sticky; top: 0; height: 100dvh; overflow-y: auto; display: flex; flex-direction: column; }
  .side-head { padding: var(--space-5) var(--space-4) var(--space-4); }
  .menu-btn { display: none; }
  .side-body { display: flex; flex: 1; }
  .side-foot { margin-top: auto; }
  .content { padding: var(--space-6) var(--space-6) 0; max-width: 80rem; }
}

.toasts { position: fixed; z-index: var(--z-toast); right: 1rem; bottom: max(1rem, env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: var(--space-2); max-width: min(24rem, calc(100vw - 2rem)); }
.toast { padding: 0.7rem 1rem; border-radius: var(--radius); background: var(--c-text); color: var(--c-bg); box-shadow: var(--shadow); font-size: 0.9rem; animation: in 0.2s var(--ease-out); }
.toast.error { background: var(--c-danger); color: #fff; }
@keyframes in { from { opacity: 0; transform: translateY(8px); } }
</style>
