<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { me } = useAdminSession()
const { list, id, wedding, select, loadList } = useCurrentWedding()
const { toasts } = useToasts()
const { state: confirmState } = useConfirm()
const { push } = useToasts()
const api = useAdminApi()
const menuOpen = ref(false)

const links = computed(() => [
  { to: '/admin', label: t('admin.nav.dashboard') },
  { to: '/admin/guests', label: t('admin.nav.guests') },
  { to: '/admin/invitations', label: t('admin.nav.invitations') },
  { to: '/admin/events', label: t('admin.nav.events') },
  { to: '/admin/gallery', label: t('admin.nav.gallery') },
  { to: '/admin/settings', label: t('admin.nav.settings') },
])
watch(() => route.path, () => (menuOpen.value = false))

onMounted(() => { if (!list.value.length) loadList() })

async function createWedding() {
  const slug = window.prompt(t('admin.wedding.slugPrompt'))?.trim().toLowerCase()
  if (!slug) return
  const created = await api<Wedding>('/api/admin/weddings', { method: 'POST', body: { slug } })
  await loadList()
  await select(created.id)
  push(t('common.saved'))
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
        <span class="brand">{{ t('admin.title') }}</span>
        <button type="button" class="btn btn-ghost btn-sm menu-btn" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
          {{ t('admin.nav.menu') }}
        </button>
      </div>
      <div class="side-body">
        <div class="field wedding-select">
          <label for="wedding-select">{{ t('admin.wedding.select') }}</label>
          <select v-if="list.length" id="wedding-select" :value="id" @change="select(($event.target as HTMLSelectElement).value)">
            <option v-for="w in list" :key="w.id" :value="w.id">{{ w.names.en.partner1 }} & {{ w.names.en.partner2 }} · {{ w.date.slice(0, 10) }}</option>
          </select>
          <p v-else class="muted small">{{ t('admin.wedding.none') }}</p>
          <button v-if="me?.role === 'owner'" type="button" class="btn btn-ghost btn-sm" @click="createWedding">+ {{ t('admin.wedding.create') }}</button>
        </div>
        <nav class="links" :aria-label="t('admin.nav.menu')">
          <NuxtLink v-for="l in links" :key="l.to" :to="localePath(l.to)" class="link" :class="{ active: route.path === localePath(l.to) }">
            {{ l.label }}
          </NuxtLink>
        </nav>
        <div class="side-foot">
          <a v-if="wedding" :href="localePath(`/wedding/${wedding.slug}`)" target="_blank" rel="noopener" class="link">{{ t('admin.nav.viewSite') }} ↗</a>
          <WeddingLanguageSwitcher />
          <p v-if="me" class="muted small">{{ me.email }}</p>
          <button type="button" class="btn btn-outline btn-sm" @click="logout">{{ t('admin.nav.logout') }}</button>
        </div>
      </div>
    </aside>

    <main class="content">
      <slot v-if="wedding" />
      <p v-else-if="list.length" class="muted">{{ t('common.loading') }}</p>
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
.admin { min-height: 100dvh; display: grid; grid-template-columns: 1fr; }
.side { background: var(--c-surface); border-bottom: 1px solid var(--c-line-soft); }
.side-head { display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); padding-top: max(var(--space-3), env(safe-area-inset-top)); }
.brand { font-family: var(--font-serif); font-size: 1.3rem; color: var(--c-secondary); }
.side-body { display: none; flex-direction: column; gap: var(--space-5); padding: var(--space-2) var(--space-4) var(--space-5); }
.side.open .side-body { display: flex; }
.wedding-select { gap: var(--space-2); }
.links { display: flex; flex-direction: column; gap: 2px; }
.link { padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); text-decoration: none; color: var(--c-text); }
.link:hover { background: var(--c-line-soft); }
.link.active { background: color-mix(in srgb, var(--c-secondary) 9%, transparent); color: var(--c-secondary); font-weight: 500; }
.side-foot { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-3); }
.content { padding: var(--space-5) max(1rem, env(safe-area-inset-right)) var(--space-7) max(1rem, env(safe-area-inset-left)); min-width: 0; }

@media (min-width: 960px) {
  .admin { grid-template-columns: 16rem 1fr; }
  .side { border-bottom: 0; border-right: 1px solid var(--c-line-soft); position: sticky; top: 0; height: 100dvh; overflow-y: auto; }
  .menu-btn { display: none; }
  .side-body { display: flex; }
  .content { padding: var(--space-6) var(--space-6) var(--space-7); max-width: 80rem; }
}

.toasts { position: fixed; z-index: var(--z-toast); right: 1rem; bottom: max(1rem, env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: var(--space-2); max-width: min(24rem, calc(100vw - 2rem)); }
.toast { padding: 0.7rem 1rem; border-radius: var(--radius); background: var(--c-text); color: var(--c-bg); box-shadow: var(--shadow); font-size: 0.9rem; animation: in 0.2s var(--ease-out); }
.toast.error { background: var(--c-danger); color: #fff; }
@keyframes in { from { opacity: 0; transform: translateY(8px); } }
</style>
