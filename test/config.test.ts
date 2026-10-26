import { describe, expect, it, vi } from 'vitest'
import { DEFAULTS, MAX_INTERVAL, MIN_INTERVAL, readConfig, toLength, toOrigin } from '../src/config'
import { toState } from '../src/states'

function el(attrs: Record<string, string>): Element {
  const e = document.createElement('div')
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  return e
}

describe('toOrigin', () => {
  it.each([
    ['status.example.com', 'https://status.example.com'],
    ['https://status.example.com', 'https://status.example.com'],
    ['https://status.example.com/de/', 'https://status.example.com'],
    ['  acme.statuspage.de  ', 'https://acme.statuspage.de'],
    ['http://localhost:3000', 'http://localhost:3000'],
  ])('%s → %s', (input, expected) => {
    expect(toOrigin(input)).toBe(expected)
  })

  it.each([
    ['http://status.example.com'],
    ['javascript:alert(1)'],
    ['https://user:pass@status.example.com'],
    ['ftp://status.example.com'],
    [''],
  ])('rejects %s', (input) => {
    expect(toOrigin(input)).toBeNull()
  })
})

describe('readConfig', () => {
  it('falls back to the defaults', () => {
    const c = readConfig(el({ host: 'status.example.com', locale: 'de' }))
    expect(c).toMatchObject({
      origin: 'https://status.example.com',
      variant: DEFAULTS.variant,
      theme: DEFAULTS.theme,
      size: DEFAULTS.size,
      icon: DEFAULTS.icon,
      label: '%status%',
      target: '_blank',
      interval: 60,
      pulse: true,
      neutral: false,
      poweredBy: false,
      component: null,
    })
  })

  it('ignores values it does not know', () => {
    const c = readConfig(el({ variant: 'huge', theme: 'neon', size: 'xl', target: '_top' }))
    expect([c.variant, c.theme, c.size, c.target]).toEqual(['badge', 'auto', 'md', '_blank'])
  })

  it('clamps the poll interval', () => {
    expect(readConfig(el({ interval: '5' })).interval).toBe(MIN_INTERVAL)
    expect(readConfig(el({ interval: '99999' })).interval).toBe(MAX_INTERVAL)
    expect(readConfig(el({ interval: 'soon' })).interval).toBe(60)
  })

  it('reads boolean attributes', () => {
    expect(readConfig(el({ pulse: 'false' })).pulse).toBe(false)
    expect(readConfig(el({ neutral: '' })).neutral).toBe(true)
    expect(readConfig(el({ 'powered-by': '' })).poweredBy).toBe(true)
  })

  it('prefers the per-language text over the general one', () => {
    const attrs = { 'locale': 'en', 'text-operational': 'Alles gut', 'text-operational-en': 'All good', 'text-major-outage': 'Down' }
    const c = readConfig(el(attrs))
    expect(c.texts).toEqual({ operational: 'All good', major_outage: 'Down' })
    expect(readConfig(el({ ...attrs, locale: 'de' })).texts.operational).toBe('Alles gut')
  })
})

describe('toState', () => {
  it('maps component maintenance and never guesses operational', () => {
    expect(toState('under_maintenance')).toBe('maintenance')
    expect(toState('major_outage')).toBe('major_outage')
    expect(toState('fine')).toBe('unknown')
    expect(toState(undefined)).toBe('unknown')
  })
})

describe('toLength', () => {
  it('treats a bare number as px', () => {
    expect(toLength('6')).toBe('6px')
    expect(toLength('0.5rem')).toBe('0.5rem')
  })
})

describe('locale', () => {
  it('follows the page language, nearest lang wins', () => {
    document.documentElement.lang = 'de'
    const section = document.createElement('section')
    section.lang = 'en-GB'
    const inner = document.createElement('div')
    section.append(inner)
    document.body.append(section)
    expect(readConfig(inner).locale).toBe('en')
    expect(readConfig(document.body.appendChild(document.createElement('div'))).locale).toBe('de')
  })

  it('an explicit locale beats the page language', () => {
    document.documentElement.lang = 'de'
    const e = document.body.appendChild(el({ locale: 'en' }))
    expect(readConfig(e).locale).toBe('en')
  })

  it('without a usable page language it takes the browser language', () => {
    document.documentElement.lang = 'fr'
    const spy = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR', 'de-AT', 'en'])
    expect(readConfig(document.body.appendChild(el({}))).locale).toBe('de')
    spy.mockReturnValue(['fr-FR'])
    expect(readConfig(document.body.appendChild(el({}))).locale).toBe('en')
    spy.mockRestore()
  })

  it('picks the label of the shown language', () => {
    const attrs = { 'label': 'Status: %status%', 'label-en': 'Service: %status%' }
    expect(readConfig(el({ ...attrs, locale: 'en' })).label).toBe('Service: %status%')
    expect(readConfig(el({ ...attrs, locale: 'de' })).label).toBe('Status: %status%')
  })
})
