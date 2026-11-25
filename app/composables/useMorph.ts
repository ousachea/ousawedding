// Opens or closes a dialog so the picture tapped grows into the one shown, or shrinks back to it
// (styles in base.css). Browsers without view transitions, and reduced motion, just make the change.
type Pic = () => HTMLElement | null | undefined

export function useMorph() {
  return async function morph(from: Pic, change: () => void, to: Pic, ms: number) {
    const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> } }
    if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return change()
    const root = document.documentElement
    root.classList.add('morphing')
    root.style.setProperty('--morph', `${ms}ms`)
    const start = from()
    let end: ReturnType<Pic>
    if (start) start.style.viewTransitionName = 'morph'
    await doc.startViewTransition(async () => {
      if (start) start.style.viewTransitionName = ''
      change()
      await nextTick()
      end = to()
      if (end) end.style.viewTransitionName = 'morph'
    }).finished.catch(() => {})
    if (end) end.style.viewTransitionName = ''
    root.classList.remove('morphing')
  }
}
