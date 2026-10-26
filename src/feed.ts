import { isSnapshot, type Snapshot } from './snapshot'

/**
 * One poller per status page, shared by every embed of that page in the document: five
 * badges for the same page cost one request, not five.
 *
 * Polls only while someone listens and the tab is visible. A failed request keeps the last
 * good snapshot and backs off; it never invents a state.
 */

export interface Listener {
  /** Seconds between polls this listener wants. The feed uses the shortest one. */
  interval: number
  onData(snapshot: Snapshot): void
  onError(): void
}

const TIMEOUT_MS = 8000
const MAX_BACKOFF_S = 300

export class Feed {
  url: string
  /** Where to go if `url` never answers (a language the status page does not offer). */
  readonly #fallback: string | null
  #everLoaded = false
  #listeners = new Set<Listener>()
  #snapshot: Snapshot | null = null
  #fetchedAt = 0
  #failures = 0
  #timer: ReturnType<typeof setTimeout> | null = null
  #inflight = false

  constructor(url: string, fallback: string | null = null) {
    this.url = url
    this.#fallback = fallback
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener)
    if (this.#snapshot) {
      const snapshot = this.#snapshot
      queueMicrotask(() => this.#listeners.has(listener) && listener.onData(snapshot))
    }
    if (this.#listeners.size === 1) {
      document.addEventListener('visibilitychange', this.#onVisibility)
    }
    this.#wake()
    return () => {
      this.#listeners.delete(listener)
      if (this.#listeners.size === 0) {
        this.#stop()
        document.removeEventListener('visibilitychange', this.#onVisibility)
      }
    }
  }

  get #interval(): number {
    let seconds = Infinity
    for (const l of this.#listeners) seconds = Math.min(seconds, l.interval)
    return seconds
  }

  #onVisibility = (): void => {
    if (document.hidden) this.#stop()
    else this.#wake()
  }

  /** Fetch now if the data is due, otherwise wait for the rest of the interval. */
  #wake(): void {
    if (this.#inflight || document.hidden || this.#listeners.size === 0) return
    this.#stop()
    const due = this.#fetchedAt + this.#delay() - Date.now()
    if (due <= 0) void this.#poll()
    else this.#timer = setTimeout(() => void this.#poll(), due)
  }

  #stop(): void {
    if (this.#timer !== null) clearTimeout(this.#timer)
    this.#timer = null
  }

  /** The wait before the next request: the interval, doubled per failure, ±10 % jitter. */
  #delay(): number {
    if (this.#fetchedAt === 0) return 0
    const base = this.#failures === 0
      ? this.#interval
      : Math.min(this.#interval * 2 ** this.#failures, MAX_BACKOFF_S)
    return base * 1000 * (0.9 + Math.random() * 0.2)
  }

  async #poll(): Promise<void> {
    this.#timer = null
    this.#inflight = true
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let switched = false
    try {
      // A plain GET with no custom headers: no CORS preflight, no cookies, no referrer.
      const response = await fetch(this.url, {
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(String(response.status))
      const body: unknown = await response.json()
      if (!isSnapshot(body)) throw new Error('not a status.json')
      this.#snapshot = body
      this.#failures = 0
      this.#everLoaded = true
      for (const l of [...this.#listeners]) l.onData(body)
    }
    catch {
      // A status page answers a language it does not offer with 404 and no CORS header, which
      // reaches us as the same opaque error as a network failure. Before the first success,
      // move on to the page's default language once, without counting it as a failure.
      if (!this.#everLoaded && this.#fallback && this.url !== this.#fallback) {
        this.url = this.#fallback
        switched = true
        return
      }
      this.#failures++
      for (const l of [...this.#listeners]) l.onError()
    }
    finally {
      clearTimeout(timeout)
      // After switching to the fallback, fetch it right away.
      this.#fetchedAt = switched ? 0 : Date.now()
      this.#inflight = false
      this.#wake()
    }
  }
}

const feeds = new Map<string, Feed>()

/**
 * The feed of one status page in one language: `/{locale}/status.json` (component and page
 * names in that language), falling back to `/status.json` if the page does not offer it.
 */
export function feedFor(origin: string, locale: string): Feed {
  const key = `${origin}|${locale}`
  let feed = feeds.get(key)
  if (!feed) {
    feed = new Feed(`${origin}/${locale}/status.json`, `${origin}/status.json`)
    feeds.set(key, feed)
  }
  return feed
}
