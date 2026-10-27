<script setup lang="ts">
import type { FetchError } from 'ofetch'

definePageMeta({ layout: false })
const { t } = useI18n()
const localePath = useLocalePath()
const password = ref('')
const busy = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await $fetch('/api/auth/local', { method: 'POST', body: { password: password.value } })
    await useAdminSession().load()
    await navigateTo(localePath('/admin'))
  } catch (e) {
    error.value = (e as FetchError).statusCode === 429 ? t('admin.login.rate') : t('admin.login.failed')
  } finally {
    busy.value = false
  }
}

// On this computer no password is needed, so go straight to the dashboard
onMounted(async () => {
  if (await useAdminSession().load()) await navigateTo(localePath('/admin'))
})

useHead({ title: () => `${t('admin.login.title')} · ${t('admin.title')}`, meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
</script>

<template>
  <main class="login">
    <form class="card" @submit.prevent="submit">
      <WeddingOrnament kind="flower" />
      <h1>{{ t('admin.login.title') }}</h1>
      <p class="hint">{{ t('admin.login.localHint') }}</p>
      <div class="field">
        <label for="password">{{ t('admin.login.password') }}</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" required>
      </div>
      <p v-if="error" class="field-error" role="alert">{{ error }}</p>
      <button type="submit" class="btn btn-primary" :disabled="busy">{{ busy ? t('common.loading') : t('admin.login.submit') }}</button>
    </form>
  </main>
</template>

<style scoped>
.login { --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Khmer', sans-serif; --font-heading: var(--font-sans); font-family: var(--font-sans); min-height: 100dvh; display: grid; place-items: center; padding: 1rem; }
.card { width: min(100%, 24rem); display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-6); background: var(--c-surface); border: 1px solid var(--c-line); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); }
h1 { text-align: center; font-size: 1.6rem; font-weight: 600; }
.hint { font-size: 0.85rem; color: var(--c-muted); text-align: center; }
</style>
