import { LOCALES, type Locale, STATES, type State, stateAttr } from './states'

export type Variant = 'badge' | 'dot' | 'inline' | 'button'
export type Theme = 'auto' | 'light' | 'dark'
export type Size = 'sm' | 'md' | 'lg'
export type Icon = 'dot' | 'livi' | 'none'

export const VARIANTS: readonly Variant[] = ['badge', 'dot', 'inline', 'button']
export const THEMES: readonly Theme[] = ['auto', 'light', 'dark']
export const SIZES: readonly Size[] = ['sm', 'md', 'lg']
export const ICONS: readonly Icon[] = ['dot', 'livi', 'none']

/** Defaults of every non-colour attribute. The builder leaves an attribute out when it equals its default. */
export const DEFAULTS = {
  variant: 'badge' as Variant,
  theme: 'auto' as Theme,
  size: 'md' as Size,
  icon: 'dot' as Icon,
  locale: 'auto' as 'auto' | Locale,
  label: '%status%',
  target: '_blank',
  interval: 60,
  pulse: true,
  neutral: false,
  'powered-by': false,
  font: 'inherit' as 'inherit' | 'system',
}

export const MIN_INTERVAL = 30
export const MAX_INTERVAL = 3600

/**
 * Colour attributes and the custom property each one sets. Every colour has a `-dark` twin
 * used when the embed renders dark. The same properties can be set from the site's CSS
 * (`livck-status { --livck-operational: … }`); an attribute wins over CSS.
 */
export const COLOR_ATTRIBUTES: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  const base: Record<string, string> = {
    bg: '--livck-bg',
    fg: '--livck-fg',
    'border-color': '--livck-border-color',
    muted: '--livck-muted',
    'color-neutral': '--livck-neutral',
  }
  for (const s of STATES) base[`color-${stateAttr(s)}`] = `--livck-${stateAttr(s)}`
  for (const [attr, prop] of Object.entries(base)) {
    map[attr] = prop
    map[`${attr}-dark`] = `${prop}-dark`
  }
  return map
})()

/** Length attributes: a bare number means px. */
export const LENGTH_ATTRIBUTES: Record<string, string> = {
  radius: '--livck-radius',
  'border-width': '--livck-border-width',
}

/** Per-state text attributes: `text-operational`, and per language `text-operational-de`. */
export const TEXT_ATTRIBUTES: string[] = STATES.flatMap(s => [
  `text-${stateAttr(s)}`,
  ...LOCALES.map(l => `text-${stateAttr(s)}-${l}`),
])

export const ATTRIBUTES: string[] = [
  'host', 'component', ...LOCALES.map(l => `label-${l}`),
  ...Object.keys(DEFAULTS),
  ...Object.keys(COLOR_ATTRIBUTES),
  ...Object.keys(LENGTH_ATTRIBUTES),
  ...TEXT_ATTRIBUTES,
]

export interface Config {
  origin: string | null
  component: string | null
  variant: Variant
  theme: Theme
  size: Size
  icon: Icon
  locale: Locale
  label: string
  target: string
  interval: number
  pulse: boolean
  neutral: boolean
  poweredBy: boolean
  font: 'inherit' | 'system'
  texts: Partial<Record<State, string>>
}

/**
 * `status.example.com`, `https://status.example.com/de` and the like → `https://status.example.com`.
 * Only https; plain http only for localhost, so a page can be developed against a local edge.
 */
export function toOrigin(value: string | null): string | null {
  if (!value) return null
  const raw = value.trim()
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`)
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null
    if (url.username || url.password) return null
    return url.origin
  }
  catch {
    return null
  }
}

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

function flag(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback
  return value !== 'false' && value !== '0' && value !== 'off'
}

function toLocale(lang: string | null | undefined): Locale | null {
  const base = lang?.trim().slice(0, 2).toLowerCase()
  return base && (LOCALES as readonly string[]).includes(base) ? (base as Locale) : null
}

/**
 * `locale="auto"`: the language of the page the badge is on (`lang` of the nearest ancestor,
 * usually <html lang>), because that is the language the site owner writes in. Only a page
 * without a usable `lang` falls back to the visitor's browser language, then English.
 */
export function autoLocale(el: Element): Locale {
  const fromPage = toLocale(el.closest('[lang]')?.getAttribute('lang') ?? document.documentElement.lang)
  if (fromPage) return fromPage
  for (const lang of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const locale = toLocale(lang)
    if (locale) return locale
  }
  return 'en'
}

export function readConfig(el: Element): Config {
  const get = (name: string) => el.getAttribute(name)
  const locale: Locale = toLocale(get('locale')) ?? autoLocale(el)

  const texts: Partial<Record<State, string>> = {}
  for (const s of STATES) {
    const text = get(`text-${stateAttr(s)}-${locale}`) ?? get(`text-${stateAttr(s)}`)
    if (text) texts[s] = text
  }

  const interval = Number.parseInt(get('interval') ?? '', 10)

  return {
    origin: toOrigin(get('host')),
    component: get('component') || null,
    variant: pick(get('variant'), VARIANTS, DEFAULTS.variant),
    theme: pick(get('theme'), THEMES, DEFAULTS.theme),
    size: pick(get('size'), SIZES, DEFAULTS.size),
    icon: pick(get('icon'), ICONS, DEFAULTS.icon),
    locale,
    label: get(`label-${locale}`) || get('label') || DEFAULTS.label,
    target: get('target') === '_self' ? '_self' : DEFAULTS.target,
    interval: Number.isFinite(interval)
      ? Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, interval))
      : DEFAULTS.interval,
    pulse: flag(get('pulse'), DEFAULTS.pulse),
    neutral: flag(get('neutral'), DEFAULTS.neutral),
    poweredBy: flag(get('powered-by'), DEFAULTS['powered-by']),
    font: get('font') === 'system' ? 'system' : 'inherit',
    texts,
  }
}

/** A bare number is px; anything else is passed to CSS as written (CSS drops what it cannot parse). */
export function toLength(value: string): string {
  return /^\d+(\.\d+)?$/.test(value.trim()) ? `${value.trim()}px` : value.trim()
}
