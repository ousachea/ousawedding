<script setup lang="ts">
import QRCode from 'qrcode'

const props = withDefaults(defineProps<{ value: string, size?: number }>(), { size: 200 })
const svg = ref('')
watchEffect(async () => {
  svg.value = props.value
    ? await QRCode.toString(props.value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#332B29', light: '#FFFFFF' } })
    : ''
})
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- SVG generated locally from our own URL -->
  <div class="qr" :style="{ width: `${size}px` }" role="img" :aria-label="value" v-html="svg" />
</template>

<style scoped>
.qr :deep(svg) { display: block; width: 100%; height: auto; }
</style>
