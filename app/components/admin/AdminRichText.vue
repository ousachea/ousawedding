<script setup lang="ts">
// A small formatted-text editor: bold, italic, underline, lists and links. What it saves is cleaned by richText.
// shortcut: document.execCommand (deprecated, but in every browser); move to an editor library if more than this is needed.
const model = defineModel<string>({ required: true })
defineProps<{ label: string, lang: Locale }>()
const { t } = useI18n()
const el = ref<HTMLElement>()
const state = reactive<Record<string, boolean>>({})
const tools = [
  { cmd: 'bold', icon: 'bold' }, { cmd: 'italic', icon: 'italic' }, { cmd: 'underline', icon: 'underline' },
  { cmd: 'insertUnorderedList', icon: 'list' }, { cmd: 'insertOrderedList', icon: 'numbers' }, { cmd: 'createLink', icon: 'link' },
] as const

// Only refilled when the text changes from outside: refilling while typing would move the cursor
let last = ''
function fill() {
  if (!el.value || model.value === last) return
  last = model.value
  el.value.innerHTML = richText(last)
}
onMounted(fill)
watch(model, fill)

function changed() {
  last = richText(el.value!.innerHTML)
  model.value = last
  mark()
}
// Lights up the buttons that apply where the cursor is
function mark() {
  for (const { cmd } of tools) if (cmd !== 'createLink') state[cmd] = document.queryCommandState(cmd)
}
function run(cmd: string) {
  el.value!.focus()
  let value = ''
  if (cmd === 'createLink') {
    const inLink = window.getSelection()?.anchorNode?.parentElement?.closest('a')
    value = prompt(t('admin.rich.linkPrompt'), inLink?.getAttribute('href') ?? 'https://')?.trim() ?? ''
    if (!value || value === 'https://') return
    if (!/^(https?:\/\/|mailto:|tel:)/i.test(value)) value = `https://${value}`
  }
  document.execCommand(cmd, false, value)
  changed()
}
// Pasted as plain words, without another site's styling
const paste = (e: ClipboardEvent) => document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') ?? '')
const start = () => document.execCommand('defaultParagraphSeparator', false, 'p')
</script>

<template>
  <div class="rich">
    <div class="tools" role="group" :aria-label="t('admin.rich.tools')">
      <!-- mousedown.prevent: pressing a button must not take the selection out of the text -->
      <button v-for="b in tools" :key="b.cmd" type="button" class="tool" :aria-pressed="b.cmd === 'createLink' ? undefined : !!state[b.cmd]" :aria-label="t(`admin.rich.${b.icon}`)" :title="t(`admin.rich.${b.icon}`)" @mousedown.prevent @click="run(b.cmd)">
        <WeddingIcon :name="b.icon" />
      </button>
    </div>
    <div ref="el" class="text" contenteditable="true" role="textbox" aria-multiline="true" :aria-label="label" :lang="lang" @focus="start" @input="changed" @keyup="mark" @mouseup="mark" @paste.prevent="paste" />
  </div>
</template>

<style scoped>
.rich { display: flex; flex-direction: column; flex-grow: 1; border: 1px solid var(--c-line); border-radius: var(--radius-sm); background: var(--c-surface); transition: border-color 0.15s, box-shadow 0.15s; }
.rich:focus-within { border-color: var(--c-accent); box-shadow: 0 0 0 3px color-mix(in oklab, var(--c-accent) 25%, transparent); }
.tools { display: flex; flex-wrap: wrap; gap: 2px; padding: 2px; border-bottom: 1px solid var(--c-line-soft); }
.tool { display: grid; place-items: center; width: 40px; height: 40px; padding: 0; border: 0; border-radius: 4px; background: none; color: var(--c-text); cursor: pointer; transition: background-color 0.15s, scale 0.12s var(--ease-out); }
.tool .icon { stroke-width: 2; }
.tool[aria-pressed='true'] { background: color-mix(in oklab, var(--c-secondary) 12%, transparent); color: var(--c-secondary); }
.tool:active { scale: 0.97; }
.tool:focus-visible { outline-offset: -2px; }
@media (hover: hover) { .tool:hover { background: var(--c-line-soft); } }
@media (pointer: coarse) { .tool { width: 44px; height: 44px; } }
.text { flex-grow: 1; min-height: 5rem; padding: 0.55rem 0.8rem; font-size: 1rem; overflow-wrap: anywhere; outline: none; }
.text :deep(:is(ul, ol)) { margin: 0.3em 0; padding-left: 1.4em; }
.text :deep(a) { color: var(--c-secondary); }
</style>
