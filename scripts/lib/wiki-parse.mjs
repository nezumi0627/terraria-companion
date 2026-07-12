/**
 * Shared Japan Wiki entity text parser.
 * Used by rebuild / fetch / merge / clean-public scripts.
 *
 * Goals:
 * - Name from |subname= / {{パンくず}}直後の日本語名{{日本語化}} (never trivia 『』 / ダメージは…)
 * - Description from tooltip JP + lead body prose (never raw |field= leftovers)
 * - Rarity / type / progression from infobox + body clues
 */

const INFOBOX_START =
  /\{\{\s*(?:Item[_\s-]?Infobox2?|item\s*infobox|アイテム情報|Npc_Infobox|Enemy_Infobox|Boss_Infobox)[\s\S]*$/i

/** Remove one top-level {{...}} template starting at index (brace-aware). */
export function removeTemplateAt(text, start) {
  if (text[start] !== '{' || text[start + 1] !== '{') return null
  let depth = 0
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === '{' && text[i + 1] === '{') {
      depth++
      i++
      continue
    }
    if (text[i] === '}' && text[i + 1] === '}') {
      depth--
      i++
      if (depth === 0) {
        return { before: text.slice(0, start), after: text.slice(i + 1), inner: text.slice(start + 2, i - 1) }
      }
    }
  }
  return null
}

/** Strip all top-level {{...}} templates. */
export function stripAllTemplates(text) {
  let t = text
  for (let guard = 0; guard < 80; guard++) {
    const start = t.indexOf('{{')
    if (start < 0) break
    const removed = removeTemplateAt(t, start)
    if (!removed) {
      t = t.slice(0, start) + t.slice(start + 2)
      continue
    }
    t = removed.before + ' ' + removed.after
  }
  return t
}

/** Extract first matching item/npc/enemy infobox inner text. */
export function extractInfoboxInner(wt) {
  if (!wt) return ''
  const m = wt.match(/\{\{\s*(?:Item[_\s-]?Infobox2?|item\s*infobox|アイテム情報)/i)
  if (!m || m.index == null) return ''
  const removed = removeTemplateAt(wt, m.index)
  return removed?.inner || ''
}

/** Parse | key = value pairs from infobox inner (values stop at next |key= or end). */
export function parseInfoboxFields(wt) {
  const inner = extractInfoboxInner(wt)
  const fields = {}
  if (!inner) return fields

  // Normalize newlines; keep pipes as field separators
  const body = inner.replace(/\r\n?/g, '\n')
  const re = /\|\s*([A-Za-z_][\w\s-]*)\s*=\s*/g
  const matches = [...body.matchAll(re)]
  for (let i = 0; i < matches.length; i++) {
    const key = matches[i][1].trim().toLowerCase().replace(/\s+/g, ' ')
    const from = matches[i].index + matches[i][0].length
    const to = i + 1 < matches.length ? matches[i + 1].index : body.length
    let val = body.slice(from, to).trim()
    val = val
      .replace(/\n+/g, ' ')
      .replace(/\{\{[^}]*\}\}/g, ' ')
      .replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/'{2,}/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (key && val) fields[key] = val
  }
  return fields
}

export function cleanName(s) {
  let v = String(s || '')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\[\[File:[^\]]+\]\]/gi, '')
    .replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/'{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!v || v === 'なし') return ''
  if (v.length > 36) return ''
  if (/<br|<hr|耐性$|増加$|減少$|可能になる|無効化|向上する|召喚する$/i.test(v)) return ''
  if (/^(タイプ|ツールチップ|説明|情報|レア|売却|調査)/.test(v)) return ''
  if (/^(レアリティ|希少度|売却|調査|Item\s*ID)$/i.test(v)) return ''
  if (/^ダメージは|^防御力は|^ノックバックは/.test(v)) return ''
  if (/ダメージは|防御力は|ノックバックは|Armorを|難易度で変化/.test(v)) return ''
  if (/^\d+$/.test(v)) return ''
  if (!/[ぁ-んァ-ヶ一-龥A-Za-z0-9]/.test(v)) return ''
  return v
}

export function looksLikeBadName(name) {
  if (!name) return true
  if (/<br|<hr|https?:|TrJpMod|\[\[|\]\]|\{\{/i.test(name)) return true
  if (name.length > 40) return true
  if (/耐性$|増加$|減少$|可能になる|無効化|向上する|を召喚|を放つ|を展開/.test(name)) return true
  if (/^(購入には|防御力は|または|例えば|かなり硬く|数少ない|設置すると|ワールド生成時)/.test(name))
    return true
  // 「ダメージメーター」等の正当な名前は残し、「ダメージは11」だけ弾く
  if (/^ダメージは|^防御力は|^ノックバックは/.test(name)) return true
  if (/ダメージは|防御力は|ノックバックは|難易度で変化|Armorを|相当$/.test(name)) return true
  if (/^\d+(\.\d+)?$/.test(name)) return true
  // Trivia / category false positives that used to come from first 『』
  if (
    /^(IT（イット）|サタデー・ナイト・ライブ|死ぬ|ピーター・パン|たまごっち|ドラえもん|ポケモン|マリオ)$/.test(
      name,
    )
  )
    return true
  return false
}

/**
 * Japanese display name from Japan Wiki wikitext
 * (https://terraria.arcenserv.info — same as action=edit source).
 * Prefer 「骨のグローブ{{日本語化1.4}}」 after {{パンくず…}}. Never 「ダメージは11」.
 */
export function extractJaName(wt, enName) {
  if (!wt) return enName
  const fields = parseInfoboxFields(wt)
  if (fields.subname) {
    const v = cleanName(fields.subname)
    if (v && /[ぁ-んァ-ヶ一-龥]/.test(v) && !looksLikeBadName(v)) return v
  }

  // {{パンくず2|…}}\n\n骨のグローブ{{日本語化1.4}}
  const afterCrumb = wt.match(
    /\{\{\s*パンくず[^{}]*\}\}\s*(?:\r?\n|\s)*([ぁ-んァ-ヶ一-龥々ーA-Za-z0-9「」『』]+)(?:\{\{日本語化[^}]*\}\})?/,
  )
  if (afterCrumb) {
    const v = cleanName(afterCrumb[1])
    if (v && /[ぁ-んァ-ヶ一-龥]/.test(v) && !looksLikeBadName(v)) return v
  }

  // After wikitable |} then JP name + {{日本語化}} or <br>
  const afterTable = wt.match(
    /\|\}\s*(?:\{\{[^}]+\}\}\s*)*(?:\r?\n|\s)*([ぁ-んァ-ヶ一-龥々ー][ぁ-んァ-ヶ一-龥々ーA-Za-z0-9「」『』\s]{0,30}?)(?:\{\{日本語化[^}]*\}\}|\s*<br)/,
  )
  if (afterTable) {
    const v = cleanName(afterTable[1])
    if (v && /[ぁ-んァ-ヶ一-龥]/.test(v) && !looksLikeBadName(v)) return v
  }

  // Common Japan Wiki lead: strip info table, then 「天使の翼。」 / 「アグレット (…訳)」 / 「王女。」
  const body = wt
    .replace(/\{\|[\s\S]*?\|\}/, '\n')
    .replace(/\{\{\s*参照[^}]*\}\}/g, '\n')
    .replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
  const leadName = body.match(
    /(?:^|\n)\s*(?:[^\nぁ-んァ-ヶ一-龥]{0,40}\n+)*\s*([ぁ-んァ-ヶ一-龥々ー][ぁ-んァ-ヶ一-龥々ーA-Za-z0-9・＝\-「」]{0,24})\s*(?:\([^)\n]{0,90}\)|（[^）\n]{0,90}）)?\s*[。．]?\s*(?:\n|<br|$)/m,
  )
  if (leadName) {
    const v = cleanName(leadName[1])
    if (
      v &&
      /[ぁ-んァ-ヶ一-龥]/.test(v) &&
      !looksLikeBadName(v) &&
      !/^(情報|タイプ|説明|参照|レア|売却|調査|飛行時間|高さ|アクセサリー|アイテム|武器|防具)$/.test(v)
    ) {
      return v
    }
  }

  const localized = wt
    .slice(0, 2500)
    .match(
      /(?:^|\n)\s*([ぁ-んァ-ヶ一-龥々ー][ぁ-んァ-ヶ一-龥々ーA-Za-z0-9「」『』・＝\-\s]{0,40}?)\s*\{\{\s*日本語化/,
    )
  if (localized) {
    const v = cleanName(localized[1])
    if (v && !looksLikeBadName(v)) return v
  }

  const head = wt.slice(0, 1200)
  const base = head.match(/BASEPAGENAME\}\}\s*<br\s*\/?>\s*([^\n|{]+)/i)
  if (base) {
    const v = cleanName(base[1])
    if (v && /[ぁ-んァ-ヶ一-龥]/.test(v) && !looksLikeBadName(v)) return v
  }

  const header = head.match(
    /![^|\n]*\|\s*\{\{BASEPAGENAME\}\}\s*<br\s*\/?>\s*([ぁ-んァ-ヶ一-龥][^\n|{']{0,40})/,
  )
  if (header) {
    const v = cleanName(header[1])
    if (v && !looksLikeBadName(v)) return v
  }

  const bracket = head.match(/『([^』]{1,36})』/)
  if (bracket) {
    const v = cleanName(bracket[1])
    if (v && /[ぁ-んァ-ヶ一-龥]/.test(v) && !looksLikeBadName(v)) return v
  }

  return enName
}

/** Pull Japanese phrases out of a mixed EN/JP tooltip string. */
export function extractJapanesePhrases(text) {
  if (!text) return []
  const parts = []
  // Contiguous JP runs only (do not drag leading English into the match)
  const re = /[ぁ-んァ-ヶ一-龥々ー「」『』（）％%・、。．！？]+(?:\s*[ぁ-んァ-ヶ一-龥々ー「」『』（）％%・、。．！？0-9]+)*/g
  let m
  while ((m = re.exec(text))) {
    let p = m[0].replace(/\s+/g, ' ').trim()
    if (p.length < 2) continue
    if (/^(タイプ|ツールチップ|説明|情報)$/.test(p)) continue
    parts.push(p)
  }
  return parts
}

function cutBeforeHistory(wt) {
  const cut = wt.search(
    /\n==\s*(クラフト|Crafting|更新|History|Notes|Trivia|ギャラリー|Gallery|参考|See also)/i,
  )
  return cut > 0 ? wt.slice(0, cut) : wt
}

export function extractDescription(wt, name, enName) {
  const label = name || enName || 'アイテム'
  if (!wt) return `${label}。`

  const fields = parseInfoboxFields(wt)
  const tipParts = []
  for (const key of ['tooltip', 'ツールチップ', '説明']) {
    if (!fields[key]) continue
    for (const p of extractJapanesePhrases(fields[key])) {
      if (/^「/.test(p)) continue
      if (!tipParts.includes(p)) tipParts.push(p)
    }
  }

  let body = cutBeforeHistory(wt)
  // Keep linked item names before wiping templates
  body = body
    .replace(/\{\{(?:item\s*link|item|アイテム|Item)\s*\|\s*([^}|]+?)(?:\|[^}]*)?\}\}/gi, '$1')
    .replace(/\{\{gc\|(\d+)\}\}/gi, '$1金')
    .replace(/\{\{sc\|(\d+)\}\}/gi, '$1銀')
    .replace(/\{\{cc\|(\d+)\}\}/gi, '$1銅')

  // Remove main infobox first (brace-aware), then other templates
  const box = body.match(/\{\{\s*(?:Item[_\s-]?Infobox2?|item\s*infobox|アイテム情報)/i)
  if (box && box.index != null) {
    const rem = removeTemplateAt(body, box.index)
    if (rem) body = rem.before + '\n' + rem.after
  }
  body = stripAllTemplates(body)
    .replace(/\{\|[\s\S]*?\|\}/g, '\n')
    .replace(/\(\s*\[[^\]]*https?:\/\/[^\]]*\][^\)]*訳\s*\)/gi, '')
    .replace(/\(\s*\[[^\]]*TrJpMod[^\]]*\][^\)]*訳\s*\)/gi, '')
    .replace(/（?\s*日本語化プロジェクト訳\s*）?/g, '')
    .replace(/\[[^\]]*https?:\/\/[^\]]*\]/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[\[File:[^\]]+\]\]/gi, '')
    .replace(/<br\s*\/?>/gi, '。')
    .replace(/<hr\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/'{2,}/g, '')
    .replace(/Category:[^\s]+/g, ' ')
    .replace(/(?:アイテム|アクセサリー|武器|防具|雑貨)\s*[>＞]\s*[^\n。]{0,40}/g, ' ')
    .replace(/\|\s*[A-Za-z_][\w\s-]*\s*=/g, ' ')

  const lines = body
    .split(/\n+/)
    .map((l) =>
      l
        .replace(/は\s+などと/g, 'は他の効果などと')
        .replace(/から\s+で購入/g, 'からNPCで購入')
        .replace(/の\s+が/g, 'の敵が')
        .replace(/。{2,}/g, '。')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((l) => {
      if (l.length < 12) return false
      if (!/[ぁ-んァ-ヶ一-龥]/.test(l)) return false
      if (/^(タイプ|ツールチップ|説明|レア|売却|調査|情報|参照|Item ID)/.test(l)) return false
      if (/^(アイテム|アクセサリー|武器|防具)\s*[>＞]/.test(l)) return false
      if (/subname|placeable|cellpadding|colspan/i.test(l)) return false
      if (l === name || l === `${name}。`) return false
      // Reject leftover field crumbs
      if (/^\|/.test(l) || /=\s*$/.test(l)) return false
      return true
    })

  const parts = []
  for (const t of tipParts) {
    if (!parts.includes(t)) parts.push(t)
    if (parts.length >= 2) break
  }
  for (const line of lines) {
    if (parts.some((p) => p.includes(line.slice(0, 10)) || line.includes(p.slice(0, 10)))) continue
    parts.push(line)
    if (parts.length >= 3) break
  }

  const quote = extractJapanesePhrases(fields.tooltip || '').find((t) => /^「/.test(t))
  if (quote && parts.length < 3) parts.push(quote)

  let out = parts.join('。').replace(/。{2,}/g, '。').trim()
  // Only collapse obvious template holes ("する 。高い" / "。を"), never real sentence ends
  out = out
    .replace(/([をがにのはでと])\s*。\s*(?=[をがにのはでと、「『]|$)/g, '$1')
    .replace(/。\s{2,}/g, '。')
    .replace(/\s+/g, ' ')
    .replace(/。{2,}/g, '。')
    .trim()
  if (out && !out.endsWith('。') && !out.endsWith('！') && !out.endsWith('？')) out += '。'
  if (out.length < 8) {
    // Last resort: any long JP run in stripped body
    const ja = body.match(/[ぁ-んァ-ヶ一-龥々ー「」『』（）％%・、。．！？A-Za-z0-9\s]{20,280}/)
    if (ja) {
      out = ja[0].replace(/\s+/g, ' ').replace(/。{2,}/g, '。').trim()
      if (!out.endsWith('。')) out += '。'
    }
  }
  if (out.length < 8) out = `${label}に関する情報。`
  return out.slice(0, 360)
}

const RARITY_MAP = [
  [/rainbow|rainbow\.gif|レアリティ.?虹|rainbow/i, 'rainbow'],
  [/rarity_color_red|fiery.?red|\bred\.gif\b|レアリティ.?赤/i, 'red'],
  [/yellow|アンバー|amber/i, 'yellow'],
  [/cyan|水色/i, 'cyan'],
  [/lime|黄緑/i, 'lime'],
  [/light.?purple|紫/i, 'lightpurple'],
  [/pink|桃/i, 'pink'],
  [/light.?red|橙?赤|salmon/i, 'lightred'],
  [/orange|橙/i, 'orange'],
  [/green|緑/i, 'green'],
  [/blue|青/i, 'blue'],
  [/white|白|グレー|gray|grey/i, 'white'],
]

export function extractRarity(wt, fields) {
  const f = fields || parseInfoboxFields(wt)
  const raw = `${f.rarity || f.rare || ''} ${f['rare level'] || ''}`
  for (const [re, id] of RARITY_MAP) {
    if (re.test(raw)) return id
  }
  // Expert / Master often rainbow-adjacent
  if (/expert|master|エキスパート|マスター/i.test(wt.slice(0, 2000))) {
    if (/rainbow/i.test(wt.slice(0, 2500))) return 'rainbow'
  }
  return 'white'
}

const TYPE_TO_KIND = [
  [/武器|weapon/i, 'weapon'],
  [/防具|armor|helmet|breastplate|greaves/i, 'armor'],
  [/アクセサリ|accessory/i, 'accessory'],
  [/ツール|道具|tool|pickaxe|axe|hammer|hook/i, 'tool'],
  [/ポーション|potion|食料|food/i, 'potion'],
  [/マウント|mount/i, 'mount'],
  [/ペット|pet|light pet/i, 'pet'],
  [/家具|furniture/i, 'furniture'],
  [/ブロック|block|壁|wall/i, 'block'],
  [/素材|material|ore|bar/i, 'material'],
]

export function extractKindFromType(wt, fallbackKind) {
  const fields = parseInfoboxFields(wt)
  const type = fields.type || fields['type '] || ''
  for (const [re, kind] of TYPE_TO_KIND) {
    if (re.test(type)) return kind
  }
  return fallbackKind
}

export function guessProgression(text, wt = '') {
  const t = `${text} ${wt}`.toLowerCase()
  if (/moon lord|ムーンロード|lunar (pillar|event)|nebula|solar|vortex|stardust|エンドゲーム|ポストムーン/.test(t))
    return 'endgame'
  if (
    /hardmode|ハードモード|wall of flesh|ウォール・?オブ・?フレッシュ|mechanical boss|plantera|golem|empress|duke fishron|empress of light/.test(
      t,
    )
  )
    return 'hardmode'
  // Expert Moon Lord drops are endgame even without the word hardmode
  if (/expert mode|エキスパート/.test(t) && /moon lord|ムーンロード/.test(t)) return 'endgame'
  return 'pre-hardmode'
}

/** True if stored description is leftover infobox junk or a useless stub. */
export function isBadDescription(desc, name) {
  const d = String(desc || '').trim()
  if (!d) return true
  if (/^\|/.test(d)) return true
  if (/\bsubname\s*=|\bplaceable\s*=|\btype\s*=/i.test(d)) return true
  if (/Terrariaのアイテムです/.test(d)) return true
  if (/説明を準備中/.test(d)) return true
  if (name && d === `${name}。`) return true
  if (d.length < 10) return true
  return false
}

/** Full parse for one wiki page. */
export function parseEntityText(wt, enName, fallbackKind) {
  const nameRaw = extractJaName(wt, enName)
  let name = looksLikeBadName(nameRaw) ? enName || nameRaw : nameRaw
  const fields = parseInfoboxFields(wt)
  let description = extractDescription(wt, name, enName)
  description = description.replace(/、\s*。/g, '、').replace(/。\s*。/g, '。')

  // If name stayed English, recover JP title from lead "○○は、" / "○○（）は"
  if (name && !/[ぁ-んァ-ヶ一-龥]/.test(name)) {
    const fromDesc = description.match(
      /^([ぁ-んァ-ヶ一-龥々ーA-Za-z0-9・＝\-−]{1,36})\s*(?:（\s*）|\([^)]*\))?\s*は[、,]/,
    )
    if (fromDesc) {
      const candidate = cleanName(fromDesc[1])
      if (candidate && /[ぁ-んァ-ヶ一-龥]/.test(candidate) && !looksLikeBadName(candidate)) {
        name = candidate
      }
    }
  }

  // Drop redundant "名前（ ）は、" lead once the name is known
  if (name) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    description = description
      .replace(new RegExp(`^${esc}\\s*(?:（\\s*）|\\([^)]*\\))?\\s*は[、,]\\s*`), '')
      .replace(/^（\s*）は[、,]?\s*/, '')
      .replace(/^\([^)]{0,40}\)は[、,]?\s*/, '')
      .trim()
    if (description && !/[。！？]$/.test(description)) description += '。'
  }

  const rarity = extractRarity(wt, fields)
  const kind = extractKindFromType(wt, fallbackKind)
  const progression = guessProgression(`${description} ${fields.tooltip || ''}`, wt)
  return { name, description, rarity, kind, progression, fields }
}
