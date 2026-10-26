<script setup lang="ts">
// One field edited in both languages side by side.
const model = defineModel<Localized>({ required: true })
defineProps<{ label: string, multiline?: boolean, required?: boolean }>()
const { t } = useI18n()
const uid = useId()
</script>

<template>
  <fieldset class="loc">
    <legend class="label">{{ label }}</legend>
    <div class="pair">
      <div v-for="l in (['km', 'en'] as const)" :key="l" class="field">
        <label :for="`${uid}-${l}`" class="lang-tag">{{ l === 'km' ? t('common.khmer') : t('common.english') }}</label>
        <textarea v-if="multiline" :id="`${uid}-${l}`" v-model="model[l]" :lang="l" rows="3" />
        <input v-else :id="`${uid}-${l}`" v-model="model[l]" :lang="l" type="text" :required="required && l === 'km'">
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.loc { border: 0; padding: 0; margin: 0; min-width: 0; }
.label { font-size: 0.9rem; font-weight: 500; padding: 0; margin-bottom: var(--space-1); }
.pair { display: grid; gap: var(--space-2); }
.pair { grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); }
.lang-tag { font-size: 0.75rem !important; font-weight: 400 !important; color: var(--c-muted); }
</style>
