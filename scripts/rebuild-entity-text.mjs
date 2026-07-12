/**
 * Rebuild entity names + descriptions (+ rarity/kind/progression) from Japan wiki
 * using scripts/lib/wiki-parse.mjs.
 *
 * Usage:
 *   node scripts/rebuild-entity-text.mjs
 *   node scripts/rebuild-entity-text.mjs --bad-only
 *   set WIKI_REBUILD_LIMIT=200 && node scripts/rebuild-entity-text.mjs --bad-only
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseEntityText,
  looksLikeBadName,
  isBadDescription,
  matchRedirectTarget,
} from './lib/wiki-parse.mjs'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'wiki')
const UA = 'TerrariaCompanionLocal/1.0 (offline mirror rebuild)'
const JP = 'https://terraria.arcenserv.info/w/api.php'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const LIMIT = Number(process.env.WIKI_REBUILD_LIMIT || 99999)
const BAD_ONLY = process.argv.includes('--bad-only')

async function parseWikitext(title) {
  const url = new URL(JP)
  url.searchParams.set('action', 'parse')
  url.searchParams.set('page', title)
  url.searchParams.set('prop', 'wikitext')
  url.searchParams.set('format', 'json')
  for (let a = 0; a < 5; a++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.status === 429 || res.status === 503) {
      await sleep(1200 * (a + 1))
      continue
    }
    if (!res.ok) return ''
    const json = await res.json()
    await sleep(55)
    return json?.parse?.wikitext?.['*'] || ''
  }
  return ''
}

async function resolveWikitext(title, depth = 0) {
  const wt = await parseWikitext(title)
  const redir = matchRedirectTarget(wt)
  if (redir && depth < 3) return resolveWikitext(redir, depth + 1)
  return wt
}

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
    const next = []
    const entities = data.entities || []
    console.log(`\n${file}: ${entities.length} entities`)

    let n = 0
    for (const e of entities) {
      if (isJunkEntity(e)) {
        dropped++
        process.stdout.write('d')
        continue
      }

      if (!needsRebuild(e)) {
        next.push(e)
        skipped++
        process.stdout.write('_')
        continue
      }

      if (n >= LIMIT) {
        next.push(e)
        continue
      }
      n++

      const title = e.source?.japanWiki || e.enName
      if (!title) {
        next.push(e)
        continue
      }

      try {
        const wt = await resolveWikitext(title)
        if (!wt) {
          if (looksLikeBadName(e.name)) e.name = e.enName || e.name
          if (isBadDescription(e.description, e.name)) {
            e.description = `${e.name || e.enName}に関する情報。`
          }
          next.push(e)
          process.stdout.write('r')
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
        process.stdout.write('.')
      } catch {
        if (looksLikeBadName(e.name)) e.name = e.enName || e.name
        next.push(e)
        failed++
        process.stdout.write('x')
      }
    }

    data.entities = next
    data.enriched = next.length
    await writeFile(path, JSON.stringify(data, null, 2))
    process.stdout.write(`\n  kept ${next.length}\n`)
  }

  console.log(
    `\nDone. updated=${updated} skipped=${skipped} dropped=${dropped} failed=${failed}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
