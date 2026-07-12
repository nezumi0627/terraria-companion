/**
 * Generate public/data/catalog.json from data/wiki/*.json
 * (reference / tooling catalog — not bundled into the client).
 *
 * Usage: node scripts/generate-catalog.mjs
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const WIKI = join(ROOT, 'data', 'wiki')
const OUT = join(ROOT, 'public', 'data', 'catalog.json')

const COLOR_BY_KIND = {
  weapon: 'crimson',
  armor: 'steel',
  accessory: 'gold',
  tool: 'copper',
  potion: 'pink',
  mount: 'sky',
  pet: 'lilac',
  boss: 'boss',
  enemy: 'ash',
  npc: 'sand',
  material: 'stone',
  furniture: 'wood',
  block: 'stone',
}

function glyphFromName(name) {
  const jp = name.replace(/[A-Za-z0-9\s\-_'’().]/g, '')
  if (jp.length >= 1) return jp.slice(0, 2)
  return name.slice(0, 2).toUpperCase() || '?'
}

async function main() {
  await mkdir(WIKI, { recursive: true })
  await mkdir(join(ROOT, 'public', 'data'), { recursive: true })
  let files = []
  try {
    files = (await readdir(WIKI)).filter((f) => f.endsWith('.json') && f !== 'index.json')
  } catch {
    console.error('No data/wiki yet. Run: pnpm data:fetch-wiki')
    process.exit(1)
  }

  const entities = []
  const seen = new Set()

  for (const file of files) {
    const raw = JSON.parse(await readFile(join(WIKI, file), 'utf8'))
    for (const e of raw.entities || []) {
      if (!e?.id || seen.has(e.id)) continue
      seen.add(e.id)
      entities.push({
        id: e.id,
        name: e.name || e.enName || e.id,
        enName: e.enName || '',
        kind: e.kind || 'material',
        description: e.description || '',
        glyph: glyphFromName(e.name || e.enName || '?'),
        color: COLOR_BY_KIND[e.kind] || 'stone',
        sprite: e.sprite || e.enName || '',
      })
    }
  }

  entities.sort((a, b) => a.name.localeCompare(b.name, 'ja'))

  await writeFile(OUT, JSON.stringify(entities))
  console.log(`Wrote ${entities.length} catalog entries -> ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
