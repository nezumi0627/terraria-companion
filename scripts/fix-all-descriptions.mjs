/**
 * Aggressively clean ALL wiki entity descriptions (offline + optional refetch).
 * Fixes: <br>, TrJpMod/Steam links, breadcrumbs, empty {{item}} holes, table junk.
 *
 * Usage:
 *   node scripts/fix-all-descriptions.mjs
 *   node scripts/fix-all-descriptions.mjs --refetch
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'wiki')
const UA = 'TerrariaCompanionLocal/1.0 (offline mirror)'
const JP = 'https://terraria.arcenserv.info/w/api.php'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const REFETCH = process.argv.includes('--refetch')
const LIMIT = Number(process.env.WIKI_REFETCH_LIMIT || 800)

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

/** Pull Japanese tooltip lines from infobox description field. */
function extractTooltipJa(wt) {
  const block = wt.match(/\|\s*'''?説明'''?\s*\|\|([\s\S]*?)(?=\n\|-|\n\|\s*'''?)/)
  if (!block) return []
  const parts = block[1]
    .split(/<br\s*\/?>/i)
    .map((s) =>
      s
        .replace(/<hr\s*\/?>/gi, '')
        .replace(/'{2,}/g, '')
        .replace(/\{\{[^}]+\}\}/g, '')
        .replace(/\[\[[^\]]*\]\]/g, '')
        .trim(),
    )
    .filter((s) => /[ぁ-んァ-ヶ一-龥「」]/.test(s) && s.length >= 2)
  return parts
}

/**
 * Convert raw wikitext (or already-mangled description) into clean JP prose.
 */
export function cleanDescriptionText(raw, name = '', enName = '') {
  let t = String(raw || '')

  // Drop whole wiki tables first
  t = t.replace(/\{\|[\s\S]*?\|\}/g, '\n')

  // Translation credit / external links: ([https://... TrJpMod]訳) etc.
  t = t.replace(/\(\s*\[[^\]]*https?:\/\/[^\]]*\][^\)]*訳\s*\)/gi, '')
  t = t.replace(/\(\s*\[[^\]]*wikiwiki[^\]]*\][^\)]*訳\s*\)/gi, '')
  t = t.replace(/\(\s*\[[^\]]*TrJpMod[^\]]*\][^\)]*訳\s*\)/gi, '')
  t = t.replace(/（?\s*日本語化プロジェクト訳\s*）?/g, '')
  t = t.replace(/\(\s*日本語化プロジェクト訳\s*\)/g, '')
  t = t.replace(/\[[^\]]*https?:\/\/[^\]]*\]/gi, '')
  t = t.replace(/https?:\/\/\S+/gi, '')
  t = t.replace(/Category:[^\s。]+/g, ' ')

  // Templates → keep inner item name when possible
  t = t.replace(/\{\{(?:item|アイテム|Item)\s*\|([^}|]+)[^}]*\}\}/gi, '$1')
  t = t.replace(/\{\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\}/g, ' ')

  // Wiki links
  t = t.replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1')
  t = t.replace(/\[\[([^\]]+)\]\]/g, '$1')

  // HTML / markup
  t = t
    .replace(/<br\s*\/?>/gi, '。')
    .replace(/<hr\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/'{2,}/g, '')

  // Breadcrumbs / infobox leftovers
  t = t
    .replace(/\{\{参照\}\}/g, ' ')
    .replace(/\{\{パンくず[^}]*\}\}/g, ' ')
    .replace(/^(?:アイテム|アクセサリー|武器|防具|雑貨|家具)\s*[>＞]\s*[^\n。]{0,40}/gm, ' ')
    .replace(/^-?\s*タイプ[^\n。]{0,40}/gim, ' ')
    .replace(/^-?\s*最大スタック[^\n。]{0,20}/gim, ' ')
    .replace(/^-?\s*説明\s*/gim, ' ')
    .replace(/\b(cellpadding|colspan|border-collapse|min-width|font-size|background|align)\b[^。\n]*/gi, ' ')
    .replace(/#[0-9A-Fa-f]{3,8}\b/g, ' ')

  // Name + empty translation residue at start
  if (name) {
    t = t.replace(new RegExp(`^\\s*${escapeReg(name)}\\s*`, 'i'), '')
  }
  if (enName) {
    t = t.replace(new RegExp(`^\\s*${escapeReg(enName)}\\s*`, 'i'), '')
  }

  // Holes left by stripped item templates: "は などと" / "の が"
  t = t
    .replace(/は\s+などと/g, 'は他の移動アクセサリーなどと')
    .replace(/は\s+と重複/g, 'は他の効果と重複')
    .replace(/の\s+が/g, 'の敵が')
    .replace(/の\s+を/g, 'のアイテムを')
    .replace(/で\s+を/g, 'で対象を')
    .replace(/から\s+で購入/g, 'からNPCで購入')
    .replace(/を開封した際、確定で1個、必ず手に入る。/g, 'を開封すると必ず手に入る。')

  t = t
    .replace(/[|!{}]/g, ' ')
    .replace(/。{2,}/g, '。')
    .replace(/\s+/g, ' ')
    .trim()

  // Drop leading punctuation
  t = t.replace(/^[、。・\-\s]+/, '')

  // Prefer Japanese-heavy content
  const sentences = t
    .split(/(?<=[。．！？])\s*/)
    .map((s) => s.trim())
    .filter((s) => {
      if (s.length < 6) return false
      if (!/[ぁ-んァ-ヶ一-龥]/.test(s)) return false
      if (/^(タイプ|ツールチップ|レア|売却|調査|情報|参照|Perm|Increases|Provides)/i.test(s)) return false
      if (/TrJpMod|steamcommunity|wikiwiki|sharedfiles/i.test(s)) return false
      return true
    })

  if (sentences.length) {
    return sentences.slice(0, 3).join('').slice(0, 320)
  }

  if (/[ぁ-んァ-ヶ一-龥]/.test(t) && t.length >= 8) return t.slice(0, 320)
  return name ? `${name}。Terrariaのアイテムです。` : '説明を準備中です。'
}

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractFromWikitext(wt, name, enName) {
  const tips = extractTooltipJa(wt)
  // Body: strip tables then clean
  let body = wt
    .replace(/\{\|[\s\S]*?\|\}/g, '\n')
    .replace(/==[\s\S]*$/m, (m) => {
      // keep only content before first == section if it's crafting/history
      return ''
    })

  // Actually keep body before == クラフト or == Crafting
  const cut = wt.search(/\n==\s*(クラフト|Crafting|更新|History|Notes|Trivia)/i)
  const head = cut > 0 ? wt.slice(0, cut) : wt

  body = head
    .replace(/\{\|[\s\S]*?\|\}/g, '\n')
    .replace(/\{\{参照\}\}/g, '')
    .replace(/\{\{パンくず[^}]*\}\}/g, '')

  const cleaned = cleanDescriptionText(body, name, enName)
  const tipJoined = tips.length ? `${tips.join('。')}。` : ''

  let result = cleaned
  if (tipJoined) {
    const shortTip = tips
      .filter((t) => t.length <= 40 && !/^「/.test(t))
      .slice(0, 2)
      .join('。')
    if (shortTip && !cleaned.includes(shortTip.slice(0, Math.min(6, shortTip.length)))) {
      result = cleanDescriptionText(`${shortTip}。${cleaned}`, name, enName)
    }
  }

  // Fix common holes after template stripping
  result = result
    .replace(/は\s*などと重複/g, 'はヘルメスのブーツなどと重複')
    .replace(/は他の移動アクセサリーなどと重複/g, 'はヘルメスのブーツなどと重複')

  if (stillBad(result) && tipJoined) {
    return cleanDescriptionText(tipJoined, name, enName)
  }
  return result
}

function stillBad(desc) {
  if (!desc || desc.length < 8) return true
  return /<br|https?:|TrJpMod|steamcommunity|wikiwiki|sharedfiles|cellpadding|colspan|\[\[|\]\]|\{\{|訳\)|アイテム\s*>|タイプ\s*\(|は\s+などと|から\s+で購入/i.test(
    desc,
  )
}

async function main() {
  const files = (await readdir(OUT)).filter((f) => f.endsWith('.json') && f !== 'index.json')
  let cleaned = 0
  let refetched = 0

  for (const file of files) {
    const path = join(OUT, file)
    const data = JSON.parse(await readFile(path, 'utf8'))
    let fileClean = 0
    const needRefetch = []

    for (const e of data.entities || []) {
      const before = e.description || ''
      const after = cleanDescriptionText(before, e.name, e.enName)
      if (after !== before) {
        e.description = after
        fileClean++
        cleaned++
      }
      if (stillBad(e.description)) needRefetch.push(e)
    }

    if (REFETCH && needRefetch.length) {
      const batch = needRefetch.slice(0, LIMIT)
      console.log(`${file}: refetch ${batch.length}/${needRefetch.length}`)
      for (const e of batch) {
        const title = e.source?.japanWiki || e.enName
        if (!title) continue
        const wt = await parseWikitext(title)
        if (!wt || /^#redirect/i.test(wt.trim())) {
          process.stdout.write('r')
          continue
        }
        e.name = extractJaName(wt, e.name || e.enName)
        e.description = extractFromWikitext(wt, e.name, e.enName)
        // final offline pass
        e.description = cleanDescriptionText(e.description, e.name, e.enName)
        refetched++
        process.stdout.write('.')
      }
      process.stdout.write('\n')
    }

    await writeFile(path, JSON.stringify(data, null, 2))
    console.log(`${file}: cleaned ${fileClean}, stillBad ${needRefetch.length}`)
  }

  console.log(`Done. offlineCleaned=${cleaned} refetched=${refetched}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
