/**
 * Fetch missing Japan-wiki hubs (blocks, furniture, vanity, etc.)
 * and patch Japanese names (e.g. 至高の土ブロック).
 *
 * Usage: node scripts/fetch-missing-items.mjs
 */
import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'data', 'wiki')
const UA = 'TerrariaCompanionLocal/1.0 (offline mirror)'
const JP = 'https://terraria.arcenserv.info/w/api.php'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const HUBS = [
  { hub: 'ブロック類', kind: 'block', file: 'blocks.json' },
  { hub: '雑貨', kind: 'material', file: 'misc.json' },
  { hub: '家具類', kind: 'furniture', file: 'furniture.json' },
  { hub: '染料', kind: 'material', file: 'dyes.json' },
  { hub: '背景壁', kind: 'block', file: 'walls.json' },
  { hub: '衣装', kind: 'armor', file: 'vanity.json' },
  { hub: '照明', kind: 'furniture', file: 'lighting.json' },
  { hub: 'メカニズム', kind: 'furniture', file: 'mechanisms.json' },
  { hub: 'Ores', kind: 'material', file: 'ores.json' },
  { hub: 'Bars', kind: 'material', file: 'bars.json' },
  { hub: '1.4.5新アイテム（簡易一覧）', kind: 'material', file: 'new-145.json' },
  { hub: '1.4.4新アイテム（簡易一覧）', kind: 'material', file: 'new-144.json' },
  { hub: '1.4新アイテム（簡易一覧）', kind: 'material', file: 'new-14.json' },
]

async function mw(params) {
  const url = new URL(JP)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  url.searchParams.set('format', 'json')
  for (let a = 0; a < 5; a++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.status === 429 || res.status === 503) {
      await sleep(1000 * (a + 1))
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }
  throw new Error('rate limited')
}

async function parsePage(title) {
  const json = await mw({ action: 'parse', page: title, prop: 'links|wikitext' })
  await sleep(70)
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
  return true
}

function extractJaName(wikitext, fallback) {
  if (!wikitext) return fallback

  const sub = wikitext.match(/\|\s*subname\s*=\s*([^\n|{]+)/i)
  if (sub) {
    const v = sub[1].trim()
    if (v && v !== 'なし') return v
  }

  // The Dirtiest Block<br>至高の土ブロック
  const brJa = wikitext.match(/BASEPAGENAME\}\}[^\n]*?<br>\s*([ぁ-んァ-ヶ一-龥々ー][^\n|{]{0,40})/)
  if (brJa) return brJa[1].trim()

  const enBrJa = wikitext.match(/[A-Za-z][^<\n]{0,40}<br>\s*([ぁ-んァ-ヶ一-龥々ー][^\n|{']{0,40})/)
  if (enBrJa) return enBrJa[1].trim()

  const bracket = wikitext.match(/『([^』]{1,40})』/)
  if (bracket) return bracket[1].trim()

  // Buff|| ... <br>至高の土ブロック
  const buff = wikitext.match(/Buff[^\n]*?<br>\s*([ぁ-んァ-ヶ一-龥々ー][^\n|]{0,40})/i)
  if (buff) return buff[1].trim()

  const mBox = wikitext.match(/BASEPAGENAME\}\}\s*<br>\s*([^\n|{]+)/)
  if (mBox && /[ぁ-んァ-ヶ一-龥]/.test(mBox[1])) return mBox[1].trim()

  return fallback
}

function cleanDesc(wikitext, name, enName) {
  let t = String(wikitext || '')
  for (let i = 0; i < 8; i++) {
    const next = t.replace(/\{\{[^{}]*\}\}/g, ' ')
    if (next === t) break
    t = next
  }
  t = t
    .replace(/\{\{参照\}\}/g, ' ')
    .replace(/Category:[^\s]+/g, ' ')
    .replace(/\[\[File:[^\]]+\]\]/gi, ' ')
    .replace(/\[\[file:[^\]]+\]\]/gi, ' ')
    .replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/\|[a-zA-Z]+\s*=\s*[^|}]*/g, ' ')
    .replace(/[{}|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Prefer Japanese prose sentences
  const sentences = t.split(/(?<=[。．])\s+/).filter((s) => /[ぁ-んァ-ヶ一-龥]/.test(s) && s.length > 12)
  if (sentences[0]) return sentences[0].slice(0, 360)
  if (t.length < 18) return `${name}（${enName}）。Terraria Japan Wikiより。`
  return t.slice(0, 360)
}

async function collectLinks(hubTitle, depth = 0) {
  const parsed = await parsePage(hubTitle)
  if (!parsed) return []
  const wt = parsed.wikitext?.['*'] || ''
  const redirect = wt.match(/^#redirect\s*\[\[([^\]]+)\]\]/i)
  if (redirect) return collectLinks(redirect[1], depth)
  const titles = [...new Set((parsed.links || []).map((l) => l['*']).filter(isLikelyEntityTitle))]
  return titles
}

async function enrich(titles, kind, limit) {
  const sample = titles.slice(0, limit)
  const entities = []
  console.log(`  enriching ${sample.length}/${titles.length}…`)
  for (const title of sample) {
    const parsed = await parsePage(title)
    const wt = parsed?.wikitext?.['*'] || ''
    if (!wt || /^#redirect/i.test(wt.trim())) {
      process.stdout.write('r')
      continue
    }
    const name = extractJaName(wt, title)
    entities.push({
      id: slugify(title),
      enName: title,
      name,
      kind,
      sprite: title,
      description: cleanDesc(wt, name, title),
      source: { japanWiki: title },
    })
    process.stdout.write('.')
  }
  process.stdout.write('\n')
  return entities
}

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const limit = Number(process.env.WIKI_ENRICH_LIMIT || 500)
  const force = process.argv.includes('--force')

  for (const { hub, kind, file } of HUBS) {
    const outPath = join(OUT, file)
    if ((await exists(outPath)) && !force) {
      const prev = JSON.parse(await readFile(outPath, 'utf8'))
      if ((prev.entities || []).length > 0) {
        console.log(`skip ${file} (${prev.entities.length} entities)`)
        continue
      }
    }
    console.log(`Hub: ${hub}`)
    let titles = []
    try {
      titles = await collectLinks(hub)
    } catch (e) {
      console.warn(`  failed: ${e.message}`)
      continue
    }
    console.log(`  listed ${titles.length}`)
    const entities = await enrich(titles, kind, limit)
    await writeFile(
      outPath,
      JSON.stringify(
        { hub, kind, totalListed: titles.length, enriched: entities.length, titles, entities },
        null,
        2,
      ),
    )
    console.log(`  wrote ${file} (${entities.length})`)
  }

  // Hard patch: 至高の土 (The Dirtiest Block) — user-facing name + search aliases
  await patchDirtiestBlock()
  console.log('Done')
}

async function patchDirtiestBlock() {
  const files = ['pets.json', 'misc.json', 'blocks.json', 'new-14.json', 'new-144.json', 'new-145.json']
  for (const file of files) {
    const path = join(OUT, file)
    if (!(await exists(path))) continue
    const data = JSON.parse(await readFile(path, 'utf8'))
    let changed = false
    for (const e of data.entities || []) {
      if (e.id === 'the-dirtiest-block' || e.enName === 'The Dirtiest Block') {
        e.name = '至高の土ブロック'
        e.kind = 'pet'
        e.description =
          'ワールド生成時に土ブロックに紛れてごく稀に生成されるペット召喚アイテム。見た目は通常の土と同じだが草は生えない。Small最大3・Medium最大6・Large最大9個。通称「至高の土」。'
        e.aliases = ['至高の土', '志向の土', 'しこうのつち', 'The Dirtiest Block', 'dirtiest']
        changed = true
      }
      if (e.id === 'dirt-block' || e.enName === 'Dirt Block') {
        e.name = '土ブロック'
        e.kind = 'block'
        e.aliases = ['土', 'dirt', 'Dirt Block']
        changed = true
      }
    }
    // Ensure entity exists even if hub missed it
    if (file === 'pets.json' || file === 'misc.json') {
      const has = (data.entities || []).some((e) => e.id === 'the-dirtiest-block')
      if (!has) {
        data.entities = data.entities || []
        data.entities.push({
          id: 'the-dirtiest-block',
          enName: 'The Dirtiest Block',
          name: '至高の土ブロック',
          kind: 'pet',
          sprite: 'The Dirtiest Block',
          description:
            'ワールド生成時に土ブロックに紛れてごく稀に生成されるペット召喚アイテム。見た目は通常の土と同じだが草は生えない。Small最大3・Medium最大6・Large最大9個。通称「至高の土」。',
          aliases: ['至高の土', '志向の土', 'しこうのつち', 'The Dirtiest Block', 'dirtiest'],
          source: { japanWiki: 'The Dirtiest Block' },
        })
        if (!data.titles?.includes('The Dirtiest Block')) {
          data.titles = [...(data.titles || []), 'The Dirtiest Block']
        }
        data.enriched = data.entities.length
        changed = true
      }
    }
    if (changed) {
      await writeFile(path, JSON.stringify(data, null, 2))
      console.log(`patched ${file}`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
