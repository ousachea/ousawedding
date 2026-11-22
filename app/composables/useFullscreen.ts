// Full screen on and off, for browsers that allow it for pages (Android, iPad, desktop). iPhone Safari doesn't,
// so `supported` stays false there. Set up in the browser (init), since the server can't tell.
type Doc = Document & { webkitFullscreenElement?: Element, webkitExitFullscreen?: () => void, webkitFullscreenEnabled?: boolean }
type El = HTMLElement & { webkitRequestFullscreen?: () => void }

export function useFullscreen() {
  const supported = ref(false)
  const on = ref(false)
  const sync = () => (on.value = !!(document.fullscreenElement ?? (document as Doc).webkitFullscreenElement))

  onMounted(() => {
    const doc = document as Doc
    supported.value = !!(doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled)
    sync()
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', sync)
    document.removeEventListener('webkitfullscreenchange', sync)
  })

  function toggle() {
    const doc = document as Doc
    const el = document.documentElement as El
    try {
      if (on.value) {
        if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {})
        else doc.webkitExitFullscreen?.()
      } else if (el.requestFullscreen) {
        el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {})
      } else {
        el.webkitRequestFullscreen?.()
      }
    } catch {}
  }
  return { supported, on, toggle }
}
