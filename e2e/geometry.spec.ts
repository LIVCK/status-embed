import { expect, test } from '@playwright/test'
// @ts-expect-error plain JS helper
import { PNG } from './png.js'

/**
 * Layout guarantees, measured in the browser rather than eyeballed:
 *   - each size has one exact height, the same while loading and once loaded, in every font;
 *   - the host is exactly as tall as the badge (no inline line-box strut under it);
 *   - the dot sits on the optical centre of the text (between cap and x-height) within 1px.
 */

const FONTS = ['system-ui', 'Georgia, serif', 'Arial, sans-serif', '"DejaVu Sans Mono", monospace']
const HEIGHTS: Record<string, Record<string, number>> = {
  badge: { sm: 24, md: 28, lg: 34 },
  button: { sm: 30, md: 36, lg: 42 },
}

test.beforeEach(async ({ page }) => {
  await page.goto('/e2e/pages/measure.html')
  await expect(page.locator('body[data-ready]')).toBeAttached()
})

test('fixed heights per size, loading or loaded, in any font', async ({ page }) => {
  for (const [variant, sizes] of Object.entries(HEIGHTS)) {
    for (const [size, height] of Object.entries(sizes)) {
      for (const font of FONTS) {
        for (const preview of ['operational', null]) {
          const box = await page.evaluate(([variant, size, font, preview]) => {
            const el = (window as any).make({ variant, size, host: 'status.example.com' }, preview, `font-family:${font}`)
            const w = el.shadowRoot.querySelector('.w').getBoundingClientRect()
            return { host: el.getBoundingClientRect().height, w: w.height }
          }, [variant, size, font, preview] as const)
          expect(box, `${variant} ${size} ${font} ${preview ?? 'loading'}`).toEqual({ host: height, w: height })
        }
      }
    }
  }
})

test('the label never spills out of the badge', async ({ page }) => {
  const spill = await page.evaluate(() => {
    const el = (window as any).make({ variant: 'badge', label: 'A very long label that will not fit into the space given', 'powered-by': '' }, 'operational', 'width:180px')
    const root = el.shadowRoot
    const w = root.querySelector('.w').getBoundingClientRect()
    return [...root.querySelectorAll('.txt,.ind,.pw')].map((n: Element) => n.getBoundingClientRect()).some(r => r.right > w.right + 0.5 || r.left < w.left - 0.5)
  })
  expect(spill).toBe(false)
})

test('the dot sits on the optical centre of the text', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium', 'pixel measurement in one engine is enough')
  await page.setViewportSize({ width: 900, height: 600 })
  for (const variant of ['badge', 'button', 'inline']) {
    for (const font of FONTS) {
      const centre: Record<string, { dot: number, ink: number }> = {}
      for (const label of ['HHHH', 'xxxx']) {
        const handle = await page.evaluateHandle(([variant, font, label]) =>
          (window as any).make({ variant, label, 'pulse': 'false', 'color-operational': '#ff0000' }, 'operational', `font-family:${font}`), [variant, font, label] as const)
        const png = PNG(await (handle as any).asElement().screenshot({ scale: 'device' }))
        const dot: number[] = []
        const ink: number[] = []
        for (let y = 0; y < png.h; y++) {
          for (let x = 0; x < png.w; x++) {
            const [r, g, b] = png.px(x, y)
            if (r > 200 && g < 60 && b < 60) dot.push(y)
            else if (r < 90 && g < 90 && b < 90) ink.push(y)
          }
        }
        const mid = (a: number[]) => (Math.min(...a) + Math.max(...a)) / 2
        centre[label] = { dot: mid(dot), ink: mid(ink) }
      }
      const optical = (centre.HHHH!.ink + centre.xxxx!.ink) / 2
      expect(Math.abs(centre.HHHH!.dot - optical), `${variant} ${font}`).toBeLessThanOrEqual(1)
    }
  }
})
