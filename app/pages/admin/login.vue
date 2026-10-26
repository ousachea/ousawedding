<script setup lang="ts">
import type { FetchError } from 'ofetch'

definePageMeta({ layout: false })
const { t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig().public
const isLocal = config.driver === 'local'
const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  busy.value = true
  try {
    if (isLocal) {
      await $fetch('/api/auth/local', { method: 'POST', body: { password: password.value } })
    } else {
      // Loaded only on this page, so guests never download the Firebase SDK
      const { initializeApp, getApps } = await import('firebase/app')
      const { getAuth, signInWithEmailAndPassword, signOut, inMemoryPersistence, setPersistence } = await import('firebase/auth')
      const app = getApps()[0] ?? initializeApp(config.firebase)
      const auth = getAuth(app)
      // The httpOnly session cookie is the only credential kept
      await setPersistence(auth, inMemoryPersistence)
      const cred = await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
      const idToken = await cred.user.getIdToken()
      try {
        await $fetch('/api/auth/session', { method: 'POST', body: { idToken } })
      } finally {
        await signOut(auth)
      }
    }
    await useAdminSession().load()
    await navigateTo(localePath('/admin'))
  } catch (e) {
    error.value = (e as FetchError).statusCode === 403 ? t('admin.login.notAdmin') : t('admin.login.failed')
  } finally {
    busy.value = false
  }
}

useHead({ title: () => `${t('admin.login.title')} · ${t('admin.title')}`, meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
</script>

<template>
  <main class="login">
    <form class="card" @submit.prevent="submit">
      <WeddingOrnament kind="flower" />
      <h1>{{ t('admin.login.title') }}</h1>
      <p v-if="isLocal" class="hint">{{ t('admin.login.localHint') }}</p>
      <div v-if="!isLocal" class="field">
        <label for="email">{{ t('admin.login.email') }}</label>
        <input id="email" v-model="email" type="email" autocomplete="username" required>
      </div>
      <div class="field">
        <label for="password">{{ t('admin.login.password') }}</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" required>
      </div>
      <p v-if="error" class="field-error" role="alert">{{ error }}</p>
      <button type="submit" class="btn btn-primary" :disabled="busy">{{ busy ? t('common.loading') : t('admin.login.submit') }}</button>
      <WeddingLanguageSwitcher class="lang" />
    </form>
  </main>
</template>

<style scoped>
.login { min-height: 100dvh; display: grid; place-items: center; padding: 1rem; }
.card { width: min(100%, 24rem); display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-6); background: var(--c-surface); border: 1px solid var(--c-line); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); }
h1 { text-align: center; font-size: 1.8rem; }
.hint { font-size: 0.85rem; color: var(--c-muted); text-align: center; }
.lang { align-self: center; }
</style>
