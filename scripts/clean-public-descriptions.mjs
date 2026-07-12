/**
 * Re-sanitize descriptions in public/data/wiki-*.json.
 * Mirrors lib/sanitize-text.ts rules (kept inline for plain Node).
 *
 * Usage: node scripts/clean-public-descriptions.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const INFOBOX_KEYS =
  'subname|type|placeable|rare|rarity|damage|knockback|stack|tooltip|defense|body\\s*slot|sell|buy|research|consumable|use\\s*time|velocity|mana|critical\\s*chance|bonus|hardmode|auto|pickaxe\\s*power|axe\\s*power|hammer\\s*power|size|tool|id'

function sanitizeDescription(raw, fallbackName) {
  if (!raw) return fallbackName ? `${fallbackName}に関する情報。` : ''

  let t = String(raw)
    .replace(/\{\{\s*参照[^}]*\}\}/gi, ' ')
    .replace(/\(\s*\[[^\]]*https?:\/\/[^\]]*訳\s*\)/gi, '')
    .replace(/\(\s*\[[^\]]*wikiwiki[^\]]*\][^\)]*訳\s*\)/gi, '')
    .replace(/\(\s*\[[^\]]*TrJpMod[^\]]*\][^\)]*訳\s*\)/gi, '')
    .replace(/（?\s*日本語化プロジェクト訳\s*）?/g, '')
    .replace(/\(\s*日本語化プロジェクト訳\s*\)/g, '')
    .replace(/\[[^\]]*https?:\/\/[^\]]*\]/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/Category:[^\s。]+/g, ' ')
    .replace(new RegExp(`\\|\\s*(?:${INFOBOX_KEYS})\\s*=\\s*[^|\\n]{0,120}`, 'gi'), ' ')
    .replace(new RegExp(`\\b(?:${INFOBOX_KEYS})\\s*=\\s*[^。|\\n]{0,80}。?`, 'gi'), ' ')
    .replace(/cellpadding[\s\S]{0,400}?(?=情報|タイプ|ツールチップ|[ぁ-んァ-ヶ一-龥]{2,}|$)/gi, ' ')
    .replace(/style\s*=\s*'[^']*'/gi, ' ')
    .replace(/style\s*=\s*"[^"]*"/gi, ' ')
    .replace(/colspan\s*=\s*\d+/gi, ' ')
    .replace(/\{\{[^{}]*\}\}/g, ' ')
    .replace(/\{\|[\s\S]*?\|\}/g, ' ')
    .replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/<br\s*\/?>/gi, '。')
    .replace(/<hr\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/'{2,}/g, '')
    .replace(/\|{1,2}/g, ' ')
    .replace(/!{1,2}/g, ' ')
    .replace(/(?:アイテム|アクセサリー|武器|防具|雑貨)\s*[>＞]\s*[^\n。]{0,40}/g, ' ')
    .replace(/^-?\s*タイプ[^\n。]{0,40}/gim, ' ')
    .replace(/\b(background|color|font-size|min-width|border-collapse|padding|border)\b[:#]?[^\s]*/gi, ' ')
    .replace(/#[0-9A-Fa-f]{3,8}\b/g, ' ')
    .replace(/。{2,}/g, '。')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[、。・\-\s]+/, '')

  if (fallbackName) {
    const esc = fallbackName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    t = t
      .replace(new RegExp(`^${esc}\\s*(?:（\\s*）|\\([^)]*\\))?\\s*は[、,]?\\s*`, 'i'), '')
      .replace(new RegExp(`^${esc}\\s*[。．]?\\s*`, 'i'), '')
      .replace(/^（\s*）は[、,]?\s*/, '')
      .replace(/^\([^)]{0,40}\)は[、,]?\s*/, '')
      .trim()
  }

  const looksLikeInfoboxOnly =
    (!/[ぁ-んァ-ヶ一-龥]{6,}/.test(t) &&
      (/\b(subname|placeable|body\s*slot)\b/i.test(t) || (t.match(/=/g) || []).length >= 2)) ||
    /cellpadding|colspan|TrJpMod|steamcommunity|<br|<hr/i.test(t)

  if (looksLikeInfoboxOnly || t.length < 8) {
    const ja = t.match(/[ぁ-んァ-ヶ一-龥々ーA-Za-z0-9「」『』（）％%・、。．！？\s]{12,280}/)
    if (
      ja &&
      !/cellpadding|colspan|TrJpMod|steamcommunity|subname|placeable/i.test(ja[0]) &&
      (ja[0].match(/=/g) || []).length < 2
    ) {
      return ja[0].replace(/\s+/g, ' ').replace(/。{2,}/g, '。').trim().slice(0, 320)
    }
    return fallbackName ? `${fallbackName}に関する情報。` : '説明を準備中です。'
  }

  t = t.replace(/。?\s*Terrariaのアイテムです。?/g, '。').replace(/。{2,}/g, '。').trim()
  if (!t.endsWith('。') && !t.endsWith('！') && !t.endsWith('？') && t.length > 0) t += '。'
  return t.slice(0, 360)
}

async function cleanFile(rel) {
  const path = join(ROOT, rel)
  const arr = JSON.parse(await readFile(path, 'utf8'))
  let changed = 0
  for (const e of arr) {
    const before = e.description || ''
    const after = sanitizeDescription(before, e.name)
    if (after !== before) {
      e.description = after
      changed++
    }
  }
  await writeFile(path, JSON.stringify(arr))
  console.log(`${rel}: cleaned ${changed}/${arr.length}`)
}

async function main() {
  for (const f of [
    'public/data/wiki-items.json',
    'public/data/wiki-enemies.json',
    'public/data/wiki-bosses.json',
  ]) {
    await cleanFile(f)
  }
  const items = JSON.parse(await readFile(join(ROOT, 'public/data/wiki-items.json'), 'utf8'))
  const g = items.find((i) => i.id === 'gravity-globe')
  console.log('gravity-globe =>', g?.name, g?.rarity, g?.progression, g?.description)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
