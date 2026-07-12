/**
 * Download only high-value missing sprites (skip category / set / meta pages).
 * Usage: node scripts/download-missing-priority.mjs
 */
import { access, mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'sprites')
const SPRITES = join(ROOT, 'public', 'data', 'sprites.json')
const AVAILABLE = join(ROOT, 'public', 'data', 'sprite-available.json')
const UA = 'TerrariaCompanionLocal/1.0 (local asset mirror)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const SKIP =
  /(-set$|-furniture$|world-seed|secret-world|for-the-worthy|dont-dig|no-traps|the-constant|drunk-world|monoliths?$|banners-|rarity$|buff$|1-4-4|team-block|bestiary|developer-items|modifier|halloween-event|christmas-event|floating-islands|forests|underground-snow|remix|torch-god|town-pet|mushroom-biome|critter|light-pet|minion|npc$|pet$|pylon$|mount$|food$|crate$|slime$|kite$|altar$|bat$|bullets$|gem-bunny|gem-squirrel|dragonfly|collectors-edition)/i

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function fetchPng(wikiName) {
  const url = `https://terraria.wiki.gg/wiki/Special:FilePath/${encodeURIComponent(wikiName)}.png`
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/png,*/*' }, redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 50 || buf[0] !== 0x89) throw new Error('not png')
  return buf
}

/** Prefer a concrete piece icon for armor category pages. */
function candidates(id, wikiName) {
  const base = wikiName || id
  const out = [base, `${base} item`, base.replace(/ armor$/i, ' Helmet'), base.replace(/ Armor$/i, ' Helmet')]
  if (/-armor$/.test(id)) {
    const stem = id.replace(/-armor$/, '')
    const title = stem
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    out.push(`${title} Helmet`, `${title} armor`, title)
  }
  return [...new Set(out.filter(Boolean))]
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const map = JSON.parse(await readFile(SPRITES, 'utf8'))
  const missing = []
  for (const [id, wikiName] of Object.entries(map)) {
    if (SKIP.test(id)) continue
    if (await exists(join(OUT, `${id}.png`))) continue
    missing.push([id, wikiName])
  }
  console.log(`Priority missing: ${missing.length}`)

  let ok = 0
  let fail = 0
  for (const [id, wikiName] of missing) {
    let done = false
    for (const name of candidates(id, wikiName)) {
      try {
        const buf = await fetchPng(name)
        await writeFile(join(OUT, `${id}.png`), buf)
        console.log(`+ ${id} <= ${name}`)
        ok++
        done = true
        break
      } catch {
        /* try next name */
      }
      await sleep(200)
    }
    if (!done) {
      console.log(`x ${id}`)
      fail++
    }
    await sleep(250)
  }

  const files = (await readdir(OUT)).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4))
  await writeFile(AVAILABLE, JSON.stringify(files))
  console.log(`Done ok=${ok} fail=${fail} available=${files.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
