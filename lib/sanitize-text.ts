/** Strip leftover wiki/HTML/mod-note junk from entity descriptions for safe UI display. */

const INFOBOX_KEYS =
  'subname|type|placeable|rare|rarity|damage|knockback|stack|tooltip|defense|body\\s*slot|sell|buy|research|consumable|use\\s*time|velocity|mana|critical\\s*chance|bonus|hardmode|auto|pickaxe\\s*power|axe\\s*power|hammer\\s*power|size|tool|id'

export function sanitizeDescription(
  raw: string | undefined,
  fallbackName?: string,
): string {
  if (!raw) return fallbackName ? `${fallbackName}に関する情報。` : ''

  let t = raw
    // Drop reference / translation notes early
    .replace(/\{\{\s*参照[^}]*\}\}/gi, ' ')
    .replace(/\(\s*\[[^\]]*https?:\/\/[^\]]*訳\s*\)/gi, '')
    .replace(/\(\s*\[[^\]]*wikiwiki[^\]]*\][^\)]*訳\s*\)/gi, '')
    .replace(/\(\s*\[[^\]]*TrJpMod[^\]]*\][^\)]*訳\s*\)/gi, '')
    .replace(/（?\s*日本語化プロジェクト訳\s*）?/g, '')
    .replace(/\(\s*日本語化プロジェクト訳\s*\)/g, '')
    .replace(/\[[^\]]*https?:\/\/[^\]]*\]/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/Category:[^\s。]+/g, ' ')
    // Only strip known infobox keys with bounded values — never eat trailing JP prose
    .replace(new RegExp(`\\|\\s*(?:${INFOBOX_KEYS})\\s*=\\s*[^|\\n]{0,120}`, 'gi'), ' ')
    .replace(
      new RegExp(
        `\\b(?:${INFOBOX_KEYS})\\s*=\\s*[^。|\\n]{0,80}。?`,
        'gi',
      ),
      ' ',
    )
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
    .replace(/は\s+などと/g, 'は他の効果などと')
    .replace(/から\s+で購入/g, 'からNPCで購入')
    .replace(/の\s+が/g, 'の敵が')
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

  // Pure infobox crumbs with no usable prose
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

  // Drop legacy stub if somehow still present with extra prose
  t = t.replace(/。?\s*Terrariaのアイテムです。?/g, '。').replace(/。{2,}/g, '。').trim()
  if (!t.endsWith('。') && !t.endsWith('！') && !t.endsWith('？') && t.length > 0) t += '。'
  return t.slice(0, 360)
}

/** Fix names that accidentally stored tooltips / HTML / trivia. */
export function sanitizeName(raw: string | undefined, fallback?: string): string {
  const fb = fallback || '不明なアイテム'
  if (!raw) return fb
  let t = raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<hr\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  if (
    !t ||
    t.length > 40 ||
    /耐性$|増加$|減少$|可能になる|無効化|向上する|を召喚|を放つ/.test(t) ||
    /^(購入には|防御力は|または|例えば|かなり硬く|数少ない|設置すると)/.test(t) ||
    /^(IT（イット）|サタデー・ナイト・ライブ|死ぬ|ピーター・パン|たまごっち)$/.test(t) ||
    /^ダメージは|^防御力は|^ノックバックは/.test(t) ||
    /ダメージは|防御力は|ノックバックは|難易度で変化|Armorを|相当$/.test(t) ||
    /^\d+(\.\d+)?$/.test(t)
  ) {
    return fb
  }
  return t
}
