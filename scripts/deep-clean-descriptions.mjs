import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const WIKI = join(process.cwd(), 'data', 'wiki')

function cleanDescription(raw, name, enName) {
  let t = String(raw || '')

  // Drop HTML-ish / wiki table scaffolding early
  t = t
    .replace(/cellpadding[\s\S]*?(?=情報|タイプ|ツールチップ|$)/gi, ' ')
    .replace(/style\s*=\s*'[^']*'/gi, ' ')
    .replace(/style\s*=\s*"[^"]*"/gi, ' ')
    .replace(/colspan\s*=\s*\d+/gi, ' ')
    .replace(/align\s*=\s*'[^']*'/gi, ' ')
    .replace(/border\s*=\s*'[^']*'/gi, ' ')
    .replace(/<!-+[\s\S]*?-+>/g, ' ')

  for (let i = 0; i < 10; i++) {
    const next = t.replace(/\{\{[^{}]*\}\}/g, ' ')
    if (next === t) break
    t = next
  }

  t = t
    .replace(/\{\|[\s\S]*?\|\}/g, ' ')
    .replace(/\|-/g, ' ')
    .replace(/\|{1,2}/g, ' ')
    .replace(/!{1,2}/g, ' ')
    .replace(/Category:[^\s]+/g, ' ')
    .replace(/\[\[File:[^\]]+\]\]/gi, ' ')
    .replace(/\[\[file:[^\]]+\]\]/gi, ' ')
    .replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<hr\s*\/?>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '。')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\b(background|color|font-size|min-width|border-collapse|padding|border)\b[:#]?[^\s]*/gi, ' ')
    .replace(/#[0-9A-Fa-f]{3,8}\b/g, ' ')
    .replace(/\bE4F0F7\b|\b063B5E\b/gi, ' ')
    .replace(/\b(right|left|center|separate)\b/gi, ' ')
    .replace(/\b\d+px\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Strip leading junk labels from infobox dumps
  t = t
    .replace(/^(情報|タイプ|ツールチップ|レア度|売却|調査|Item ID|オート攻撃|damage|critical|speed|knockback)\s*/gi, '')
    .replace(/^(アクセサリー|素材|武器|防具|ペット|ブロック)\s*[・\-–]?\s*/g, '')

  // Prefer Japanese sentences
  const jaParts = t
    .split(/(?<=[。．！？])\s*/)
    .map((s) => s.trim())
    .filter((s) => /[ぁ-んァ-ヶ一-龥]/.test(s) && s.length >= 8 && !/cellpadding|colspan|border-collapse/i.test(s))

  if (jaParts.length) {
    return jaParts.slice(0, 2).join('').slice(0, 280)
  }

  // English tooltip fallback (short)
  const tip = t.match(/(?:ツールチップ|tooltip)\s*[:：]?\s*(.{10,120})/i)
  if (tip) {
    const cleaned = tip[1].replace(/\s+/g, ' ').trim().slice(0, 160)
    if (cleaned && !/cellpadding|colspan/i.test(cleaned)) {
      return `${name}。${cleaned}`
    }
  }

  const fallback = `${name}${enName && enName !== name ? `（${enName}）` : ''}。Terraria Japan Wikiより。`
  if (t.length < 12 || /cellpadding|colspan|border-collapse|min-width/i.test(t)) return fallback
  return t.slice(0, 280)
}

let fixed = 0
for (const file of readdirSync(WIKI).filter((f) => f.endsWith('.json') && f !== 'index.json')) {
  const path = join(WIKI, file)
  const data = JSON.parse(readFileSync(path, 'utf8'))
  let n = 0
  for (const e of data.entities || []) {
    const next = cleanDescription(e.description, e.name || e.enName, e.enName)
    if (next !== e.description) {
      e.description = next
      n++
    }
  }
  writeFileSync(path, JSON.stringify(data, null, 2))
  fixed += n
  console.log(`${file}: cleaned ${n}`)
}
console.log('total cleaned', fixed)
