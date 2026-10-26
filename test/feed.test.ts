import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Feed, type Listener } from '../src/feed'
import { snapshot } from './fixtures'

function listener(interval = 60): Listener & { data: ReturnType<typeof vi.fn>, error: ReturnType<typeof vi.fn> } {
  const data = vi.fn()
  const error = vi.fn()
  return { interval, onData: data, onError: error, data, error }
}

function ok(body: unknown = snapshot()) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
}

let hidden = false
const subscriptions: Array<() => void> = []

/** A Feed whose subscriptions are all undone after the test. */
function track(feed: Feed): Feed {
  const subscribe = feed.subscribe.bind(feed)
  feed.subscribe = (l: Listener) => {
    const off = subscribe(l)
    subscriptions.push(off)
    return off
  }
  return feed
}

beforeEach(() => {
  vi.useFakeTimers()
  hidden = false
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  vi.spyOn(Math, 'random').mockReturnValue(0.5) // no jitter
})

afterEach(() => {
  subscriptions.splice(0).forEach(off => off())
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const flush = () => vi.advanceTimersByTimeAsync(0)

describe('Feed', () => {
  it('fetches once for any number of listeners', async () => {
    const fetchMock = vi.fn(() => ok())
    vi.stubGlobal('fetch', fetchMock)
    const feed = track(new Feed('https://s.example/status.json'))
    const a = listener()
    const b = listener()

    feed.subscribe(a)
    feed.subscribe(b)
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(a.data).toHaveBeenCalledTimes(1)
    expect(b.data).toHaveBeenCalledTimes(1)
  })

  it('sends a plain request: no cookies, no referrer', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => ok())
    vi.stubGlobal('fetch', fetchMock)
    track(new Feed('https://s.example/status.json')).subscribe(listener())
    await flush()

    const init = fetchMock.mock.calls[0]![1]!
    expect(init.credentials).toBe('omit')
    expect(init.referrerPolicy).toBe('no-referrer')
    expect(init.headers).toBeUndefined()
  })

  it('polls on the shortest interval of its listeners', async () => {
    const fetchMock = vi.fn(() => ok())
    vi.stubGlobal('fetch', fetchMock)
    const feed = track(new Feed('https://s.example/status.json'))
    feed.subscribe(listener(120))
    feed.subscribe(listener(30))
    await flush()

    await vi.advanceTimersByTimeAsync(29_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('gives a late listener the last snapshot without a new request', async () => {
    const fetchMock = vi.fn(() => ok())
    vi.stubGlobal('fetch', fetchMock)
    const feed = track(new Feed('https://s.example/status.json'))
    feed.subscribe(listener())
    await flush()

    const late = listener()
    feed.subscribe(late)
    await flush()
    expect(late.data).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reports errors, backs off, and recovers', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => Promise.reject(new TypeError('network')))
      .mockImplementationOnce(() => Promise.resolve(new Response('nope', { status: 503 })))
      .mockImplementation(() => ok())
    vi.stubGlobal('fetch', fetchMock)
    const l = listener(30)
    track(new Feed('https://s.example/status.json')).subscribe(l)
    await flush()
    expect(l.error).toHaveBeenCalledTimes(1)

    // 1 failure → 60 s, not 30 s
    await vi.advanceTimersByTimeAsync(31_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(l.error).toHaveBeenCalledTimes(2)

    // 2 failures → 120 s
    await vi.advanceTimersByTimeAsync(120_000)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(l.data).toHaveBeenCalledTimes(1)
  })

  it('treats a body that is not a status.json as an error', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok({ hello: 'world' })))
    const l = listener()
    track(new Feed('https://s.example/status.json')).subscribe(l)
    await flush()
    expect(l.data).not.toHaveBeenCalled()
    expect(l.error).toHaveBeenCalledTimes(1)
  })

  it('pauses while the tab is hidden and catches up when it is shown', async () => {
    const fetchMock = vi.fn(() => ok())
    vi.stubGlobal('fetch', fetchMock)
    track(new Feed('https://s.example/status.json')).subscribe(listener(60))
    await flush()

    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(300_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('falls back to the default language once if the status page does not offer it', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      urls.push(url)
      return url.includes('/en/') ? Promise.reject(new TypeError('cors')) : ok()
    }))
    const l = listener(60)
    track(new Feed('https://s.example/en/status.json', 'https://s.example/status.json')).subscribe(l)
    await flush()
    await flush()

    expect(urls).toEqual(['https://s.example/en/status.json', 'https://s.example/status.json'])
    expect(l.error).not.toHaveBeenCalled()
    expect(l.data).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(61_000)
    expect(urls.at(-1)).toBe('https://s.example/status.json')
  })

  it('does not abandon a language that worked before', async () => {
    const urls: string[] = []
    const fetchMock = vi.fn((url: string) => {
      urls.push(url)
      return urls.length === 2 ? Promise.reject(new TypeError('network')) : ok()
    })
    vi.stubGlobal('fetch', fetchMock)
    const l = listener(30)
    track(new Feed('https://s.example/en/status.json', 'https://s.example/status.json')).subscribe(l)
    await flush()
    await vi.advanceTimersByTimeAsync(31_000)
    expect(l.error).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(61_000)
    expect(urls.every(u => u.includes('/en/'))).toBe(true)
  })

  it('stops polling when the last listener leaves', async () => {
    const fetchMock = vi.fn(() => ok())
    vi.stubGlobal('fetch', fetchMock)
    const off = track(new Feed('https://s.example/status.json')).subscribe(listener(30))
    await flush()
    off()
    await vi.advanceTimersByTimeAsync(600_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
