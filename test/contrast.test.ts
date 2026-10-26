import { describe, expect, it } from 'vitest'
import { STATES, stateAttr } from '../src/states'
import { CSS } from '../src/styles'
import { luminance } from '../src/theme'

/** Default of a custom property as written in the stylesheet: `var(--livck-x,#abcdef)`. */
function fallback(prop: string): string {
  const m = CSS.match(new RegExp(`var\\(${prop},#([0-9a-f]{6}|[0-9a-f]{3})\\)`))
  if (!m) throw new Error(`no default for ${prop}`)
  const hex = m[1]!
  return `#${hex.length === 3 ? [...hex].map(c => c + c).join('') : hex}`
}

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(rgb(a)), luminance(rgb(b))]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

describe('default colours', () => {
  for (const suffix of ['', '-dark']) {
    const bg = fallback(`--livck-bg${suffix}`)
    const colours = [...STATES.map(s => stateAttr(s)), 'neutral', 'fg', 'muted']

    it.each(colours)(`%s${suffix} reads on the default background (WCAG AA, 4.5:1)`, (name) => {
      expect(contrast(fallback(`--livck-${name}${suffix}`), bg)).toBeGreaterThanOrEqual(4.5)
    })
  }
})
