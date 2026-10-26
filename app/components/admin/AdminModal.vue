<script setup lang="ts">
// Native <dialog>: focus trapping, Esc to close and inert background come from the browser.
const props = defineProps<{ open: boolean, title: string, wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const el = ref<HTMLDialogElement>()
watch(() => props.open, (v) => {
  if (v && !el.value?.open) el.value?.showModal()
  if (!v && el.value?.open) el.value.close()
}, { flush: 'post' })
onMounted(() => props.open && el.value?.showModal())
</script>

<template>
  <dialog ref="el" class="modal" :class="{ wide }" :aria-label="title" @close="emit('close')">
    <header class="modal-head">
      <h2>{{ title }}</h2>
      <button type="button" class="btn btn-ghost btn-sm" :aria-label="$t('common.close')" @click="emit('close')">✕</button>
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
.modal[open] { display: flex; flex-direction: column; animation: pop 0.18s var(--ease-out); }
@keyframes pop { from { opacity: 0; transform: translateY(6px) scale(0.98); } }
.modal-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--c-line-soft); }
.modal-head h2 { font-size: 1.35rem; }
.modal-body { padding: var(--space-5); overflow-y: auto; }
.modal-foot { display: flex; justify-content: flex-end; gap: var(--space-2); padding: var(--space-4) var(--space-5); border-top: 1px solid var(--c-line-soft); }
</style>
