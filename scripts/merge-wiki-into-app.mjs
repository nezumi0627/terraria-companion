/**
 * Merge wiki catalog entities into runtime JSON datasets:
 * - public/data/wiki-items.json
 * - public/data/wiki-enemies.json
 * - public/data/wiki-bosses.json
 * and expand public/data/sprites.json for any new sprites.
 *
 * Usage: node scripts/merge-wiki-into-app.mjs
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { guessProgression, isBadDescription } from './lib/wiki-parse.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const WIKI = join(ROOT, 'data', 'wiki')
const OUT_DIR = join(ROOT, 'public', 'data')

const ITEM_KINDS = new Set(['weapon', 'armor', 'accessory', 'tool', 'potion', 'mount', 'pet', 'material', 'furniture', 'block'])

const COLOR = {
  weapon: 'crimson',
  armor: 'steel',
  accessory: 'gold',
  tool: 'copper',
  potion: 'pink',
  mount: 'sky',
  pet: 'lilac',
  boss: 'boss',
  enemy: 'ash',
  npc: 'sand',
  material: 'stone',
  furniture: 'wood',
  block: 'copper',
}

const RARITIES = new Set([
  'white',
  'blue',
  'green',
  'orange',
  'lightred',
  'pink',
  'lightpurple',
  'lime',
  'yellow',
  'cyan',
  'red',
  'rainbow',
])

function glyph(name) {
  const jp = String(name).replace(/[A-Za-z0-9\s\-_'’().]/g, '')
  if (jp.length >= 1) return jp.slice(0, 2)
  return String(name).slice(0, 2).toUpperCase() || '?'
}

function isJunkEntity(e) {
  const id = e.id || ''
  const en = e.enName || ''
  const name = e.name || ''
  if (!id || id.length < 2) return true
  if (/^(buff|enemy|type|average|expert|master|hardmode|mana|star|slime|chest|grass|torch|hooks|minion|modifier)$/i.test(en)) return true
  if (/^(Bleeding|Burning|Confused|Stoned|Venom|Poisoned|Broken Armor|On Fire!|Expert Mode|Master Mode|Journey Mode|Bestiary|Developer items|Mechanical Boss)$/i.test(en))
    return true
  if (/^(タイプ|画像|名称|種類|購入には|防御力は|または|例えば)/.test(name)) return true
  if (/[。？！]/.test(name)) return true
  if (/<br|<hr/i.test(name)) return true
  if (name.length > 40) return true
  if (/耐性$|増加$|減少$|可能になる|無効化|向上する/.test(name)) return true
  if (/\(disambiguation\)$/i.test(en)) return true
  if (/^list-of-|^guide-/i.test(id)) return true
  if (/-set$|-furniture$|world-seed|secret-world|for-the-worthy|dont-dig|no-traps|the-constant|drunk-world|monoliths?$|banners-|collectors-edition|developer-items|bestiary|halloween-event|christmas-event/i.test(id))
    return true
  if (/^(Armor|Furniture|Walls|Blocks|Weapons|Tools|Accessories|Potions|Mounts|Pets|NPCs|Enemies|Bosses|Events|Biomes)$/i.test(en))
    return true
  if (/^\d+(\.\d+)+$/.test(name) || /^\d+(\.\d+)+$/.test(en)) return true
  if (/^(Full Moon|New Moon|Lava|Ogre|Bullets|Get fixed boi|Don't dig up)$/i.test(en)) return true
  if (/\(debuff\)$/i.test(en)) return true
  if (/\b(Biome|Shrine|Event|Invasion)$/i.test(en)) return true
  if (/^(The Crimson|The Corruption|The Hallow|The Underworld|Mushroom Biome|Water|Third Quarter|Waxing Gibbous|Waning Gibbous|First Quarter)$/i.test(en))
    return true
  if (/^Underground (Jungle|Snow|Desert|Corruption|Crimson|Hallow)$/i.test(en)) return true
  if (/^Cursed Inferno$|^Hellfire$|^Hemorrhage$/i.test(en)) return true
  return false
}

function entityQuality(e) {
  const name = e?.name || ''
  let score = 0
  if (/[ぁ-んァ-ヶ一-龥]/.test(name)) score += 20
  if (name && !/^(ダメージは|防御力は|ノックバックは)/.test(name) && !/ダメージは|難易度で変化/.test(name))
    score += 10
  if (e.description && String(e.description).length > 40) score += 3
  if (e.enName) score += 1
  return score
}

async function loadEntities() {
  // Prefer all-items.json (full Japan Wiki refresh) over older hub snapshots.
  const files = (await readdir(WIKI))
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .sort((a, b) => {
      if (a === 'all-items.json') return 1
      if (b === 'all-items.json') return -1
      return a.localeCompare(b)
    })
  const byId = new Map()
  for (const f of files) {
    const raw = JSON.parse(await readFile(join(WIKI, f), 'utf8'))
    for (const e of raw.entities || []) {
      if (!e?.id || isJunkEntity(e)) continue
      const prev = byId.get(e.id)
      if (!prev || entityQuality(e) >= entityQuality(prev)) byId.set(e.id, e)
    }
  }
  return [...byId.values()]
}

async function loadExistingIds() {
  const ids = new Set()
  for (const file of ['items.ts', 'enemies.ts', 'world.ts']) {
    const src = await readFile(join(ROOT, 'lib', 'data', file), 'utf8')
    for (const m of src.matchAll(/id:\s*'([^']+)'/g)) ids.add(m[1])
  }
  return ids
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return fallback
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const entities = await loadEntities()
  const existing = await loadExistingIds()

  const items = []
  const enemies = []
  const bosses = []
  const spritePatch = {}

  for (const e of entities) {
    if (existing.has(e.id)) continue
    const name = e.name || e.enName
    const desc = e.description || `${name}の情報。`
    const color = COLOR[e.kind] || 'stone'
    const g = glyph(name)

    if (ITEM_KINDS.has(e.kind)) {
      const readings = [e.enName, ...(Array.isArray(e.aliases) ? e.aliases : [])].filter(Boolean)
      const rarity = RARITIES.has(e.rarity) ? e.rarity : 'white'
      const progression =
        e.progression === 'endgame' || e.progression === 'hardmode' || e.progression === 'pre-hardmode'
          ? e.progression
          : guessProgression(desc)
      const description = isBadDescription(desc, name) ? `${name}に関する情報。` : desc
      items.push({
        id: e.id,
        name,
        readings,
        category: e.kind,
        rarity,
        progression,
        description,
        glyph: g,
        color,
      })
    } else if (e.kind === 'enemy') {
      enemies.push({
        id: e.id,
        name,
        readings: [],
        progression: guessProgression(desc),
        hardmode: /hardmode|ハードモード/i.test(desc),
        biome: '各地',
        description: desc,
        glyph: g,
        color,
      })
    } else if (e.kind === 'boss') {
      bosses.push({
        id: e.id,
        name,
        readings: [],
        progression: guessProgression(desc),
        order: 9000 + bosses.length,
        hardmode: /hardmode|ハードモード/i.test(desc),
        description: desc,
        summon: 'Wiki参照',
        arena: '—',
        glyph: g,
        color,
        drops: [],
      })
    }

    if (e.sprite || e.enName) {
      spritePatch[e.id] = e.sprite || e.enName
    }
  }

  await writeFile(join(OUT_DIR, 'wiki-items.json'), JSON.stringify(items))
  await writeFile(join(OUT_DIR, 'wiki-enemies.json'), JSON.stringify(enemies))
  await writeFile(join(OUT_DIR, 'wiki-bosses.json'), JSON.stringify(bosses))

  const spritesPath = join(OUT_DIR, 'sprites.json')
  const sprites = await readJson(spritesPath, {})
  let added = 0
  for (const [id, name] of Object.entries(spritePatch)) {
    if (sprites[id]) continue
    sprites[id] = name
    added++
  }
  await writeFile(spritesPath, JSON.stringify(sprites))

  console.log(
    `Merged wiki -> items=${items.length} enemies=${enemies.length} bosses=${bosses.length} sprites+=${added}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
