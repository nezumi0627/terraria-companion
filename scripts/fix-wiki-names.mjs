/**
 * Re-fetch Japanese display names for existing data/wiki entities
 * without re-listing hubs. Faster than a full --force sync.
 *
 * Usage: node scripts/fix-wiki-names.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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

function extractJaName(wikitext, fallback) {
  if (!wikitext) return fallback
  const sub = wikitext.match(/\|\s*subname\s*=\s*([^\n|{]+)/i)
  if (sub) {
    const v = sub[1].trim()
    if (v && v !== 'なし') return v
  }
  const bracket = wikitext.match(/『([^』]{1,40})』/)
  if (bracket) return bracket[1].trim()
  const mBox = wikitext.match(/BASEPAGENAME\}\}\s*<br>\s*([^\n|{]+)/)
  if (mBox && /[ぁ-んァ-ヶ一-龥]/.test(mBox[1])) return mBox[1].trim()
  return fallback
}

function extractLead(wikitext) {
  if (!wikitext) return ''
  let t = wikitext
    .replace(/\{\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\}/g, ' ')
    .replace(/\[\[File:[^\]]+\]\]/gi, ' ')
    .replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/^\s*#redirect.*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!t || t.length < 12) return ''
  const sentences = t.split(/(?<=[。．])\s+/).filter((s) => s.length > 16)
  return (sentences[0] || t).slice(0, 360)
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
      const wt = await parseWikitext(title)
      if (!wt || /^#redirect/i.test(wt.trim())) continue
      const name = extractJaName(wt, e.enName)
      const description = extractLead(wt) || e.description
      if (name !== e.name || description !== e.description) {
        e.name = name
        e.description = description
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
