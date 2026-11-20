<script setup lang="ts">
// Back and next at the foot of each step. With `form`, next saves that form first (see continueIf).
defineProps<{ form?: string, saving?: boolean, dirty?: boolean }>()
const { t } = useI18n()
const localePath = useLocalePath()
const { prev, next } = useAdminSteps()
</script>

<template>
  <div class="step-nav">
    <NuxtLink v-if="prev" :to="localePath(prev.to)" class="btn btn-ghost">{{ t('admin.stepNav.back') }}</NuxtLink>
    <NuxtLink v-else :to="localePath('/admin/overview')" class="btn btn-ghost">{{ t('admin.nav.overview') }}</NuxtLink>
    <p v-if="dirty" class="unsaved" role="status"><span class="dot" aria-hidden="true" />{{ t('admin.stepNav.unsaved') }}</p>
    <button v-if="form" type="submit" :form="form" :name="next ? 'next' : undefined" class="btn btn-primary" :disabled="saving">
      {{ saving ? t('common.saving') : next ? t('admin.stepNav.saveNext') : t('common.save') }}
    </button>
    <NuxtLink v-else-if="next" :to="localePath(next.to)" class="btn btn-primary">
      {{ t('admin.stepNav.next', { step: t(`admin.steps.${next.key}.title`) }) }}
    </NuxtLink>
    <NuxtLink v-else :to="localePath('/admin/overview')" class="btn btn-primary">{{ t('admin.stepNav.done') }}</NuxtLink>
  </div>
</template>

<style scoped>
/* Stays in reach at the bottom of long forms */
.unsaved { display: flex; align-items: center; gap: var(--space-2); margin: 0 auto 0 0; font-size: 0.9rem; font-weight: 500; color: var(--c-accent-ink); }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c-accent); }
.step-nav {
  position: sticky; bottom: 0; z-index: var(--z-nav);
  display: flex; justify-content: space-between; align-items: center; gap: var(--space-3);
  margin-top: var(--space-2); padding: var(--space-3) 0 max(var(--space-3), env(safe-area-inset-bottom));
  background: var(--c-bg);
  border-top: 1px solid var(--c-line-soft);
}
</style>
