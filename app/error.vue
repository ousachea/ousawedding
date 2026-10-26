<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()
const localePath = useLocalePath()
useHead({ title: props.error.statusCode === 404 ? t('notFound.title') : t('common.error'), meta: [{ name: 'robots', content: 'noindex' }] })
</script>

<template>
  <main class="error">
    <WeddingOrnament kind="flower" />
    <h1>{{ error.statusCode === 404 ? t('notFound.title') : t('common.error') }}</h1>
    <p v-if="error.statusCode === 404">{{ t('notFound.body') }}</p>
    <button type="button" class="btn btn-outline" @click="clearError({ redirect: localePath('/') })">{{ t('nav.home') }}</button>
  </main>
</template>

<style scoped>
.error { min-height: 100dvh; display: grid; place-content: center; justify-items: center; gap: var(--space-4); padding: 1rem; text-align: center; }
h1 { font-size: 2rem; }
p { color: var(--c-muted); max-width: 28rem; }
</style>
