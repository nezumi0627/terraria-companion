/**
 * For entities still using English as display name, try to pull a JP name
 * from the first Japanese title-like token in the page body.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'wiki')
const UA = 'TerrariaCompanionLocal/1.0'
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
  await sleep(50)
  return json?.parse?.wikitext?.['*'] || ''
}

function hasJapanese(s) {
  return /[ぁ-んァ-ヶ一-龥]/.test(s || '')
}

function extractBodyJaName(wt) {
  const body = wt
    .replace(/\{\|[\s\S]*?\|\}/g, '\n')
    .replace(/\{\{[^}]+\}\}/g, ' ')
    .replace(/\[\[[^\]]*\]\]/g, ' ')
  // マギルミネッセンス ( or （
  const m1 = body.match(/(?:^|\n)\s*([ぁ-んァ-ヶ一-龥々ー][ぁ-んァ-ヶ一-龥々ーァ-ヶ0-9A-Za-z・＝\-]{1,28})\s*[\(（]/m)
  if (m1) return m1[1].trim()
  // standalone short JP line
  const m2 = body.match(/(?:^|\n)\s*([ぁ-んァ-ヶ一-龥々ー][ぁ-んァ-ヶ一-龥々ー・＝\-]{1,20})\s*(?:\n|$)/m)
  if (m2 && !/^(タイプ|説明|情報|参照|レア|売却)/.test(m2[1])) return m2[1].trim()
  return ''
}

async function main() {
  let fixed = 0
  for (const file of (await readdir(OUT)).filter((f) => f.endsWith('.json') && f !== 'index.json')) {
    const path = join(OUT, file)
    const data = JSON.parse(await readFile(path, 'utf8'))
    let n = 0
    for (const e of data.entities || []) {
      if (hasJapanese(e.name)) continue
      if (n >= Number(process.env.WIKI_JPNAME_LIMIT || 600)) break
      n++
      const title = e.source?.japanWiki || e.enName
      if (!title) continue
      const wt = await parseWikitext(title)
      if (!wt || /^#redirect/i.test(wt.trim())) {
        process.stdout.write('r')
        continue
      }
      const ja = extractBodyJaName(wt)
      if (ja && ja !== e.name) {
        e.name = ja
        fixed++
        process.stdout.write('+')
      } else {
        process.stdout.write('.')
      }
    }
    await writeFile(path, JSON.stringify(data, null, 2))
    console.log(`\n${file} done`)
  }
  console.log('fixed JP names', fixed)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
