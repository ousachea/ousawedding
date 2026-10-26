import type { Directive } from 'vue'

// v-autosize: fits a textarea's height to its text in browsers without CSS `field-sizing`.
function fit(el: HTMLTextAreaElement) {
  if (CSS.supports('field-sizing', 'content')) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`
}

const autosize: Directive<HTMLTextAreaElement> = {
  mounted: fit,
  updated: fit,
  getSSRProps: () => ({}),
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('autosize', autosize)
})
