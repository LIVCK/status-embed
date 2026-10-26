import { expect, type Page, test } from '@playwright/test'

const STATUS = 'http://localhost:4174'

async function setStatus(params: Record<string, string>) {
  await fetch(`${STATUS}/__set?${new URLSearchParams(params)}`)
}

async function statusLog(): Promise<Array<{ method: string, path: string, origin: string | null, cookie: string | null, referer: string | null }>> {
  return (await fetch(`${STATUS}/__log`)).json()
}

/** Text and state of one embed, read through its shadow root. */
function read(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const root = el.shadowRoot!
    const w = root.querySelector<HTMLElement>('.w')!
    return {
      text: root.querySelector('.txt')?.textContent ?? '',
      state: w.dataset.state,
      dark: w.classList.contains('dark'),
      pending: w.classList.contains('pending'),
      href: root.querySelector('a')?.getAttribute('href'),
    }
  })
}

test.beforeEach(async () => {
  await setStatus({ state: 'operational', cors: '1', reset: '1' })
})

test('loads the status cross-origin with one plain GET for all embeds', async ({ page }) => {
  await page.goto('/e2e/pages/basic.html')
  await expect.poll(async () => (await read(page, '#link')).text).toBe('Alle Systeme funktionsfähig')
  expect(await read(page, '#el')).toMatchObject({ text: 'All Systems Operational', state: 'operational' })
  expect(await read(page, '#comp')).toMatchObject({ text: 'API: Degraded', state: 'degraded' })

  const log = await statusLog()
  // three embeds, loaded twice over: still a single request, and no CORS preflight
  expect(log.map(r => r.method)).toEqual(['GET'])
  expect(log[0]).toMatchObject({ origin: 'http://127.0.0.1:4173', cookie: null, referer: null })
})

test('the link form keeps the original link as no-JS fallback', async ({ page }) => {
  await page.goto('/e2e/pages/basic.html')
  const el = page.locator('livck-status').first()
  await expect(el).toHaveAttribute('host', 'http://localhost:4174/')
  await expect(el.locator('a#link, a[data-livck-status]')).toHaveText('Status')
  expect((await read(page, '#link')).href).toBe('http://localhost:4174')
})

test('without CORS the embed stays a neutral "Status" link and never claims a state', async ({ page }) => {
  await setStatus({ cors: '0' })
  await page.goto('/e2e/pages/basic.html')
  await expect.poll(async () => (await statusLog()).length).toBeGreaterThan(0)
  await page.waitForTimeout(300)
  expect(await read(page, '#el')).toMatchObject({ text: 'Status', state: 'unknown', pending: true })
})

test('works under a strict CSP without errors', async ({ page }) => {
  const violations: string[] = []
  // Only real policy violations of the page; the browser's own favicon request is not ours.
  page.on('console', (m) => {
    if (m.text().startsWith('CSP ') && !m.text().endsWith('/favicon.ico')) violations.push(m.text())
  })
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', e => console.error(`CSP ${e.violatedDirective} ${e.blockedURI}`))
  })
  await page.goto('/e2e/pages/csp.html')
  await expect.poll(async () => (await read(page, 'livck-status')).text).toBe('Alle Systeme funktionsfähig')

  const styled = await page.locator('livck-status').evaluate((el) => {
    const root = el.shadowRoot!
    const w = getComputedStyle(root.querySelector('.w')!)
    return {
      radius: w.borderTopLeftRadius,
      dot: getComputedStyle(root.querySelector('.ind')!).backgroundColor,
      display: w.display,
    }
  })
  expect(styled).toEqual({ radius: '4px', dot: 'rgb(18, 52, 86)', display: 'flex' })
  expect(violations).toEqual([])
})

test('follows state changes on the next poll', async ({ page }) => {
  await page.clock.install()
  await page.goto('/e2e/pages/basic.html')
  await expect.poll(async () => (await read(page, '#el')).state).toBe('operational')
  await setStatus({ state: 'major_outage' })
  // Step the clock a second at a time: one 70 s jump would also expire the request's own
  // timeout before Firefox/WebKit have sent it.
  for (let s = 0; s < 70 && (await statusLog()).length < 2; s++) {
    await page.clock.runFor(1000)
    await page.waitForTimeout(20)
  }
  await expect.poll(async () => (await read(page, '#el')).state).toBe('major_outage')
  expect((await read(page, '#el')).text).toBe('Major System Outage')
})

test.describe('theme auto', () => {
  test('reads the painted background, not just the OS preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/e2e/pages/dark.html')
    await expect.poll(async () => (await read(page, '#onDark')).state).toBe('operational')
    expect((await read(page, '#onDark')).dark).toBe(true)
    expect((await read(page, '#onLight')).dark).toBe(false)
    expect((await read(page, '#forced')).dark).toBe(false)
  })

  test('a light site stays light for a visitor with a dark OS', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/e2e/pages/basic.html')
    await expect.poll(async () => (await read(page, '#el')).state).toBe('operational')
    expect((await read(page, '#el')).dark).toBe(false)
  })

  test('follows the site switching its own theme', async ({ page }) => {
    await page.goto('/e2e/pages/toggle.html')
    await expect.poll(async () => (await read(page, '#t')).state).toBe('operational')
    expect((await read(page, '#t')).dark).toBe(false)
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await expect.poll(async () => (await read(page, '#t')).dark).toBe(true)
    await page.evaluate(() => document.documentElement.classList.remove('dark'))
    await expect.poll(async () => (await read(page, '#t')).dark).toBe(false)
  })
})

test('an embed far below the fold loads only when the visitor gets close', async ({ page }) => {
  await page.goto('/e2e/pages/lazy.html')
  await page.waitForTimeout(500)
  expect(await statusLog()).toEqual([])
  await page.locator('#far').scrollIntoViewIfNeeded()
  await expect.poll(async () => (await read(page, '#far')).state).toBe('operational')
  expect((await statusLog()).length).toBe(1)
})

test('gallery', async ({ page }, info) => {
  await page.goto('/e2e/pages/gallery.html')
  await expect(page.locator('body[data-ready]')).toBeAttached()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `test-results/gallery-${info.project.name}.png`, fullPage: true })
})
