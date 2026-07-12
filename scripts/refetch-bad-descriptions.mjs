/**
 * Re-fetch clean Japanese descriptions for entities whose text still looks like
 * wiki table dumps. Also improves tooltip / body extraction.
 *
 * Usage: node scripts/refetch-bad-descriptions.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'wiki')
const UA = 'TerrariaCompanionLocal/1.0 (offline mirror)'
const JP = 'https://terraria.arcenserv.info/w/api.php'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const LIMIT = Number(process.env.WIKI_REFETCH_LIMIT || 400)

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

function extractJaName(wt, fallback) {
  const sub = wt.match(/\|\s*subname\s*=\s*([^\n|{]+)/i)
  if (sub && sub[1].trim() !== 'なし') return sub[1].trim()
  const br = wt.match(/BASEPAGENAME\}\}\s*<br>\s*([^\n|{]+)/)
  if (br && /[ぁ-んァ-ヶ一-龥]/.test(br[1])) return br[1].trim()
  const enBr = wt.match(/[A-Za-z][^<\n]{0,40}<br>\s*([ぁ-んァ-ヶ一-龥][^\n|{']{0,40})/)
  if (enBr) return enBr[1].trim()
  const bracket = wt.match(/『([^』]{1,40})』/)
  if (bracket) return bracket[1].trim()
  return fallback
}

function extractDescription(wt, name, enName) {
  if (!wt) return `${name}（${enName}）。`

  // Japanese tooltip line if present
  const tipJa = wt.match(/ツールチップ[^\n]*?(?:<hr>)?[^\n]*?<br>\s*([ぁ-んァ-ヶ一-龥][^<\n|]{4,80})/i)
  const tipText = tipJa?.[1]?.trim()

  // Strip tables / templates / files, keep prose
  let body = wt
    .replace(/\{\|[\s\S]*?\|\}/g, '\n')
    .replace(/\{\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\}/g, ' ')
    .replace(/\[\[File:[^\]]+\]\]/gi, ' ')
    .replace(/\[\[file:[^\]]+\]\]/gi, ' ')
    .replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<hr\s*\/?>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*[|=!].*$/gm, ' ')
    .replace(/\n{2,}/g, '\n')

  const lines = body
    .split(/\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => {
      if (l.length < 8) return false
      if (!/[ぁ-んァ-ヶ一-龥]/.test(l)) return false
      if (/^(タイプ|ツールチップ|レア|売却|調査|Item ID|情報|参照)/.test(l)) return false
      if (/cellpadding|colspan|border-collapse|min-width/i.test(l)) return false
      if (/^Category:/.test(l)) return false
      return true
    })

  const picked = []
  if (tipText) picked.push(tipText)
  for (const line of lines) {
    if (picked.includes(line)) continue
    // skip pure name echo
    if (line === name || line === `${name}。`) continue
    picked.push(line)
    if (picked.length >= 3) break
  }

  if (!picked.length) return `${name}（${enName}）。Terraria Japan Wikiより。`
  return picked.join('').slice(0, 320)
}

function isBadDescription(desc) {
  if (!desc || desc.length < 12) return true
  return /cellpadding|colspan|border-collapse|min-width|ツールチップ\s*\d|タイプ\s*アクセサリー|font-size|E4F0F7|reduced mana|damage type/i.test(
    desc,
  )
}

async function main() {
  const files = (await readdir(OUT)).filter((f) => f.endsWith('.json') && f !== 'index.json')
  let total = 0
  let fixed = 0

  for (const file of files) {
    const path = join(OUT, file)
    const data = JSON.parse(await readFile(path, 'utf8'))
    const bad = (data.entities || []).filter((e) => isBadDescription(e.description))
    if (!bad.length) {
      console.log(`${file}: ok`)
      continue
    }
    const batch = bad.slice(0, LIMIT)
    console.log(`${file}: refetching ${batch.length}/${bad.length}…`)
    for (const e of batch) {
      total++
      const title = e.source?.japanWiki || e.enName
      if (!title) continue
      const wt = await parseWikitext(title)
      if (!wt || /^#redirect/i.test(wt.trim())) {
        process.stdout.write('r')
        continue
      }
      e.name = extractJaName(wt, e.name || e.enName)
      e.description = extractDescription(wt, e.name, e.enName)
      fixed++
      process.stdout.write('.')
    }
    process.stdout.write('\n')
    await writeFile(path, JSON.stringify(data, null, 2))
  }
  console.log(`Done. fixed ${fixed}/${total}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
