// Whether the tilt effects (the hero's Polaroids, the floral clusters) follow the phone's gyroscope.
// On by default; a guest can switch it off in the sections menu, and it is remembered on this phone.
type DOE = { requestPermission?: () => Promise<string> }

export function useMotion() {
  const on = useState('motion-on', () => true)
  // Touch screens only: desktops have the API but never send tilt
  const supported = useState('motion-supported', () => false)

  function init() {
    supported.value = 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches
      && !matchMedia('(prefers-reduced-motion: reduce)').matches
    try { if (localStorage.getItem('motion') === 'off') on.value = false } catch {}
  }
  function toggle() {
    on.value = !on.value
    try { localStorage.setItem('motion', on.value ? 'on' : 'off') } catch {}
    // iPhone sends tilt only once allowed, and only from a tap: this is one. Called on the class itself
    // (a detached call is an "Illegal invocation" in Safari).
    const D = window.DeviceOrientationEvent as unknown as DOE | undefined
    if (on.value) D?.requestPermission?.().catch(() => {})
  }
  return { on, supported, init, toggle }
}
