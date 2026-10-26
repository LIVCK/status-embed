// Test servers for the browser tests:
//   :4173  the site that embeds the badge (serves the repo, e.g. /dist/embed.js, /e2e/pages/*)
//   :4174  a stand-in status page with /status.json on a DIFFERENT origin, so CORS is real.
// The status page is steered with GET /__set?state=…&cors=0|1 and reports what it received at /__log.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const root = normalize(join(import.meta.dirname, '..'))
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' }

createServer(async (req, res) => {
  const path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)))
  if (!path.startsWith(root)) return res.writeHead(403).end()
  try {
    const body = await readFile(path)
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(body)
  }
  catch {
    res.writeHead(404).end()
  }
}).listen(4173, '127.0.0.1')

let state = { indicator: 'operational', cors: true, locales: ['de', 'en'] }
const log = []

createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  if (url.pathname === '/__set') {
    if (url.searchParams.has('state')) state.indicator = url.searchParams.get('state')
    if (url.searchParams.has('cors')) state.cors = url.searchParams.get('cors') === '1'
    if (url.searchParams.has('locales')) state.locales = url.searchParams.get('locales').split(',')
    if (url.searchParams.has('reset')) { log.length = 0; state.locales = ['de', 'en'] }
    return res.writeHead(204).end()
  }
  if (url.pathname === '/__log') return res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(log))
  log.push({ method: req.method, path: url.pathname, origin: req.headers.origin ?? null, cookie: req.headers.cookie ?? null, referer: req.headers.referer ?? null })
  // Like the edge: /status.json is the default language (de), /{locale}/status.json another one
  // the page offers; a language it does not offer is a 404 without CORS header.
  const m = url.pathname.match(/^(?:\/([a-z]{2}))?\/status\.json$/)
  if (!m || (m[1] && !state.locales.includes(m[1]))) return res.writeHead(404).end()
  const locale = m[1] ?? 'de'
  const names = { de: { page: 'Acme Status', api: 'Schnittstelle', web: 'Webseite' }, en: { page: 'Acme Status', api: 'API', web: 'Website' } }[locale]
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  if (state.cors) headers['access-control-allow-origin'] = '*'
  res.writeHead(200, headers).end(JSON.stringify({
    page: { id: 'p1', name: names.page, url: 'http://localhost:4174', locale, updated_at: new Date().toISOString() },
    status: { indicator: state.indicator, description: '' },
    components: [
      { id: 'api', name: names.api, status: 'degraded', is_group: false, group_id: null },
      { id: 'web', name: names.web, status: 'operational', is_group: false, group_id: null },
    ],
    incidents: [],
    maintenances: [],
  }))
}).listen(4174, 'localhost')

console.log('test servers on :4173 and :4174')
