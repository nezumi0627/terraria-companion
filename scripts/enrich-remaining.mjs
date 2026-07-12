/**
 * Enrich remaining titles in data/wiki/*.json that are listed but not yet entities.
 * Usage: set WIKI_ENRICH_LIMIT=300 && node scripts/enrich-remaining.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'wiki')
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
  await sleep(70)
  return json?.parse?.wikitext?.['*'] || ''
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
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

function cleanDesc(wikitext, name, enName) {
  let t = String(wikitext || '')
  for (let i = 0; i < 8; i++) {
    const next = t.replace(/\{\{[^{}]*\}\}/g, ' ')
    if (next === t) break
    t = next
  }
  t = t
    .replace(/Category:[^\s]+/g, ' ')
    .replace(/\[\[File:[^\]]+\]\]/gi, ' ')
    .replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/\|[a-zA-Z]+\s*=\s*[^|}]*/g, ' ')
    .replace(/[{}|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (t.length < 18) return `${name}（${enName}）。Terraria Japan Wikiより。`
  const sentences = t.split(/(?<=[。．])\s+/).filter((s) => s.length > 16)
  return (sentences[0] || t).slice(0, 360)
}

async function main() {
  const limit = Number(process.env.WIKI_ENRICH_LIMIT || 300)
  const files = (await readdir(OUT)).filter((f) => f.endsWith('.json') && f !== 'index.json')

  for (const file of files) {
    const path = join(OUT, file)
    const data = JSON.parse(await readFile(path, 'utf8'))
    const have = new Set((data.entities || []).map((e) => e.enName))
    const missing = (data.titles || []).filter((t) => !have.has(t))
    if (!missing.length) {
      console.log(`${file}: complete (${have.size})`)
      continue
    }
    const batch = missing.slice(0, limit)
    console.log(`${file}: enriching ${batch.length}/${missing.length} remaining…`)
    let added = 0
    for (const title of batch) {
      const wt = await parseWikitext(title)
      if (!wt || /^#redirect/i.test(wt.trim())) {
        process.stdout.write('r')
        continue
      }
      const name = extractJaName(wt, title)
      data.entities.push({
        id: slugify(title),
        enName: title,
        name,
        kind: data.kind,
        sprite: title,
        description: cleanDesc(wt, name, title),
        source: { japanWiki: title },
      })
      added++
      process.stdout.write('.')
    }
    data.enriched = data.entities.length
    await writeFile(path, JSON.stringify(data, null, 2))
    process.stdout.write(`\n  added ${added}, total entities ${data.entities.length}\n`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
