// Size budget for the script every visitor of an embedding site downloads.
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const BUDGET = 8 * 1024
const file = new URL('../dist/embed.js', import.meta.url)
const gzip = gzipSync(readFileSync(file), { level: 9 }).length
console.log(`dist/embed.js: ${(gzip / 1024).toFixed(2)} KiB gzip (budget ${BUDGET / 1024} KiB)`)
if (gzip > BUDGET) {
  console.error('Over budget.')
  process.exit(1)
}
