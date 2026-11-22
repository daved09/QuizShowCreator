// Material ripple: a circle expanding from the pointer position on press.
// One delegated listener covers every element matching SELECTOR; those elements
// need `position: relative; overflow: hidden`. Styles: `.md-ripple` in ui.css.
const SELECTOR = '.btn, .mode-toggle, [data-ripple]'

const spawn = (el: HTMLElement, event: PointerEvent): void => {
  if ((el as HTMLButtonElement).disabled) return
  const rect = el.getBoundingClientRect()
  const size = Math.hypot(rect.width, rect.height) * 2
  const ripple = document.createElement('span')
  ripple.className = 'md-ripple'
  ripple.style.width = ripple.style.height = `${size}px`
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`
  el.appendChild(ripple)
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true })
  // Safety net where animations don't run (reduced motion).
  setTimeout(() => ripple.remove(), 1000)
}

export const installRipple = (root: Document = document): void => {
  root.addEventListener('pointerdown', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const el = target.closest<HTMLElement>(SELECTOR)
    if (el) spawn(el, event)
  })
}
