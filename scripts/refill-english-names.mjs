/**
 * Refill English-only display names in data/wiki/all-items.json
 * using improved extractJaName (Japan Wiki wikitext).
 *
 * Usage: node scripts/refill-english-names.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractJaName, looksLikeBadName } from './lib/wiki-parse.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PATH = join(ROOT, 'data', 'wiki', 'all-items.json')
const UA = 'TerrariaCompanionLocal/1.0'
const JP = 'https://terraria.arcenserv.info/w/api.php'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const LIMIT = Number(process.env.WIKI_JPNAME_LIMIT || 99999)

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
    await sleep(50)
    return json?.parse?.wikitext?.['*'] || ''
  }
  return ''
}

function hasJa(s) {
  return /[ぁ-んァ-ヶ一-龥]/.test(s || '')
}

async function main() {
  const data = JSON.parse(await readFile(PATH, 'utf8'))
  const missing = (data.entities || []).filter((e) => e?.enName && !hasJa(e.name))
  console.log(`English-only: ${missing.length}`)
  let fixed = 0
  let still = 0
  const report = []

  for (let i = 0; i < Math.min(missing.length, LIMIT); i++) {
    const e = missing[i]
    const title = e.source?.japanWiki || e.enName
    const wt = await parseWikitext(title)
    if (!wt || /^#redirect/i.test(wt.trim())) {
      still++
      process.stdout.write('r')
      continue
    }
    const ja = extractJaName(wt, e.enName)
    if (ja && hasJa(ja) && !looksLikeBadName(ja) && ja !== e.enName) {
      e.name = ja
      fixed++
      process.stdout.write('+')
    } else {
      still++
      report.push(e.enName)
      process.stdout.write('.')
    }
    if ((i + 1) % 40 === 0) {
      console.log(`\n  [${i + 1}/${missing.length}] fixed=${fixed} still=${still}`)
      await writeFile(PATH, JSON.stringify(data, null, 2))
    }
  }

  data.generatedAt = new Date().toISOString()
  await writeFile(PATH, JSON.stringify(data, null, 2))
  await writeFile(
    join(ROOT, 'data', 'wiki', 'untranslated-names.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), count: report.length, titles: report }, null, 2),
  )
  console.log(`\nfixed=${fixed} stillEnglish=${still}`)
  console.log('still sample:', report.slice(0, 30))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
