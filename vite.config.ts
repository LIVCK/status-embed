import { defineConfig } from 'vitest/config'

// Two builds into one dist/:
//   default      → dist/status-embed.js  ES module for bundlers (exports + registers the element)
//   --mode embed → dist/embed.js         self-contained classic script for <script src> (no exports)
export default defineConfig(({ mode }) => {
  const embed = mode === 'embed'
  return {
    build: {
      emptyOutDir: false,
      minify: true,
      lib: embed
        ? { entry: 'src/embed.ts', name: 'LivckStatusEmbed', formats: ['iife'], fileName: () => 'embed.js' }
        : { entry: 'src/index.ts', formats: ['es'], fileName: () => 'status-embed.js' },
    },
    test: {
      environment: 'happy-dom',
      include: ['test/**/*.test.ts'],
    },
  }
})
