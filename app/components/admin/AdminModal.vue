<script setup lang="ts">
// Native <dialog>: focus trapping, Esc to close and inert background come from the browser.
const props = defineProps<{ open: boolean, title: string, wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const el = ref<HTMLDialogElement>()
watch(() => props.open, (v) => {
  if (v && !el.value?.open) show()
  if (!v && el.value?.open) el.value.close()
}, { flush: 'post' })
// Grows out of the button that opened it, and back into it
function show() {
  const from = document.activeElement?.getBoundingClientRect()
  el.value?.showModal()
  const at = el.value?.getBoundingClientRect()
  if (el.value && from && at) el.value.style.transformOrigin = `${from.x + from.width / 2 - at.x}px ${from.y + from.height / 2 - at.y}px`
}
onMounted(() => props.open && show())
</script>

<template>
  <dialog ref="el" class="modal" :class="{ wide }" :aria-label="title" @close="emit('close')">
    <header class="modal-head">
      <h2>{{ title }}</h2>
      <button type="button" class="btn btn-ghost btn-sm" :aria-label="$t('common.close')" @click="emit('close')"><WeddingIcon name="close" /></button>
    </header>
    <div class="modal-body"><slot /></div>
    <footer v-if="$slots.footer" class="modal-foot"><slot name="footer" /></footer>
  </dialog>
</template>

<style scoped>
.modal {
  width: min(100% - 2rem, 34rem); max-height: min(90dvh, 52rem); padding: 0;
  border: 1px solid var(--c-line); border-radius: var(--radius-lg); background: var(--c-bg); color: var(--c-text);
  box-shadow: var(--shadow);
}
.modal.wide { width: min(100% - 2rem, 48rem); }
.modal::backdrop { background: rgb(51 43 41 / 0.4); }
.modal { opacity: 0; scale: 0.95; transition: opacity 0.16s var(--ease-out), scale 0.16s var(--ease-out), overlay 0.16s allow-discrete, display 0.16s allow-discrete; }
.modal[open] { display: flex; flex-direction: column; opacity: 1; scale: 1; transition-duration: 0.2s; }
@starting-style { .modal[open] { opacity: 0; scale: 0.95; } }
.modal-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--c-line-soft); }
.modal-head h2 { font-size: 1.35rem; text-box: trim-both cap alphabetic; }
.modal-body { padding: var(--space-5); overflow-y: auto; overscroll-behavior: contain; mask: linear-gradient(transparent, #000 1rem calc(100% - 1rem), transparent); }
.modal-foot { display: flex; justify-content: flex-end; gap: var(--space-2); padding: var(--space-4) var(--space-5); border-top: 1px solid var(--c-line-soft); }
</style>
