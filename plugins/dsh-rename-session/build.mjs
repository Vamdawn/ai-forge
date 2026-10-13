import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'

const { name } = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'))

await build({
  entryPoints: ['src/index.ts'], outfile: 'dist/index.js', bundle: true,
  platform: 'node', target: 'node24', format: 'esm', packages: 'external',
})
await build({
  entryPoints: ['src/client.tsx'], outfile: 'dist/client.js', bundle: true,
  platform: 'browser', target: 'es2023', format: 'cjs', packages: 'external',
  banner: { js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(name)}, factory: (require) => {\nconst module = { exports: {} }; const exports = module.exports;` },
  footer: { js: 'return module.exports;\n} });' },
})
