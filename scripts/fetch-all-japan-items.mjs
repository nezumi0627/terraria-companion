/**
 * Fetch ALL item pages from Terraria Japan Wiki wikitext
 * (same source as https://terraria.arcenserv.info/w/index.php?title=…&action=edit).
 *
 * Speed: batch query API (50 titles/request, parallel) — not 1 title + sleep.
 *
 * Usage:
 *   node scripts/fetch-all-japan-items.mjs
 *   node scripts/fetch-all-japan-items.mjs --resume
 *   WIKI_ITEM_LIMIT=200 node scripts/fetch-all-japan-items.mjs
 *   WIKI_FETCH_CONCURRENCY=12 WIKI_BATCH_SIZE=50 node scripts/fetch-all-japan-items.mjs
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEntityText, looksLikeBadName, matchRedirectTarget } from './lib/wiki-parse.mjs'
import { fetchWikitextResolved, fetchParseLinks, fetchCategoryMembers } from './lib/wiki-fetch.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'data', 'wiki')
const LIMIT = Number(process.env.WIKI_ITEM_LIMIT || 99999)
const RESUME = process.argv.includes('--resume')

/** Item hubs on Japan Wiki (English page titles linked from these lists). */
const HUBS = [
  { hub: '武器', kind: 'weapon' },
  { hub: '防具', kind: 'armor' },
  { hub: 'アクセサリー', kind: 'accessory' },
  { hub: 'ポーション類', kind: 'potion' },
  { hub: '道具', kind: 'tool' },
  { hub: 'Pickaxe', kind: 'tool' },
  { hub: 'Axe', kind: 'tool' },
  { hub: 'Hammer', kind: 'tool' },
  { hub: 'Mount', kind: 'mount' },
  { hub: 'Pet', kind: 'pet' },
  { hub: 'ブロック類', kind: 'block' },
  { hub: '雑貨', kind: 'material' },
  { hub: '家具類', kind: 'furniture' },
  { hub: '染料', kind: 'material' },
  { hub: '背景壁', kind: 'block' },
  { hub: '衣装', kind: 'armor' },
  { hub: '照明', kind: 'furniture' },
  { hub: 'メカニズム', kind: 'furniture' },
  { hub: 'Ores', kind: 'material' },
  { hub: 'Bars', kind: 'material' },
  { hub: '翼', kind: 'accessory' },
  { hub: 'Wings', kind: 'accessory' },
]

const CATEGORIES = [
  'Category:アクセサリー',
  'Category:武器',
  'Category:防具',
  'Category:ツール',
  'Category:ポーション',
  'Category:マウント',
  'Category:ペット',
  'Category:ブロック',
  'Category:家具',
  'Category:素材',
  'Category:Treasure Bagから入手',
  'Category:Wing',
  'Category:道具',
]

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function isJunkTitle(title) {
  return (
    /^(Bleeding|Burning|Confused|Stoned|Venom|Poisoned|Cursed|Silenced|Darkness|Slow|Weak|Broken Armor|On Fire!|Frostburn|Mana|Star|Slime|Chest|Grass|Torch|Hooks|Minion|Modifier|Expert Mode|Master Mode|Journey Mode|Hardmode|Bestiary|Christmas Event|Halloween Event|Don't dig up|Developer items|Full Moon|New Moon|Lava|Bullets|Ogre|Get fixed boi)$/i.test(
      title,
    ) ||
    /^\d+(\.\d+)+$/.test(title) ||
    /\(debuff\)$/i.test(title)
  )
}

function isLikelyEntityTitle(title) {
  if (!title) return false
  if (title.includes(':')) return false
  if (/^(List of|Guide:|Category:|Template:|Module:)/i.test(title)) return false
  if (/一覧|リスト|ガイド|テンプレート|カテゴリ|簡易一覧/.test(title)) return false
  if (!/^[A-Za-z0-9]/.test(title)) return false
  if (title.length > 70) return false
  if (isJunkTitle(title)) return false
  return true
}

async function collectLinksFromHub(hubTitle) {
  const { links, wt } = await fetchParseLinks(hubTitle)
  const redirect = matchRedirectTarget(wt)
  if (redirect) return collectLinksFromHub(redirect)
  return [...new Set(links.filter(isLikelyEntityTitle))]
}

async function collectCategoryMembers(cmtitle) {
  const titles = await fetchCategoryMembers(cmtitle)
  return titles.filter(isLikelyEntityTitle)
}

function entityFromWikitext(title, kind, wt, redirectChain) {
  const parsedText = parseEntityText(wt, title, kind)
  let name = parsedText.name
  if (looksLikeBadName(name)) name = title
  if (
    redirectChain.length &&
    /(?:armor|set)$/i.test(redirectChain[redirectChain.length - 1] || '') &&
    name !== title &&
    !/[ぁ-んァ-ヶ一-龥]/.test(name)
  ) {
    name = title
  }
  if (
    redirectChain.length &&
    /(?:armor|set)$/i.test(redirectChain[redirectChain.length - 1] || '') &&
    /鎧|セット|防具$/.test(name)
  ) {
    name = title
  }
  return {
    id: slugify(title),
    enName: title,
    name,
    kind: parsedText.kind || kind,
    rarity: parsedText.rarity,
    progression: parsedText.progression,
    sprite: title,
    description: parsedText.description,
    source: {
      japanWiki: title,
      redirectTo: redirectChain[0] || undefined,
      wikitext: 'action=query revisions (batch)',
    },
  }
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const outPath = join(OUT, 'all-items.json')

  /** @type {Map<string, { title: string, kind: string }>} */
  const queued = new Map()

  console.log('Collecting titles from hubs…')
  for (const { hub, kind } of HUBS) {
    try {
      const titles = await collectLinksFromHub(hub)
      let added = 0
      for (const title of titles) {
        const id = slugify(title)
        if (!queued.has(id)) {
          queued.set(id, { title, kind })
          added++
        }
      }
      console.log(`  ${hub}: +${added} (listed ${titles.length})`)
    } catch (e) {
      console.warn(`  hub failed ${hub}:`, e.message)
    }
  }

  console.log('Collecting titles from categories…')
  for (const cat of CATEGORIES) {
    try {
      const titles = await collectCategoryMembers(cat)
      let added = 0
      const kindGuess = /武器/.test(cat)
        ? 'weapon'
        : /防具|衣装/.test(cat)
          ? 'armor'
          : /アクセサリ/.test(cat)
            ? 'accessory'
            : /ツール|道具/.test(cat)
              ? 'tool'
              : /ポーション/.test(cat)
                ? 'potion'
                : /マウント/.test(cat)
                  ? 'mount'
                  : /ペット/.test(cat)
                    ? 'pet'
                    : /ブロック|壁/.test(cat)
                      ? 'block'
                      : /家具/.test(cat)
                        ? 'furniture'
                        : 'material'
      for (const title of titles) {
        const id = slugify(title)
        if (!queued.has(id)) {
          queued.set(id, { title, kind: kindGuess })
          added++
        }
      }
      console.log(`  ${cat}: +${added} (listed ${titles.length})`)
    } catch (e) {
      console.warn(`  category failed ${cat}:`, e.message)
    }
  }

  const entries = [...queued.entries()].slice(0, LIMIT)
  console.log(`Queued unique titles: ${queued.size} (processing ${entries.length})`)

  /** @type {Map<string, object>} */
  const entitiesById = new Map()
  if (RESUME) {
    try {
      const prev = JSON.parse(await readFile(outPath, 'utf8'))
      for (const e of prev.entities || []) {
        if (e?.id) entitiesById.set(e.id, e)
      }
      console.log(`Resume: loaded ${entitiesById.size} existing entities`)
    } catch {
      /* no previous */
    }
  }

  const toFetch = []
  for (const [id, { title, kind }] of entries) {
    if (RESUME && entitiesById.has(id) && !looksLikeBadName(entitiesById.get(id).name)) continue
    toFetch.push({ id, title, kind })
  }

  console.log(`Fetching wikitext for ${toFetch.length} titles (batch API)…`)
  const started = Date.now()
  const titles = toFetch.map((x) => x.title)
  const wikitextMap = await fetchWikitextResolved(titles)
  const fetchSec = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`  API done in ${fetchSec}s (${titles.length} titles)`)

  let ok = 0
  let fail = 0
  let redirects = 0
  let skip = entries.length - toFetch.length

  console.log('Parsing entities…')
  for (const { id, title, kind } of toFetch) {
    const resolved = wikitextMap.get(title)
    if (!resolved?.wt) {
      fail++
      continue
    }
    if (resolved.redirectChain?.length) redirects++
    entitiesById.set(id, entityFromWikitext(title, kind, resolved.wt, resolved.redirectChain || []))
    ok++
  }

  const entities = [...entitiesById.values()]
  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'https://terraria.arcenserv.info',
    note: 'wikitext via MediaWiki query batch API',
    totalQueued: queued.size,
    enriched: entities.length,
    entities,
  }
  await writeFile(outPath, JSON.stringify(payload, null, 2))

  const totalSec = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`\nDone: ${entities.length} items -> ${outPath} (${totalSec}s)`)
  console.log(`ok=${ok} skip=${skip} redirects=${redirects} fail=${fail}`)

  const bone = entities.find((e) => e.id === 'bone-glove')
  if (bone) console.log('Bone Glove =>', bone.name)
  else console.warn('Bone Glove not in result set')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
