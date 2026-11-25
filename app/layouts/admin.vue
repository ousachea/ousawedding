<script setup lang="ts">
// Two levels: the couples (home) and the business page, then one couple's workspace with a tab per step
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { me } = useAdminSession()
const { list, id, wedding, select, loadList } = useCurrentWedding()
const { toasts } = useToasts()
const { state: confirmState } = useConfirm()

const { steps, index: stepIndex, step } = useAdminSteps()
const path = computed(() => route.path.replace(/\/$/, ''))
const isHome = computed(() => path.value === localePath('/admin'))
const isBusiness = computed(() => path.value === localePath('/admin/business'))
const isOverview = computed(() => path.value === localePath('/admin/overview'))
const inCouple = computed(() => !isHome.value && !isBusiness.value)

// Each couple's pages have their own address (?couple=<their address>), to bookmark, share or open side by
// side: the address picks the couple. A page opened without one gets the current couple's filled in.
const wanted = computed(() => route.query.couple as string | undefined)
watch(wanted, (slug) => {
  const w = list.value.find(x => x.slug === slug)
  if (w && w.id !== id.value) select(w.id)
})
watch([() => wedding.value?.slug, path], ([slug]) => {
  if (slug && inCouple.value && !wanted.value) navigateTo({ path: route.path, query: { ...route.query, couple: slug } }, { replace: true })
}, { immediate: true })
// While another couple loads, show nothing rather than the last couple's details
const ready = computed(() => !!wedding.value && (!wanted.value || wedding.value.slug === wanted.value || !list.value.some(w => w.slug === wanted.value)))
const tab = (to: string) => ({ path: localePath(to), query: wedding.value ? { couple: wedding.value.slug } : {} })

const names = computed(() => wedding.value ? `${wedding.value.names.en.partner1} & ${wedding.value.names.en.partner2}` : '')
const dateLabel = computed(() => wedding.value ? new Date(wedding.value.date).toLocaleDateString(locale.value === 'km' ? 'km-KH' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

// Keep the current tab in view when the row scrolls (phones)
const tabs = ref<HTMLElement>()
const showCurrentTab = () => nextTick(() => tabs.value?.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'center' }))
watch(path, showCurrentTab)
onMounted(showCurrentTab)

onMounted(() => { if (!list.value.length) loadList() })

async function logout() {
  await $fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {})
  me.value = null
  await navigateTo(localePath('/admin/login'))
}

// Kept while the dialog closes, so its words don't vanish first
const question = shallowRef(confirmState.value)
watch(confirmState, (s) => { if (s) question.value = s })

function answer(ok: boolean) {
  confirmState.value?.resolve(ok)
  confirmState.value = null
}

useHead({ title: () => t('admin.title'), meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
</script>

<template>
  <div class="admin">
    <header class="bar">
      <NuxtLink :to="localePath('/admin')" class="brand">{{ t('admin.title') }}</NuxtLink>
      <nav class="bar-nav">
        <NuxtLink :to="localePath('/admin')" class="bar-link" :class="{ active: !isBusiness }">{{ t('admin.nav.couples') }}</NuxtLink>
        <NuxtLink :to="localePath('/admin/business')" class="bar-link" :class="{ active: isBusiness }">{{ t('admin.business.title') }}</NuxtLink>
      </nav>
      <button type="button" class="btn btn-ghost btn-sm" :title="me?.email" @click="logout">{{ t('admin.nav.logout') }}</button>
    </header>

    <div v-if="inCouple && ready" class="couple-bar">
      <div class="couple-inner">
        <NuxtLink :to="localePath('/admin')" class="back"><WeddingIcon name="left" /> {{ t('admin.couples.all') }}</NuxtLink>
        <div class="couple-row">
          <div class="couple">
            <p class="couple-names clamp">{{ names }}</p>
            <p class="couple-date">{{ dateLabel }} · <span class="tabular">/{{ wedding!.slug }}</span></p>
          </div>
          <!-- Every invitation link opens the same named tab, so viewing it never piles up tabs -->
          <a :href="localePath(`/${wedding!.slug}`)" target="wedding-invitation" class="btn btn-outline btn-sm">{{ t('admin.nav.viewSite') }} <WeddingIcon name="out" /></a>
        </div>
        <nav ref="tabs" class="tabs" :aria-label="t('admin.nav.steps')">
          <NuxtLink :to="tab('/admin/overview')" class="tab" :class="{ active: isOverview }" :aria-current="isOverview ? 'page' : undefined">
            {{ t('admin.nav.overview') }}
          </NuxtLink>
          <NuxtLink
            v-for="(s, i) in steps" :key="s.key" :to="tab(s.to)" class="tab"
            :class="{ active: i === stepIndex }" :aria-current="i === stepIndex ? 'step' : undefined"
          >
            <span class="tab-n">{{ i + 1 }}</span>{{ t(`admin.steps.${s.key}.title`) }}
          </NuxtLink>
        </nav>
      </div>
    </div>

    <main class="content">
      <template v-if="!inCouple || ready">
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

    <TransitionGroup tag="div" name="toast" class="toasts" role="status" aria-live="polite">
      <p v-for="toast in toasts" :key="toast.id" class="toast" :class="toast.kind">{{ toast.message }}</p>
    </TransitionGroup>

    <AdminModal :open="!!confirmState" :title="t('common.confirm')" @close="answer(false)">
      <p>{{ question?.message }}</p>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="answer(false)">{{ t('common.cancel') }}</button>
        <button type="button" class="btn" :class="question?.danger ? 'btn-primary' : 'btn-outline'" @click="answer(true)">
          {{ question?.action || t('common.confirm') }}
        </button>
      </template>
    </AdminModal>
  </div>
</template>

<style src="~/assets/css/admin.css"></style>

<style scoped>
.admin { --wrap: 72rem; min-height: 100dvh; background: var(--c-bg); }

.bar {
  position: sticky; top: 0; z-index: var(--z-nav);
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-2) max(1rem, env(safe-area-inset-right)) var(--space-2) max(1rem, env(safe-area-inset-left));
  padding-top: max(var(--space-2), env(safe-area-inset-top));
  background: var(--c-surface); border-bottom: 1px solid var(--c-line-soft);
}
.brand { font-weight: 700; text-decoration: none; color: var(--c-secondary); white-space: nowrap; }
.bar-nav { display: flex; gap: var(--space-1); flex: 1; min-width: 0; }
.bar-link {
  display: inline-flex; align-items: center; min-height: 44px; padding: 0 0.9rem; border-radius: 999px;
  text-decoration: none; color: var(--c-text); font-weight: 500; white-space: nowrap;
  transition: background-color 0.2s, color 0.2s;
}
@media (hover: hover) { .bar-link:hover { background: var(--c-line-soft); } }
.bar-link.active { background: color-mix(in oklab, var(--c-secondary) 10%, transparent); color: var(--c-secondary); }
/* Phones: Couples already leads home, so the name gives its room to the links */
@media (max-width: 520px) { .brand { display: none; } .bar-link { padding: 0 0.7rem; } }

.couple-bar { background: var(--c-surface); border-bottom: 1px solid var(--c-line-soft); }
.couple-inner { max-width: var(--wrap); margin-inline: auto; padding: var(--space-3) max(1rem, env(safe-area-inset-right)) 0 max(1rem, env(safe-area-inset-left)); }
.back { display: inline-flex; align-items: center; gap: var(--space-1); min-height: 44px; font-size: 0.9rem; color: var(--c-muted); text-decoration: none; }
@media (hover: hover) { .back:hover { color: var(--c-secondary); } }
.couple-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2) var(--space-4); }
.couple { min-width: 0; }
.couple-names { font-size: 1.5rem; font-weight: 700; line-height: 1.2; color: var(--c-secondary); text-wrap: balance; }
.couple-date { font-size: 0.88rem; color: var(--c-muted); }

.tabs {
  display: flex; gap: var(--space-1); margin-top: var(--space-3);
  overflow-x: auto; scrollbar-width: none; scroll-padding-inline: var(--space-4); scroll-snap-type: x proximity;
  /* Fades out at both edges, over room of its own, so a tab at rest is never dimmed */
  margin-inline: -1rem; padding-inline: 1rem;
  mask: linear-gradient(90deg, transparent, #000 1rem calc(100% - 1rem), transparent);
}
.tabs::-webkit-scrollbar { display: none; }
.tab {
  flex: none; scroll-snap-align: center; display: inline-flex; align-items: center; gap: var(--space-2);
  min-height: 48px; padding: 0 0.9rem; border-bottom: 3px solid transparent;
  text-decoration: none; color: var(--c-muted); font-weight: 600; white-space: nowrap;
  transition: color 0.2s, border-color 0.2s;
}
@media (hover: hover) { .tab:hover { color: var(--c-text); } }
.tab-n {
  display: grid; place-items: center; width: 1.5rem; height: 1.5rem; border-radius: 50%;
  border: 1.5px solid currentColor; font-size: 0.75rem; font-weight: 600; font-variant-numeric: tabular-nums;
}
.tab.active { color: var(--c-secondary); border-bottom-color: var(--c-secondary); }
.tab.active .tab-n { background: var(--c-secondary); border-color: var(--c-secondary); color: var(--c-on-secondary); }
.tab:focus-visible { outline: 2px solid var(--c-secondary); outline-offset: -2px; }

.content {
  max-width: var(--wrap); margin-inline: auto; min-width: 0;
  padding: var(--space-5) max(1rem, env(safe-area-inset-right)) 0 max(1rem, env(safe-area-inset-left));
}
@media (min-width: 960px) { .content { padding-top: var(--space-6); } }
.step-head { display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-5); max-width: 44rem; }
.step-count { font-size: 0.85rem; font-weight: 500; color: var(--c-accent-ink); }
.step-head h1 { font-size: clamp(1.7rem, 4vw, 2.1rem); line-height: 1.15; color: var(--c-text); }
.step-lead { color: var(--c-muted); max-width: 38rem; }

.toasts { position: fixed; z-index: var(--z-toast); right: 1rem; bottom: max(1rem, env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: var(--space-2); max-width: min(24rem, calc(100vw - 2rem)); }
.toast { padding: 0.7rem 1rem; border-radius: var(--radius); background: var(--c-text); color: var(--c-bg); box-shadow: var(--shadow); font-size: 0.9rem; }
.toast.error { background: var(--c-danger); color: #fff; }
.toast-enter-active { transition: opacity 0.2s var(--ease-out), translate 0.2s var(--ease-out); }
.toast-leave-active { transition: opacity 0.16s var(--ease-out), translate 0.16s var(--ease-out); }
.toast-enter-from, .toast-leave-to { opacity: 0; translate: 0 8px; }
</style>
