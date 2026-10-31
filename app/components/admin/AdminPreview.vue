<script setup lang="ts">
// Live preview: the real invitation page in an iframe, fed unsaved edits (`draft`, wedding-shaped)
// and scrolled to `section` (an element id on the page, e.g. "home", "rsvp").
const props = defineProps<{ draft: object | null, section: string }>()
const { t } = useI18n()
const { wedding } = useCurrentWedding()

const frame = ref<HTMLIFrameElement>()
const locale = ref<Locale>('en')
const src = computed(() => wedding.value && `${locale.value === 'km' ? '/km' : ''}/${wedding.value.slug}?preview=1`)
function send() {
  if (!props.draft) return
  frame.value?.contentWindow?.postMessage({ type: 'wedding-preview', draft: JSON.parse(JSON.stringify(props.draft)), section: props.section }, location.origin)
}
watch(() => [props.draft, props.section], send, { deep: true })
</script>

<template>
  <details class="preview panel" open>
    <summary>{{ t('admin.settings.preview') }}</summary>
    <select v-model="locale" class="input preview-lang" :aria-label="t('common.language')">
      <option value="km">{{ t('common.khmer') }}</option>
      <option value="en">{{ t('common.english') }}</option>
    </select>
    <iframe v-if="src" ref="frame" :src="src" :title="t('admin.settings.preview')" @load="send" />
  </details>
</template>

<style scoped>
.preview { position: sticky; top: var(--space-3); z-index: 1; display: grid; gap: var(--space-2); padding: var(--space-3); }
.preview summary { font-weight: 600; cursor: pointer; }
.preview-lang { width: auto; justify-self: end; margin-top: calc(-1 * var(--space-6)); }
.preview iframe { width: 100%; height: min(75dvh, 760px); border: 1px solid var(--c-line-soft); border-radius: var(--radius-sm); background: #fff; }
@media (max-width: 1099px) { .preview iframe { height: 45dvh; } }
</style>
