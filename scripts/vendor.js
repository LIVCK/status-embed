// Copy the built script into another repository, e.g. the website, as <target>/<version>/embed.js.
// Prints the SHA-384 for Subresource Integrity. Run `npm run build` first.
//
//   node scripts/vendor.js ../website/public/badge
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const target = process.argv[2]
if (!target) {
  console.error('usage: node scripts/vendor.js <target-dir>')
  process.exit(1)
}
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const source = new URL('../dist/embed.js', import.meta.url)
const built = readFileSync(source, 'utf8')
if (!built.includes(version)) {
  console.error(`dist/embed.js is not version ${version}. Run npm run build.`)
  process.exit(1)
}
const dir = resolve(target, version)
mkdirSync(dir, { recursive: true })
copyFileSync(source, join(dir, 'embed.js'))
const sri = `sha384-${createHash('sha384').update(readFileSync(source)).digest('base64')}`
console.log(`${join(dir, 'embed.js')}\nversion   ${version}\nintegrity ${sri}`)
