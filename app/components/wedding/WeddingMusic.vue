<script setup lang="ts">
// Off by default; only a tap starts playback.
defineProps<{ src: string }>()
const { t } = useI18n()
const audio = ref<HTMLAudioElement>()
const playing = ref(false)

async function toggle() {
  if (!audio.value) return
  if (playing.value) {
    audio.value.pause()
  } else {
    try { await audio.value.play() } catch { return }
  }
}
</script>

<template>
  <button type="button" class="music" :aria-pressed="playing" :aria-label="playing ? t('music.pause') : t('music.play')" @click="toggle">
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
      <path v-if="!playing" d="M3 3l18 18" />
    </svg>
    <audio ref="audio" :src="src" loop preload="none" @play="playing = true" @pause="playing = false" />
  </button>
</template>

<style scoped>
.music {
  width: 40px; height: 40px; display: grid; place-items: center;
  border: 1px solid var(--c-line); border-radius: 50%; background: var(--c-surface); color: var(--c-accent-ink); cursor: pointer;
}
.music[aria-pressed='true'] { color: var(--c-secondary); border-color: var(--c-secondary); }
</style>
