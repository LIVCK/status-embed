/**
 * `theme="auto"`: light or dark, decided by what is actually painted behind the embed.
 *
 * Reading the background beats asking `prefers-color-scheme` alone: a site without a dark
 * mode stays white for a visitor whose OS is dark, and a site with its own theme switch
 * (`.dark` on <html>) may be dark while the OS is light. Both would get the wrong badge.
 */

type Rgba = [number, number, number, number]

function parseColor(value: string): Rgba | null {
  const m = value.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const parts = m[1]!.split(/[\s,/]+/).filter(Boolean).map(Number.parseFloat)
  if (parts.length < 3 || parts.some(Number.isNaN)) return null
  return [parts[0]!, parts[1]!, parts[2]!, parts[3] ?? 1]
}

/** WCAG relative luminance of an sRGB colour (0–255 channels). */
export function luminance([r, g, b]: Rgba | [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Below this luminance white text reads better than black (the two contrasts meet at ~0.179). */
const DARK_BELOW = 0.179

function parentOf(node: Element): Element | null {
  if (node.parentElement) return node.parentElement
  const root = node.getRootNode()
  return root instanceof ShadowRoot ? root.host : null
}

/** The first mostly opaque background up the tree, null when everything is transparent. */
export function paintedBackground(start: Element): Rgba | null {
  for (let node: Element | null = parentOf(start); node; node = parentOf(node)) {
    const color = parseColor(getComputedStyle(node).backgroundColor)
    if (color && color[3] >= 0.5) return color
  }
  return null
}

/** WCAG contrast ratio of two colours. */
export function contrast(a: Rgba | [number, number, number], b: Rgba | [number, number, number]): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * Whether the text colour the embed inherits reads on what is painted behind it (4.5:1). A
 * site that paints a dark section but leaves its text colour dark would otherwise get an
 * unreadable inline badge.
 */
export function inheritedInkReads(el: Element, dark: boolean): boolean {
  const ink = parseColor(getComputedStyle(el).color)
  if (!ink) return true
  const bg = paintedBackground(el) ?? (dark ? [24, 24, 27, 1] as Rgba : [255, 255, 255, 1] as Rgba)
  return contrast(ink, bg) >= 4.5
}

export function prefersDark(el: Element): boolean {
  const bg = paintedBackground(el)
  if (bg) return luminance(bg) < DARK_BELOW
  // Nothing painted: the canvas colour decides, and that follows the root's color-scheme.
  const scheme = getComputedStyle(document.documentElement).colorScheme || ''
  const light = /\blight\b/.test(scheme)
  const dark = /\bdark\b/.test(scheme)
  if (dark && !light) return true
  if (dark && light) return matchMedia('(prefers-color-scheme: dark)').matches
  return false
}

/**
 * Tell every embed when the page may have switched theme or language: any attribute change on
 * <html> or <body> (class, style, data-theme, lang …) or the OS colour preference. One observer
 * for the whole document.
 */
const watchers = new Set<() => void>()
let observer: MutationObserver | null = null

export function watchPage(callback: () => void): () => void {
  watchers.add(callback)
  if (!observer) {
    let queued = false
    const notify = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        for (const w of watchers) w()
      })
    }
    observer = new MutationObserver(notify)
    observer.observe(document.documentElement, { attributes: true })
    if (document.body) observer.observe(document.body, { attributes: true })
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', notify)
    // Sites often fade their background on a theme switch. Right after the class change the
    // background is still the old colour, so look again once a background transition ends.
    const settled = (e: TransitionEvent) => {
      if (e.propertyName.startsWith('background') || e.propertyName === 'color') notify()
    }
    document.addEventListener('transitionend', settled, true)
    document.addEventListener('transitioncancel', settled, true)
  }
  return () => watchers.delete(callback)
}
