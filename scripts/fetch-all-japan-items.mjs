/**
 * Fetch ALL item pages from Terraria Japan Wiki wikitext
 * (same source as https://terraria.arcenserv.info/w/index.php?title=…&action=edit).
 *
 * Usage:
 *   node scripts/fetch-all-japan-items.mjs
 *   set WIKI_ITEM_LIMIT=200 && node scripts/fetch-all-japan-items.mjs   # smoke test
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEntityText, looksLikeBadName, matchRedirectTarget } from './lib/wiki-parse.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'data', 'wiki')
const UA = 'TerrariaCompanionLocal/1.0 (offline mirror; Japan Wiki wikitext)'
const JP = 'https://terraria.arcenserv.info/w/api.php'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
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

async function mw(params) {
  const url = new URL(JP)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  url.searchParams.set('format', 'json')
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.status === 429 || res.status === 503) {
      await sleep(1500 * (attempt + 1))
      continue
    }
    if (!res.ok) throw new Error(`JP wiki ${res.status}`)
    return res.json()
  }
  throw new Error('rate limited')
}

async function parsePage(title) {
  const json = await mw({ action: 'parse', page: title, prop: 'links|wikitext' })
  await sleep(55)
  if (json.error) return null
  return json.parse
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
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

function matchRedirect(wt) {
  return matchRedirectTarget(wt)
}

function isJunkTitle(title) {
  return /^(Bleeding|Burning|Confused|Stoned|Venom|Poisoned|Cursed|Silenced|Darkness|Slow|Weak|Broken Armor|On Fire!|Frostburn|Mana|Star|Slime|Chest|Grass|Torch|Hooks|Minion|Modifier|Expert Mode|Master Mode|Journey Mode|Hardmode|Bestiary|Christmas Event|Halloween Event|Don't dig up|Developer items|Full Moon|New Moon|Lava|Bullets|Ogre|Get fixed boi)$/i.test(
    title,
  ) || /^\d+(\.\d+)+$/.test(title) || /\(debuff\)$/i.test(title)
}

async function resolvePage(title, depth = 0) {
  const parsed = await parsePage(title)
  const wt = parsed?.wikitext?.['*'] || ''
  const redir = matchRedirect(wt)
  if (redir && depth < 3) {
    const next = await resolvePage(redir, depth + 1)
    return { ...next, redirectChain: [redir, ...(next.redirectChain || [])] }
  }
  return { wt, redirectChain: [] }
}

async function collectLinksFromHub(hubTitle) {
  const parsed = await parsePage(hubTitle)
  if (!parsed) return []
  const wt = parsed.wikitext?.['*'] || ''
  const redirect = wt.match(/^#redirect\s*\[\[([^\]]+)\]\]/i)
  if (redirect) return collectLinksFromHub(redirect[1])
  return [...new Set((parsed.links || []).map((l) => l['*']).filter(isLikelyEntityTitle))]
}

async function collectCategoryMembers(cmtitle) {
  const titles = []
  let cmcontinue
  for (let guard = 0; guard < 40; guard++) {
    const params = {
      action: 'query',
      list: 'categorymembers',
      cmtitle,
      cmlimit: 500,
      cmtype: 'page',
    }
    if (cmcontinue) params.cmcontinue = cmcontinue
    const json = await mw(params)
    await sleep(60)
    if (json.error) break
    for (const m of json.query?.categorymembers || []) {
      if (isLikelyEntityTitle(m.title)) titles.push(m.title)
    }
    cmcontinue = json.continue?.cmcontinue
    if (!cmcontinue) break
  }
  return titles
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
      const kindGuess =
        /武器/.test(cat)
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

  let ok = 0
  let skip = 0
  let fail = 0
  let redirects = 0
  const started = Date.now()

  for (let i = 0; i < entries.length; i++) {
    const [id, { title, kind }] = entries[i]
    if (RESUME && entitiesById.has(id) && !looksLikeBadName(entitiesById.get(id).name)) {
      skip++
      continue
    }
    try {
      const { wt, redirectChain } = await resolvePage(title)
      if (!wt) {
        fail++
        process.stdout.write('!')
        continue
      }
      if (redirectChain.length) {
        redirects++
        process.stdout.write('R')
      }
      // Armor/set pages: keep the original item title as English name
      const parseAs = title
      const parsedText = parseEntityText(wt, parseAs, kind)
      let name = parsedText.name
      if (looksLikeBadName(name)) name = title
      // If we followed a redirect to a set/armor page, don't replace piece name with set name
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
      entitiesById.set(id, {
        id,
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
          wikitext: 'action=parse (same as action=edit)',
        },
      })
      ok++
      process.stdout.write('.')
    } catch (e) {
      fail++
      process.stdout.write('!')
      console.warn(`\n  fail ${title}:`, e.message)
    }

    if ((i + 1) % 50 === 0) {
      const elapsed = ((Date.now() - started) / 1000).toFixed(0)
      console.log(`\n  [${i + 1}/${entries.length}] ok=${ok} skip=${skip} redir=${redirects} fail=${fail} ${elapsed}s`)
      const payload = {
        generatedAt: new Date().toISOString(),
        source: 'https://terraria.arcenserv.info',
        note: 'wikitext via MediaWiki parse API (= action=edit source)',
        totalQueued: queued.size,
        enriched: entitiesById.size,
        entities: [...entitiesById.values()],
      }
      await writeFile(outPath, JSON.stringify(payload, null, 2))
    }
  }

  const entities = [...entitiesById.values()]
  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'https://terraria.arcenserv.info',
    note: 'wikitext via MediaWiki parse API (= action=edit source)',
    totalQueued: queued.size,
    enriched: entities.length,
    entities,
  }
  await writeFile(outPath, JSON.stringify(payload, null, 2))
  console.log(`\nDone: ${entities.length} items -> ${outPath}`)
  console.log(`ok=${ok} skip=${skip} redirects=${redirects} fail=${fail}`)

  // Spot-check Bone Glove
  const bone = entities.find((e) => e.id === 'bone-glove')
  if (bone) console.log('Bone Glove =>', bone.name)
  else console.warn('Bone Glove not in result set')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
