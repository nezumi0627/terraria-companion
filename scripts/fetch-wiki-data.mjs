/**
 * Mirror Terraria Japan Wiki (+ official sprites names) into data/wiki/.
 * Primary source: https://terraria.arcenserv.info
 *
 * Usage:
 *   node scripts/fetch-wiki-data.mjs
 *   node scripts/fetch-wiki-data.mjs --force
 *   set WIKI_ENRICH_LIMIT=300 && node scripts/fetch-wiki-data.mjs --force
 */
import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEntityText, matchRedirectTarget, looksLikeBadName } from './lib/wiki-parse.mjs'
import { fetchWikitextResolved, fetchParseLinks } from './lib/wiki-fetch.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'data', 'wiki')

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
  if (/一覧|リスト|ガイド|テンプレート|カテゴリ/.test(title)) return false
  // Prefer English page titles used by Japan wiki (Zenith, King Slime, …)
  if (!/^[A-Za-z0-9]/.test(title)) return false
  if (title.length > 60) return false
  return true
}

function extractInfoboxField(wikitext, label) {
  const re = new RegExp(`\\|\\s*'''?${label}'''?\\s*\\|\\|\\s*([^\\n|]+)`, 'i')
  const m = wikitext.match(re)
  return m ? m[1].replace(/\{\{[^}]+\}\}/g, '').trim() : undefined
}

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function collectLinksFromHub(hubTitle) {
  const { links, wt } = await fetchParseLinks(hubTitle)
  const redirect = matchRedirectTarget(wt)
  if (redirect) return collectLinksFromHub(redirect)
  const titles = [...new Set(links.filter(isLikelyEntityTitle))]
  return { titles, redirectTo: null }
}

async function enrich(titles, kind) {
  const limit = Number(process.env.WIKI_ENRICH_LIMIT || 99999)
  const sample = titles.slice(0, limit)
  console.log(`  enriching ${sample.length}/${titles.length} (${kind})…`)
  const started = Date.now()
  const wikitextMap = await fetchWikitextResolved(sample)
  const entities = []
  for (const title of sample) {
    const resolved = wikitextMap.get(title)
    const wt = resolved?.wt || ''
    if (!wt) {
      process.stdout.write('!')
      continue
    }
    const parsed = parseEntityText(wt, title, kind)
    let name = parsed.name
    if (looksLikeBadName(name)) name = title
    const hp = extractInfoboxField(wt, 'HP') || extractInfoboxField(wt, '体力')
    const damage = extractInfoboxField(wt, 'damage') || extractInfoboxField(wt, '攻撃力')
    entities.push({
      id: slugify(title),
      enName: title,
      name,
      kind: parsed.kind || kind,
      rarity: parsed.rarity,
      progression: parsed.progression,
      sprite: title,
      description: parsed.description,
      hp,
      damage,
      source: {
        japanWiki: title,
        redirectTo: resolved.redirectChain?.[0] || undefined,
      },
    })
    process.stdout.write(resolved.redirectChain?.length ? 'R' : '.')
  }
  const sec = ((Date.now() - started) / 1000).toFixed(1)
  process.stdout.write(`\n  (${sec}s)\n`)
  return entities
}

async function writeCategory({ hub, kind, file }) {
  const outPath = join(OUT, file)
  if ((await exists(outPath)) && !process.argv.includes('--force')) {
    console.log(`skip ${file}`)
    const prev = JSON.parse(await readFile(outPath, 'utf8'))
    return { file, kind, totalListed: prev.totalListed, enriched: prev.enriched }
  }

  console.log(`Hub: ${hub} -> ${file}`)
  const { titles } = await collectLinksFromHub(hub)
  console.log(`  listed ${titles.length}`)
  const entities = await enrich(titles, kind)
  const payload = {
    hub,
    kind,
    totalListed: titles.length,
    enriched: entities.length,
    titles,
    entities,
  }
  await writeFile(outPath, JSON.stringify(payload, null, 2))
  console.log(`  wrote ${file} (enriched ${entities.length})`)
  return { file, kind, totalListed: titles.length, enriched: entities.length }
}

async function main() {
  await mkdir(OUT, { recursive: true })

  const hubs = [
    { hub: '武器', kind: 'weapon', file: 'weapons.json' },
    { hub: '防具', kind: 'armor', file: 'armor.json' },
    { hub: 'アクセサリー', kind: 'accessory', file: 'accessories.json' },
    { hub: 'ポーション類', kind: 'potion', file: 'potions.json' },
    { hub: '道具', kind: 'tool', file: 'tools.json' },
    { hub: 'Pickaxe', kind: 'tool', file: 'pickaxes.json' },
    { hub: 'Axe', kind: 'tool', file: 'axes.json' },
    { hub: 'Hammer', kind: 'tool', file: 'hammers.json' },
    { hub: 'Mount', kind: 'mount', file: 'mounts.json' },
    { hub: 'Pet', kind: 'pet', file: 'pets.json' },
    { hub: 'モンスター', kind: 'enemy', file: 'enemies.json' },
    { hub: 'Bestiary', kind: 'enemy', file: 'bestiary.json' },
    { hub: 'NPC', kind: 'npc', file: 'npcs.json' },
  ]

  const index = {
    generatedAt: new Date().toISOString(),
    sources: { japan: 'https://terraria.arcenserv.info' },
    files: {},
  }

  for (const h of hubs) {
    try {
      const meta = await writeCategory(h)
      index.files[h.file] = meta
    } catch (e) {
      console.warn(`Failed ${h.hub}:`, e.message)
    }
  }

  await writeFile(join(OUT, 'index.json'), JSON.stringify(index, null, 2))
  console.log('Done ->', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
