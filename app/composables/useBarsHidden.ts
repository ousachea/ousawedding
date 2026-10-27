// Whether the top bar and the bottom bar are tucked away: hidden while scrolling down, shown again when
// scrolling up, near the top of the page, and at the very end. Shared by both bars; one listener for all.
let listening = 0
let last = 0
let frame = 0

export function useBarsHidden() {
  const hidden = useState('bars-hidden', () => false)

  function update() {
    frame = 0
    const y = window.scrollY
    const atEnd = innerHeight + y >= document.documentElement.scrollHeight - 40
    if (y < 80 || atEnd) hidden.value = false
    // Ignore small movements, so a slow drift or a wobbly finger doesn't flicker the bars
    else if (Math.abs(y - last) < 12) return
    else hidden.value = y > last
    last = y
  }
  const onScroll = () => (frame ||= requestAnimationFrame(update))

  onMounted(() => {
    if (listening++) return
    last = window.scrollY
    addEventListener('scroll', onScroll, { passive: true })
  })
  onBeforeUnmount(() => {
    if (--listening) return
    removeEventListener('scroll', onScroll)
    cancelAnimationFrame(frame)
    frame = 0
    hidden.value = false
  })
  return hidden
}
