import { expect, type Page, test } from '@playwright/test'

const STATUS = 'http://localhost:4174'
const set = (q: string) => fetch(`${STATUS}/__set?${q}`)
const paths = async () => ((await (await fetch(`${STATUS}/__log`)).json()) as Array<{ path: string }>).map(r => r.path)

function read(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const w = el.shadowRoot!.querySelector<HTMLElement>('.w')!
    return { text: el.shadowRoot!.querySelector('.txt')!.textContent, lang: w.lang, state: w.dataset.state }
  })
}

test.beforeEach(async () => {
  await set('state=operational&cors=1&reset=1')
})

test('speaks the language of the page, names included', async ({ page }) => {
  await page.goto('/e2e/pages/lang.html')
  await expect.poll(async () => (await read(page, '#page')).text).toBe('All Systems Operational')
  expect(await read(page, '#page')).toMatchObject({ lang: 'en' })
  expect((await read(page, '#comp')).text).toBe('Website: Operational')
  expect(await read(page, '#nested')).toMatchObject({ text: 'Alle Systeme funktionsfähig', lang: 'de' })
  expect((await read(page, '#labels')).text).toBe('Our status: All Systems Operational')
  // one request per language, no matter how many badges
  expect((await paths()).sort()).toEqual(['/de/status.json', '/en/status.json'])
})

test('follows the page switching its language', async ({ page }) => {
  await page.goto('/e2e/pages/lang.html')
  await expect.poll(async () => (await read(page, '#comp')).text).toBe('Website: Operational')
  await page.evaluate(() => { document.documentElement.lang = 'de' })
  await expect.poll(async () => (await read(page, '#comp')).text).toBe('Webseite: Funktionsfähig')
  expect((await read(page, '#labels')).text).toBe('Unser Status: Alle Systeme funktionsfähig')
})

test('a language the status page does not offer falls back to its default, once', async ({ page }) => {
  await set('locales=de')
  await page.goto('/e2e/pages/lang.html')
  // texts in the page's language, names in the status page's default language
  await expect.poll(async () => (await read(page, '#comp')).text).toBe('Webseite: Operational')
  expect((await read(page, '#page')).state).toBe('operational')
  expect((await paths()).sort()).toEqual(['/de/status.json', '/en/status.json', '/status.json'])
})
