/**
 * Re-fetch Japanese display names for existing data/wiki entities
 * without re-listing hubs. Uses batch wikitext API.
 *
 * Usage: node scripts/fix-wiki-names.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchWikitextResolved } from './lib/wiki-fetch.mjs'
import { parseEntityText } from './lib/wiki-parse.mjs'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'wiki')

async function main() {
  const files = (await readdir(OUT)).filter((f) => f.endsWith('.json') && f !== 'index.json')
  for (const file of files) {
    const path = join(OUT, file)
    const data = JSON.parse(await readFile(path, 'utf8'))
    if (!data.entities?.length) continue
    console.log(`Fixing ${file} (${data.entities.length})…`)
    const titles = data.entities.map((e) => e.source?.japanWiki || e.enName).filter(Boolean)
    const wikitextMap = await fetchWikitextResolved(titles)
    let fixed = 0
    for (const e of data.entities) {
      const title = e.source?.japanWiki || e.enName
      if (!title) continue
      const wt = wikitextMap.get(title)?.wt
      if (!wt) continue
      const parsed = parseEntityText(wt, e.enName || title, e.kind)
      if (parsed.name !== e.name || parsed.description !== e.description) {
        e.name = parsed.name
        e.description = parsed.description
        e.rarity = parsed.rarity
        e.progression = parsed.progression
        if (parsed.kind) e.kind = parsed.kind
        fixed++
      }
    }
    console.log(`  fixed ${fixed}`)
    await writeFile(path, JSON.stringify(data, null, 2))
  }
  console.log('Done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
