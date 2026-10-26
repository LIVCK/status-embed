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

/** true/false for the first mostly opaque background up the tree, null when everything is transparent. */
function backgroundIsDark(start: Element): boolean | null {
  for (let node: Element | null = parentOf(start); node; node = parentOf(node)) {
    const color = parseColor(getComputedStyle(node).backgroundColor)
    if (color && color[3] >= 0.5) return luminance(color) < DARK_BELOW
  }
  return null
}

export function prefersDark(el: Element): boolean {
  const painted = backgroundIsDark(el)
  if (painted !== null) return painted
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
  }
  return () => watchers.delete(callback)
}
