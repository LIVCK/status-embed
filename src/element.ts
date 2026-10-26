import { ATTRIBUTES, COLOR_ATTRIBUTES, type Config, LENGTH_ATTRIBUTES, readConfig, toLength } from './config'
import { feedFor } from './feed'
import { LIVI_ICON } from './livi'
import { resolve, type Resolved, type Snapshot } from './snapshot'
import { type State, TEXTS } from './states'
import { CSS } from './styles'
import { inheritedInkReads, prefersDark, watchPage } from './theme'

let sheet: CSSStyleSheet | null = null

function attachStyles(root: ShadowRoot): void {
  try {
    if (!sheet) {
      sheet = new CSSStyleSheet()
      sheet.replaceSync(CSS)
    }
    root.adoptedStyleSheets = [sheet]
  }
  catch {
    // No constructable stylesheets (older Safari): one <style> per instance.
    const style = document.createElement('style')
    style.textContent = CSS
    root.append(style)
  }
}

const POWERED_BY = 'statuspage.de'

/**
 * `<livck-status host="status.example.com">` — the live status of a public LIVCK status page.
 *
 * Renders in a shadow root: the site's CSS cannot break it, and it cannot leak into the site.
 * Everything visual is still reachable from outside through `--livck-*` custom properties and
 * the parts `base`, `link`, `indicator`, `label`, `powered-by`.
 */
export class LivckStatusElement extends HTMLElement {
  /** Version of this script, e.g. for support: `customElements.get('livck-status').version`. */
  static readonly version: string = __VERSION__

  static get observedAttributes(): string[] {
    return ATTRIBUTES
  }

  #root: ShadowRoot
  #config: Config
  #data: Resolved | null = null
  #previewSnapshot: Snapshot | null = null
  #unsubscribe: (() => void) | null = null
  #unwatchTheme: (() => void) | null = null
  #visibility: IntersectionObserver | null = null
  #dark = false
  #rendered = ''

  constructor() {
    super()
    this.#root = this.attachShadow({ mode: 'open' })
    attachStyles(this.#root)
    this.#config = readConfig(this)
  }

  /**
   * Show a fixed snapshot instead of fetching (used by the badge builder's preview).
   * A property, not an attribute: markup cannot pin a status.
   */
  get preview(): Snapshot | null {
    return this.#previewSnapshot
  }

  set preview(snapshot: Snapshot | null) {
    this.#previewSnapshot = snapshot
    if (this.isConnected) this.#connect()
  }

  connectedCallback(): void {
    this.#config = readConfig(this)
    this.#applyStyleAttributes()
    this.#unwatchTheme ??= watchPage(() => this.#pageChanged())
    this.#connect()
  }

  disconnectedCallback(): void {
    this.#disconnect()
    this.#unwatchTheme?.()
    this.#unwatchTheme = null
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue || !this.isConnected) return
    const before = this.#config
    this.#config = readConfig(this)
    if (name in COLOR_ATTRIBUTES || name in LENGTH_ATTRIBUTES) {
      this.#applyStyleAttributes()
      return
    }
    if (before.origin !== this.#config.origin || before.locale !== this.#config.locale || before.interval !== this.#config.interval || before.component !== this.#config.component) {
      this.#connect()
    }
    else {
      this.#render()
    }
  }

  /** (Re)start the data source: the preview snapshot, or the shared feed once the embed is near the viewport. */
  #connect(): void {
    this.#disconnect()
    this.#data = null
    if (this.#previewSnapshot) {
      this.#data = resolve(this.#previewSnapshot, this.#config.component)
      this.#render()
      return
    }
    this.#render()
    const origin = this.#config.origin
    if (!origin) return

    const start = () => {
      this.#visibility?.disconnect()
      this.#visibility = null
      this.#unsubscribe = feedFor(origin, this.#config.locale).subscribe({
        interval: this.#config.interval,
        onData: (snapshot) => {
          this.#data = resolve(snapshot, this.#config.component)
          this.#render()
        },
        // Keep the last good state; without one the embed stays the neutral "Status" link.
        onError: () => {},
      })
    }

    // Embeds far below the fold (footers) fetch nothing until the visitor gets close.
    if ('IntersectionObserver' in window) {
      this.#visibility = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) start()
      }, { rootMargin: '400px' })
      this.#visibility.observe(this)
    }
    else {
      start()
    }
  }

  #disconnect(): void {
    this.#visibility?.disconnect()
    this.#visibility = null
    this.#unsubscribe?.()
    this.#unsubscribe = null
  }

  #applyStyleAttributes(): void {
    for (const [attr, prop] of Object.entries(COLOR_ATTRIBUTES)) {
      const value = this.getAttribute(attr)
      if (value) this.style.setProperty(prop, value.trim())
      else this.style.removeProperty(prop)
    }
    for (const [attr, prop] of Object.entries(LENGTH_ATTRIBUTES)) {
      const value = this.getAttribute(attr)
      if (value) this.style.setProperty(prop, toLength(value))
      else this.style.removeProperty(prop)
    }
  }

  #isDark(): boolean {
    if (this.#config.theme === 'auto') return prefersDark(this)
    return this.#config.theme === 'dark'
  }

  /** The page switched theme or language: follow it where the embed is set to `auto`. */
  #pageChanged(): void {
    const locale = readConfig(this).locale
    if (locale !== this.#config.locale) {
      this.#config = readConfig(this)
      this.#connect()
      return
    }
    this.#updateTheme()
  }

  #updateTheme(): void {
    const w = this.#root.querySelector('.w')
    if (!w) return
    this.#dark = this.#isDark()
    w.classList.toggle('dark', this.#dark)
    this.#updateInk(w)
  }

  /** inline: the site's text colour if it reads on the background, the theme's otherwise. */
  #updateInk(w: Element): void {
    w.classList.toggle('ink', this.#config.variant === 'inline' && !inheritedInkReads(this, this.#dark))
  }

  /** The label: `%status%` and `%name%` filled in. No state (loading, failed, neutral) reads "Status". */
  #text(state: State | null): string {
    const c = this.#config
    const texts = TEXTS[c.locale]
    const statusText = state
      ? c.texts[state] ?? (c.component ? texts.component : texts.page)[state]
      : texts.pending
    return c.label
      .replaceAll('%status%', statusText)
      .replaceAll('%name%', this.#data?.name ?? '')
      .trim() || statusText
  }

  #render(): void {
    const c = this.#config
    const state: State | null = this.#data?.state ?? null
    const pending = !this.#data
    const href = this.#data?.url ?? c.origin ?? '#'
    const label = this.#text(c.neutral ? null : state)

    // Structure only changes with variant/icon/powered-by/target; everything else is patched in place.
    const shape = `${c.variant}|${c.icon}|${c.poweredBy}|${c.target}`
    if (shape !== this.#rendered) {
      this.#rendered = shape
      this.#build()
    }

    this.#dark = this.#isDark()
    const w = this.#root.querySelector<HTMLElement>('.w')!
    w.className = [
      'w', `v-${c.variant}`, c.size,
      this.#dark ? 'dark' : '',
      c.neutral ? 'neutral' : '',
      pending ? 'pending' : '',
      c.pulse ? 'pulse' : '',
      c.font === 'system' ? 'system' : '',
    ].filter(Boolean).join(' ')
    w.dataset.state = c.neutral || !state ? 'unknown' : state
    w.lang = c.locale
    this.#updateInk(w)

    const link = this.#root.querySelector<HTMLAnchorElement>('.main')!
    link.href = href
    link.target = c.target
    link.rel = c.target === '_blank' ? 'noopener' : ''
    link.title = c.variant === 'dot' ? label : ''

    const text = this.#root.querySelector<HTMLElement>('.txt')!
    if (text.textContent !== label) text.textContent = label
    // Announce changes, not the first load: a live region that appears with its text already
    // in place stays silent, so it is switched on only once real data is shown.
    if (this.#data && !this.#previewSnapshot) text.setAttribute('aria-live', 'polite')

    const powered = this.#root.querySelector<HTMLAnchorElement>('.pw a')
    if (powered) powered.href = `https://statuspage.de/${c.locale}/?utm_source=status-embed&utm_medium=${c.variant}`
  }

  #build(): void {
    const c = this.#config
    const w = this.#root.querySelector('.w') ?? document.createElement('span')
    w.className = 'w'
    w.setAttribute('part', 'base')
    w.replaceChildren()

    const link = document.createElement('a')
    link.className = 'main'
    link.setAttribute('part', 'link')

    let indicator: Element | null = null
    if (c.icon === 'livi') {
      indicator = template(LIVI_ICON)
    }
    else if (c.icon === 'dot' || c.variant === 'dot') {
      indicator = document.createElement('span')
      indicator.className = 'ind'
    }
    indicator?.setAttribute('part', 'indicator')
    if (indicator) link.append(indicator)

    const text = document.createElement('span')
    text.className = c.variant === 'dot' ? 'txt sr' : 'txt'
    text.setAttribute('part', 'label')
    link.append(text)

    if (c.variant === 'button') {
      // Up-right for a new tab, right for the same tab: says where the click goes.
      link.append(template(c.target === '_blank' ? ARROW_OUT : ARROW_RIGHT))
    }
    w.append(link)

    if (c.poweredBy) {
      const pw = document.createElement('span')
      pw.className = c.variant === 'dot' ? 'pw sr' : 'pw'
      pw.setAttribute('part', 'powered-by')
      const a = document.createElement('a')
      a.rel = 'nofollow noopener'
      a.target = '_blank'
      a.textContent = POWERED_BY
      pw.append(a)
      w.append(pw)
    }

    if (!w.isConnected) this.#root.append(w)
  }
}

const ARROW_OUT = '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M8 7h9v9"/></svg>'
const ARROW_RIGHT = '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'

function template(markup: string): Element {
  const t = document.createElement('template')
  t.innerHTML = markup
  return t.content.firstElementChild!
}
