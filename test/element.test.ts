import { beforeAll, describe, expect, it } from 'vitest'
import { define, upgradeLink } from '../src/define'
import type { LivckStatusElement } from '../src/element'
import { snapshot } from './fixtures'

beforeAll(() => define())

function mount(attrs: Record<string, string>, data = snapshot()): LivckStatusElement {
  const el = document.createElement('livck-status') as LivckStatusElement
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.preview = data
  document.body.append(el)
  return el
}

const q = (el: LivckStatusElement, sel: string) => el.shadowRoot!.querySelector<HTMLElement>(sel)

describe('<livck-status>', () => {
  it('shows the page status and links to the page', () => {
    const el = mount({ host: 'status.acme.example', locale: 'de' })
    expect(q(el, '.txt')!.textContent).toBe('Alle Systeme funktionsfähig')
    expect(q(el, '.w')!.dataset.state).toBe('operational')
    expect((q(el, '.main') as HTMLAnchorElement).href).toBe('https://status.acme.example/')
    expect((q(el, '.main') as HTMLAnchorElement).rel).toBe('noopener')
  })

  it('shows one component with component wording', () => {
    const el = mount({ locale: 'en', component: 'web', label: '%name%: %status%' })
    expect(q(el, '.txt')!.textContent).toBe('Website: Under Maintenance')
    expect(q(el, '.w')!.dataset.state).toBe('maintenance')
  })

  it('shows unknown for a component that is not on the page', () => {
    const el = mount({ locale: 'en', component: 'gone' })
    expect(q(el, '.w')!.dataset.state).toBe('unknown')
    expect(q(el, '.txt')!.textContent).toBe('Status')
  })

  it('uses custom texts per state', () => {
    const el = mount({ 'locale': 'de', 'text-major-outage': 'Wir sind dran' }, snapshot('major_outage'))
    expect(q(el, '.txt')!.textContent).toBe('Wir sind dran')
  })

  it('writes names as text, never as markup', () => {
    const evil = snapshot('operational', {
      components: [{ id: 'x', name: '<img src=x onerror=alert(1)>', status: 'operational', is_group: false, group_id: null }],
    })
    const el = mount({ component: 'x', label: '%name%' }, evil)
    expect(q(el, '.txt')!.textContent).toBe('<img src=x onerror=alert(1)>')
    expect(el.shadowRoot!.querySelector('img')).toBeNull()
  })

  it('neutral mode hides the state', () => {
    const el = mount({ locale: 'de', neutral: '' }, snapshot('major_outage'))
    expect(q(el, '.w')!.classList.contains('neutral')).toBe(true)
    expect(q(el, '.w')!.dataset.state).toBe('unknown')
    expect(q(el, '.txt')!.textContent).toBe('Status')
  })

  it('turns colour and length attributes into custom properties', () => {
    const el = mount({ 'color-operational': '#00ff00', 'bg-dark': '#000', 'radius': '4' })
    expect(el.style.getPropertyValue('--livck-operational')).toBe('#00ff00')
    expect(el.style.getPropertyValue('--livck-bg-dark')).toBe('#000')
    expect(el.style.getPropertyValue('--livck-radius')).toBe('4px')
    el.removeAttribute('radius')
    expect(el.style.getPropertyValue('--livck-radius')).toBe('')
  })

  it('dot variant keeps the text for screen readers and as tooltip', () => {
    const el = mount({ variant: 'dot', locale: 'en' })
    expect(q(el, '.txt')!.classList.contains('sr')).toBe(true)
    expect(q(el, '.main')!.title).toBe('All Systems Operational')
  })

  it('adds the optional powered-by link as nofollow', () => {
    const el = mount({ 'powered-by': '', 'locale': 'de' })
    const a = q(el, '.pw a') as HTMLAnchorElement
    expect(a.textContent).toBe('statuspage.de')
    expect(a.rel).toBe('nofollow noopener')
    expect(a.href).toContain('https://statuspage.de/de/')
    expect(mount({}).shadowRoot!.querySelector('.pw')).toBeNull()
  })

  it('renders LIVI as icon or as figure', () => {
    expect(q(mount({ icon: 'livi' }), '.livi-icon')).not.toBeNull()
    const card = mount({ variant: 'livi' }, snapshot('major_outage'))
    expect(card.shadowRoot!.querySelector('svg.livi.st-major')).not.toBeNull()
  })

  it('re-renders on attribute change', () => {
    const el = mount({ locale: 'de' })
    el.setAttribute('locale', 'en')
    expect(q(el, '.txt')!.textContent).toBe('All Systems Operational')
    el.setAttribute('variant', 'button')
    expect(q(el, '.w')!.classList.contains('v-button')).toBe(true)
  })
})

describe('link upgrade', () => {
  it('turns <a data-livck-status> into the element and keeps the link as fallback', () => {
    document.body.innerHTML = '<p><a id="s" class="footer-link" href="https://status.acme.example" data-livck-status data-variant="dot" data-locale="en">Status</a></p>'
    upgradeLink(document.querySelector('a')!)
    const el = document.querySelector('livck-status')!
    expect(el.getAttribute('host')).toBe('https://status.acme.example/')
    expect(el.getAttribute('variant')).toBe('dot')
    expect(el.getAttribute('locale')).toBe('en')
    expect(el.id).toBe('s')
    expect(el.className).toBe('footer-link')
    expect(el.querySelector('a')!.textContent).toBe('Status')
  })
})
