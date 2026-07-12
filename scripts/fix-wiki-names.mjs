/**
 * Re-fetch Japanese display names for existing data/wiki entities
 * without re-listing hubs. Faster than a full --force sync.
 *
 * Usage: node scripts/fix-wiki-names.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEntityText, matchRedirectTarget } from './lib/wiki-parse.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'data', 'wiki')
const UA = 'TerrariaCompanionLocal/1.0 (offline mirror)'
const JP = 'https://terraria.arcenserv.info/w/api.php'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function parseWikitext(title) {
  const url = new URL(JP)
  url.searchParams.set('action', 'parse')
  url.searchParams.set('page', title)
  url.searchParams.set('prop', 'wikitext')
  url.searchParams.set('format', 'json')
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) return ''
  const json = await res.json()
  await sleep(60)
  return json?.parse?.wikitext?.['*'] || ''
}

async function resolveWikitext(title, depth = 0) {
  const wt = await parseWikitext(title)
  const redir = matchRedirectTarget(wt)
  if (redir && depth < 3) return resolveWikitext(redir, depth + 1)
  return wt
}

async function main() {
  const files = (await readdir(OUT)).filter((f) => f.endsWith('.json') && f !== 'index.json')
  for (const file of files) {
    const path = join(OUT, file)
    const data = JSON.parse(await readFile(path, 'utf8'))
    if (!data.entities?.length) continue
    console.log(`Fixing ${file} (${data.entities.length})…`)
    let fixed = 0
    for (const e of data.entities) {
      const title = e.source?.japanWiki || e.enName
      if (!title) continue
      const wt = await resolveWikitext(title)
      if (!wt || matchRedirectTarget(wt)) continue
      const parsed = parseEntityText(wt, e.enName || title, e.kind)
      if (parsed.name !== e.name || parsed.description !== e.description) {
        e.name = parsed.name
        e.description = parsed.description
        e.rarity = parsed.rarity
        e.progression = parsed.progression
        if (parsed.kind) e.kind = parsed.kind
        fixed++
      }
      process.stdout.write('.')
    }
    process.stdout.write(`\n  fixed ${fixed}\n`)
    await writeFile(path, JSON.stringify(data, null, 2))
  }
  console.log('Done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
