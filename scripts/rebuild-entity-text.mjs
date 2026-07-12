/**
 * Rebuild entity names + descriptions (+ rarity/kind/progression) from Japan wiki
 * using scripts/lib/wiki-parse.mjs + batch wikitext fetch.
 *
 * Usage:
 *   node scripts/rebuild-entity-text.mjs
 *   node scripts/rebuild-entity-text.mjs --bad-only
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchWikitextResolved } from './lib/wiki-fetch.mjs'
import { parseEntityText, looksLikeBadName, isBadDescription } from './lib/wiki-parse.mjs'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'wiki')
const LIMIT = Number(process.env.WIKI_REBUILD_LIMIT || 99999)
const BAD_ONLY = process.argv.includes('--bad-only')

function isJunkEntity(e) {
  const en = e.enName || ''
  const id = e.id || ''
  const name = e.name || ''
  if (
    /^(Bleeding|Burning|Confused|Stoned|Venom|Poisoned|Cursed|Silenced|Darkness|Slow|Weak|Broken Armor|On Fire!|Frostburn|Mana|Star|Slime|Chest|Grass|Torch|Hooks|Minion|Modifier|Expert Mode|Master Mode|Journey Mode|Hardmode|Bestiary|Crate|Light Pet|Don't Starve Together|The Underworld|Thin Ice|Vampire|Developer items|Mechanical Boss|Forests|Oasis|The Corruption|The Hallow|Tree|Trees|Drill|Axe|Hammer|Pickaxe|Bar\(Table\)|Platform|Beam \/ Column)$/i.test(
      en,
    )
  )
    return true
  if (
    /^(bleeding|burning|confused|stoned|venom|mana|star|slime|chest|grass|torch|hooks|minion|modifier|expert-mode|master-mode|journey-mode)$/i.test(
      id,
    )
  )
    return true
  if (/^(購入には|防御力は|または|例えば|かなり硬く|数少ない|設置すると|ワールド生成時)/.test(name))
    return true
  if (looksLikeBadName(name) && looksLikeBadName(en)) return true
  return false
}

function needsRebuild(e) {
  if (!BAD_ONLY) return true
  return looksLikeBadName(e.name) || isBadDescription(e.description, e.name)
}

async function main() {
  const files = (await readdir(OUT)).filter((f) => f.endsWith('.json') && f !== 'index.json')
  let updated = 0
  let skipped = 0
  let dropped = 0
  let failed = 0

  for (const file of files) {
    const path = join(OUT, file)
    const data = JSON.parse(await readFile(path, 'utf8'))
    const entities = data.entities || []
    console.log(`\n${file}: ${entities.length} entities`)

    const next = []
    const rebuildList = []
    for (const e of entities) {
      if (isJunkEntity(e)) {
        dropped++
        continue
      }
      if (!needsRebuild(e)) {
        next.push(e)
        skipped++
        continue
      }
      if (rebuildList.length < LIMIT) rebuildList.push(e)
      else next.push(e)
    }

    if (rebuildList.length) {
      const titles = rebuildList.map((e) => e.source?.japanWiki || e.enName).filter(Boolean)
      const wikitextMap = await fetchWikitextResolved(titles)
      for (const e of rebuildList) {
        const title = e.source?.japanWiki || e.enName
        if (!title) {
          next.push(e)
          continue
        }
        const wt = wikitextMap.get(title)?.wt
        if (!wt) {
          if (looksLikeBadName(e.name)) e.name = e.enName || e.name
          if (isBadDescription(e.description, e.name)) {
            e.description = `${e.name || e.enName}に関する情報。`
          }
          next.push(e)
          failed++
          continue
        }
        const parsed = parseEntityText(wt, e.enName || title, e.kind)
        e.name = looksLikeBadName(parsed.name) ? e.enName || parsed.name : parsed.name
        e.description = parsed.description
        e.rarity = parsed.rarity
        e.progression = parsed.progression
        if (parsed.kind) e.kind = parsed.kind
        updated++
        next.push(e)
      }
    }

    data.entities = next
    data.enriched = next.length
    await writeFile(path, JSON.stringify(data, null, 2))
    console.log(`  kept ${next.length}`)
  }

  console.log(`\nDone. updated=${updated} skipped=${skipped} dropped=${dropped} failed=${failed}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
