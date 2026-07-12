/**
 * Write local snapshots of NPC happiness + data source manifest.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'data')

async function main() {
  await mkdir(OUT, { recursive: true })

  // Parse the TS module as text is fragile; instead emit a thin JSON that points at the TS source of truth.
  const ts = readFileSync(join(ROOT, 'lib', 'data', 'npc-happiness.ts'), 'utf8')
  const npcIds = [...ts.matchAll(/^\s{2}'?([a-z0-9-]+)'?:\s*\{/gm)].map((m) => m[1]).filter((id) => id !== 'export')

  await writeFile(
    join(OUT, 'npc-happiness.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        runtimeModule: 'lib/data/npc-happiness.ts',
        preferenceSource: 'https://github.com/synchromic/terraria-npc-happiness/blob/master/info.js',
        multipliersRef: { loved: 0.88, liked: 0.94, disliked: 1.06, hated: 1.12 },
        npcIds,
      },
      null,
      2,
    ),
  )

  await writeFile(
    join(OUT, 'data-sources.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sources: [
          {
            id: 'japan-wiki',
            url: 'https://terraria.arcenserv.info',
            use: 'Japanese names & descriptions via MediaWiki wikitext (same as action=edit)',
            local: ['data/wiki/*.json', 'public/data/wiki-*.json'],
          },
          {
            id: 'npc-happiness',
            url: 'https://github.com/synchromic/terraria-npc-happiness',
            use: 'Town NPC biome/neighbor preference matrix (mirrored into lib/data/npc-happiness.ts)',
            local: ['lib/data/npc-happiness.ts', 'public/data/npc-happiness.json'],
          },
          {
            id: 'official-iteminfo',
            url: 'https://terraria.wiki.gg/wiki/Module:Iteminfo/data',
            use: 'Structured item stats from game source (English); optional future enrich — not bundled yet',
            local: [],
          },
        ],
      },
      null,
      2,
    ),
  )

  console.log('Wrote npc-happiness.json + data-sources.json')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
