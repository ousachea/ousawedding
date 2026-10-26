<script setup lang="ts">
// Printable cards: guest name, QR code and link, ready for place cards or envelopes.
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const localePath = useLocalePath()
const { base, id, wedding } = useCurrentWedding()
const api = useAdminApi()

const rows = ref<Guest[]>([])
watch(id, async () => {
  rows.value = (await api<{ guests: Guest[] }>(`${base.value}/guests`)).guests
    .filter(g => !g.archived)
    .sort((a, b) => a.name.localeCompare(b.name))
}, { immediate: true })
// Language chosen on the Invitations page; links use the live site address
const locale: Locale = useRoute().query.lang === 'en' ? 'en' : 'km'
const siteUrl = useRuntimeConfig().public.siteUrl
const linkFor = (g: Guest) => (wedding.value ? inviteLink(wedding.value, g.name, siteUrl || location.origin, locale) : '')
const printPage = () => window.print()
</script>

<template>
  <div class="admin-page">
    <div class="page-head no-print">
      <h1>{{ t('admin.invitations.print') }}</h1>
      <div class="page-actions">
        <NuxtLink :to="localePath('/admin/invitations')" class="btn btn-ghost btn-sm">← {{ t('admin.nav.invitations') }}</NuxtLink>
        <button type="button" class="btn btn-primary" @click="printPage">{{ t('admin.invitations.print') }}</button>
      </div>
    </div>
    <p v-if="!rows.length" class="muted">{{ t('admin.invitations.noGuests') }}</p>
    <div class="cards">
      <article v-for="r in rows" :key="r.id" class="card">
        <WeddingOrnament :motif="wedding?.theme.motif" kind="flower" />
        <p class="couple" :lang="locale">{{ wedding?.names[locale].partner1 }} &amp; {{ wedding?.names[locale].partner2 }}</p>
        <p class="guest">{{ r.name }}</p>
        <AdminQrCode :value="linkFor(r)" :size="140" />
        <p class="url">{{ linkFor(r) }}</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.cards { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); }
.card { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-5); border: 1px solid var(--c-line); border-radius: var(--radius); background: var(--c-surface); break-inside: avoid; text-align: center; }
.couple { font-family: var(--font-serif); font-size: 1.2rem; color: var(--c-accent-ink); }
.guest { font-weight: 500; }
.url { font-size: 0.65rem; color: var(--c-muted); word-break: break-all; }
@media print {
  :global(.side), :global(.toasts), .no-print { display: none !important; }
  :global(.admin) { display: block !important; }
  :global(.content) { padding: 0 !important; max-width: none !important; }
  .cards { grid-template-columns: repeat(3, 1fr); gap: 8mm; }
  .card { border-color: #ccc; background: #fff; }
}
</style>
