import { items as handcraftedItems } from './items'
import { enemies as curatedEnemies } from './enemies'
import { localSpriteUrl } from './sprites'
import {
  biomes,
  bosses as curatedBosses,
  events,
  npcs,
  stations,
} from './world'
import type {
  Boss,
  ChecklistEntry,
  Enemy,
  GameItem,
  TreeNode,
} from './types'
import { publicUrl } from '@/lib/public-url'

export * from './types'
export { items as curatedItems } from './items'
export { localSpriteUrl, wikiSpriteUrl } from './sprites'

export { npcs, biomes, stations, events }

/**
 * Runtime registries. Start with curated-only data so the first paint does not
 * wait on ~2MB of generated wiki TypeScript. Extended wiki/sprites JSON is
 * merged by `loadExtendedData()` (see AppShell).
 */
export let items: GameItem[] = [...handcraftedItems]
export let enemies: Enemy[] = [...curatedEnemies]
export let bosses: Boss[] = [...curatedBosses].sort((a, b) => a.order - b.order)

export let progressionBosses = bosses.filter((b) => b.order > 0 && b.order < 100)

export const itemMap = new Map<string, GameItem>(items.map((i) => [i.id, i]))
export const bossMap = new Map<string, Boss>(bosses.map((b) => [b.id, b]))
export const npcMap = new Map(npcs.map((n) => [n.id, n]))
export const biomeMap = new Map(biomes.map((b) => [b.id, b]))
export const stationMap = new Map(stations.map((s) => [s.id, s]))
export const eventMap = new Map(events.map((e) => [e.id, e]))
export const enemyMap = new Map<string, Enemy>(enemies.map((e) => [e.id, e]))

let spriteNames: Record<string, string> = {}
export let spriteIndex = new Set<string>()

export function iconSrc(id: string): string | undefined {
  return spriteNames[id] ? localSpriteUrl(id) : undefined
}

export const rarityColor: Record<string, string> = {
  white: '#eef3ea',
  blue: '#6ec6ff',
  green: '#66bb6a',
  orange: '#f2994a',
  lightred: '#ff8a80',
  pink: '#f48fb1',
  lightpurple: '#b388ff',
  lime: '#c6ff00',
  yellow: '#ffd54f',
  cyan: '#18ffff',
  red: '#ff5252',
  rainbow: '#f2c94c',
}

export const rarityLabel: Record<string, string> = {
  white: 'ノーマル',
  blue: 'レア（青）',
  green: 'レア（緑）',
  orange: 'レア（橙）',
  lightred: 'レア（赤桃）',
  pink: 'レア（桃）',
  lightpurple: 'レア（紫）',
  lime: 'レア（黄緑）',
  yellow: 'レア（黄）',
  cyan: 'レア（水）',
  red: 'レア（赤）',
  rainbow: '専用レア',
}

export const categoryLabel: Record<string, string> = {
  weapon: '武器',
  armor: '防具',
  accessory: 'アクセサリー',
  tool: 'ツール',
  furniture: '家具',
  potion: 'ポーション',
  material: '素材',
  mount: 'マウント',
  pet: 'ペット',
  block: 'ブロック',
}

export const progressionLabel: Record<string, string> = {
  'pre-hardmode': 'ハードモード前',
  hardmode: 'ハードモード',
  endgame: 'エンドゲーム',
}

export function formatCoins(copper?: number): string {
  if (!copper || copper <= 0) return '—'
  const g = Math.floor(copper / 10000)
  const s = Math.floor((copper % 10000) / 100)
  const c = copper % 100
  const parts: string[] = []
  if (g) parts.push(`${g}金`)
  if (s) parts.push(`${s}銀`)
  if (c) parts.push(`${c}銅`)
  return parts.join(' ')
}

function replaceMap<K, V>(map: Map<K, V>, entries: Iterable<[K, V]>) {
  map.clear()
  for (const [k, v] of entries) map.set(k, v)
}

function rebuildDerived() {
  progressionBosses = bosses.filter((b) => b.order > 0 && b.order < 100)
  replaceMap(
    itemMap,
    items.map((i) => [i.id, i]),
  )
  replaceMap(
    bossMap,
    bosses.map((b) => [b.id, b]),
  )
  replaceMap(
    enemyMap,
    enemies.map((e) => [e.id, e]),
  )
  spriteIndex = new Set(Object.keys(spriteNames))
  rebuildSearchIndex()
  totalCounts.item = items.length
  totalCounts.boss = bosses.length
  totalCounts.enemy = enemies.length
}

type SearchKind = 'item' | 'boss' | 'npc' | 'biome' | 'station' | 'event' | 'enemy'

export interface SearchResult {
  id: string
  kind: SearchKind
  name: string
  glyph: string
  color: string
  image?: string
  sub: string
}

/** Lowercase + katakana→hiragana + strip spaces for JP/EN search. */
export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/\s+/g, '')
}

interface Indexed {
  result: SearchResult
  haystack: string[]
}

let searchIndex: Indexed[] = []

function rebuildSearchIndex() {
  searchIndex = [
    ...items.map((i) => ({
      result: {
        id: i.id,
        kind: 'item' as const,
        name: i.name,
        glyph: i.glyph,
        color: i.color,
        image: iconSrc(i.id),
        sub: categoryLabel[i.category],
      },
      haystack: [i.name, ...(i.readings ?? [])].map(normalizeSearch),
    })),
    ...bosses.map((b) => ({
      result: {
        id: b.id,
        kind: 'boss' as const,
        name: b.name,
        glyph: b.glyph,
        color: b.color,
        image: iconSrc(b.id),
        sub: 'ボス',
      },
      haystack: [b.name, ...(b.readings ?? [])].map(normalizeSearch),
    })),
    ...npcs.map((n) => ({
      result: {
        id: n.id,
        kind: 'npc' as const,
        name: n.name,
        glyph: n.glyph,
        color: n.color,
        image: iconSrc(n.id),
        sub: 'NPC',
      },
      haystack: [n.name, ...(n.readings ?? [])].map(normalizeSearch),
    })),
    ...biomes.map((b) => ({
      result: {
        id: b.id,
        kind: 'biome' as const,
        name: b.name,
        glyph: b.glyph,
        color: b.color,
        image: iconSrc(b.id),
        sub: 'バイオーム',
      },
      haystack: [b.name, ...(b.readings ?? [])].map(normalizeSearch),
    })),
    ...stations.map((s) => ({
      result: {
        id: s.id,
        kind: 'station' as const,
        name: s.name,
        glyph: s.glyph,
        color: s.color,
        image: iconSrc(s.id),
        sub: '設備',
      },
      haystack: [s.name, ...(s.readings ?? [])].map(normalizeSearch),
    })),
    ...events.map((e) => ({
      result: {
        id: e.id,
        kind: 'event' as const,
        name: e.name,
        glyph: e.glyph,
        color: e.color,
        image: iconSrc(e.id),
        sub: 'イベント',
      },
      haystack: [e.name, ...(e.readings ?? [])].map(normalizeSearch),
    })),
    ...enemies.map((e) => ({
      result: {
        id: e.id,
        kind: 'enemy' as const,
        name: e.name,
        glyph: e.glyph,
        color: e.color,
        image: iconSrc(e.id),
        sub: '敵',
      },
      haystack: [e.name, ...(e.readings ?? [])].map(normalizeSearch),
    })),
  ]
}

rebuildSearchIndex()

export function search(query: string, limit = 12): SearchResult[] {
  const q = normalizeSearch(query)
  if (!q) return []
  const scored: { r: SearchResult; score: number }[] = []
  for (const { result, haystack } of searchIndex) {
    let best = 0
    for (const h of haystack) {
      if (h === q) best = Math.max(best, 100)
      else if (h.startsWith(q)) best = Math.max(best, 80)
      else if (h.includes(q)) best = Math.max(best, 60)
    }
    if (best > 0) scored.push({ r: result, score: best })
  }
  scored.sort((a, b) => b.score - a.score || a.r.name.length - b.r.name.length)
  return scored.slice(0, limit).map((s) => s.r)
}

export type DropSourceKind = 'boss' | 'enemy' | 'npc' | 'event'

export interface ResolvedDropSource {
  /** Navigable entity kind; null for chests / world sources without a detail page. */
  kind: DropSourceKind | null
  id: string
  name: string
  glyph: string
  color: string
}

/** Resolve a droppedBy.sourceId against bosses, enemies, NPCs, or events. */
export function resolveDropSource(sourceId: string): ResolvedDropSource {
  const boss = bossMap.get(sourceId)
  if (boss) {
    return { kind: 'boss', id: boss.id, name: boss.name, glyph: boss.glyph, color: boss.color }
  }
  const enemy = enemyMap.get(sourceId)
  if (enemy) {
    return { kind: 'enemy', id: enemy.id, name: enemy.name, glyph: enemy.glyph, color: enemy.color }
  }
  const npc = npcMap.get(sourceId)
  if (npc) {
    return { kind: 'npc', id: npc.id, name: npc.name, glyph: npc.glyph, color: npc.color }
  }
  const event = eventMap.get(sourceId)
  if (event) {
    return { kind: 'event', id: event.id, name: event.name, glyph: event.glyph, color: event.color }
  }
  return {
    kind: null,
    id: sourceId,
    name: sourceId.replace(/-/g, ' '),
    glyph: '箱',
    color: 'stone',
  }
}

export const totalCounts = {
  item: items.length,
  boss: bosses.length,
  npc: npcs.length,
  biome: biomes.length,
  station: stations.length,
  event: events.length,
  enemy: enemies.length,
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} (${res.status})`)
  return res.json() as Promise<T>
}

/**
 * Load wiki-sourced datasets + sprite map from `/public/data/*.json`.
 * Safe to call multiple times; callers should gate via `useDataStatus`.
 */
export async function loadExtendedData(): Promise<void> {
  const [wikiItems, wikiEnemies, wikiBosses, sprites, available] = await Promise.all([
    fetchJson<GameItem[]>(publicUrl('/data/wiki-items.json')),
    fetchJson<Enemy[]>(publicUrl('/data/wiki-enemies.json')),
    fetchJson<Boss[]>(publicUrl('/data/wiki-bosses.json')),
    fetchJson<Record<string, string>>(publicUrl('/data/sprites.json')),
    fetchJson<string[]>(publicUrl('/data/sprite-available.json')).catch(() => [] as string[]),
  ])

  // Only expose sprites that actually exist on disk — prevents 404 storms.
  const onDisk = new Set(available)
  const filtered: Record<string, string> = {}
  for (const [id, name] of Object.entries(sprites ?? {})) {
    if (onDisk.has(id)) filtered[id] = name
  }
  spriteNames = filtered

  const itemMerged = new Map<string, GameItem>()
  for (const i of wikiItems) itemMerged.set(i.id, i)
  for (const i of handcraftedItems) itemMerged.set(i.id, i)
  items = [...itemMerged.values()]

  const enemyMerged = new Map<string, Enemy>()
  for (const e of wikiEnemies) enemyMerged.set(e.id, e)
  for (const e of curatedEnemies) enemyMerged.set(e.id, e)
  enemies = [...enemyMerged.values()]

  const bossMerged = new Map<string, Boss>()
  for (const b of wikiBosses) bossMerged.set(b.id, b)
  for (const b of curatedBosses) bossMerged.set(b.id, b)
  bosses = [...bossMerged.values()].sort((a, b) => a.order - b.order)

  rebuildDerived()
}

export function buildTree(itemId: string, seen: Set<string> = new Set()): TreeNode | null {
  const item = itemMap.get(itemId)
  if (!item) return null

  const path = new Set(seen).add(itemId)
  const children: TreeNode[] = []

  if (item.recipe) {
    for (const ing of item.recipe.ingredients) {
      const child = itemMap.get(ing.itemId)
      if (!child) continue
      if (path.has(ing.itemId)) {
        children.push({
          id: ing.itemId,
          kind: 'item',
          name: child.name,
          glyph: child.glyph,
          color: child.color,
          image: iconSrc(ing.itemId),
          count: ing.count || undefined,
          method: '（別の枝で展開済み）',
          children: [],
        })
        continue
      }
      const sub = buildTree(ing.itemId, path)
      if (sub) {
        sub.count = ing.count || undefined
        children.push(sub)
      }
    }
    if (item.recipe.stationId) {
      const st = stationMap.get(item.recipe.stationId)
      if (st) {
        children.push({
          id: st.id,
          kind: 'station',
          name: st.name,
          glyph: st.glyph,
          color: st.color,
          image: iconSrc(st.id),
          method: '作業設備',
          children: [],
        })
      }
    }
  }

  for (const bid of item.requiredBosses ?? []) {
    const b = bossMap.get(bid)
    if (b)
      children.push({
        id: b.id,
        kind: 'boss',
        name: b.name,
        glyph: b.glyph,
        color: b.color,
        image: iconSrc(b.id),
        method: '討伐が必要',
        children: [],
      })
  }
  for (const eid of item.requiredEvents ?? []) {
    const e = eventMap.get(eid)
    if (e)
      children.push({
        id: e.id,
        kind: 'event',
        name: e.name,
        glyph: e.glyph,
        color: e.color,
        image: iconSrc(e.id),
        method: 'イベント発生が必要',
        children: [],
      })
  }
  for (const bid of item.requiredBiomes ?? []) {
    const b = biomeMap.get(bid)
    if (b)
      children.push({
        id: b.id,
        kind: 'biome',
        name: b.name,
        glyph: b.glyph,
        color: b.color,
        image: iconSrc(b.id),
        method: '到達が必要',
        children: [],
      })
  }
  for (const nid of item.requiredNpcs ?? []) {
    const n = npcMap.get(nid)
    if (n)
      children.push({
        id: n.id,
        kind: 'npc',
        name: n.name,
        glyph: n.glyph,
        color: n.color,
        image: iconSrc(n.id),
        method: '解放が必要',
        children: [],
      })
  }

  let method = '入手方法'
  if (item.recipe) method = 'クラフトで作成'
  else if (item.droppedBy?.length) method = item.droppedBy[0].chance
  else if (item.requiredBiomes?.length) method = 'バイオームで入手'

  return {
    id: item.id,
    kind: 'item',
    name: item.name,
    glyph: item.glyph,
    color: item.color,
    image: iconSrc(item.id),
    method,
    children,
  }
}

export function buildChecklist(itemId: string): ChecklistEntry[] {
  const tree = buildTree(itemId)
  if (!tree) return []

  const materials = new Map<string, ChecklistEntry>()
  const bossesC = new Map<string, ChecklistEntry>()
  const npcsC = new Map<string, ChecklistEntry>()
  const eventsC = new Map<string, ChecklistEntry>()
  const stationsC = new Map<string, ChecklistEntry>()
  const biomesC = new Map<string, ChecklistEntry>()
  const crafts = new Map<string, ChecklistEntry>()

  const walk = (node: TreeNode, isRoot: boolean) => {
    switch (node.kind) {
      case 'item': {
        const it = itemMap.get(node.id)
        if (!isRoot) {
          if (it?.recipe) {
            crafts.set(node.id, {
              key: `craft-${node.id}`,
              kind: 'craft',
              refId: node.id,
              name: node.name,
              glyph: node.glyph,
              color: node.color,
              image: node.image,
            })
          } else {
            const existing = materials.get(node.id)
            const count = (existing?.count ?? 0) + (node.count ?? 1)
            materials.set(node.id, {
              key: `mat-${node.id}`,
              kind: 'material',
              refId: node.id,
              name: node.name,
              glyph: node.glyph,
              color: node.color,
              image: node.image,
              count,
            })
          }
        }
        break
      }
      case 'boss':
        bossesC.set(node.id, {
          key: `boss-${node.id}`,
          kind: 'boss',
          refId: node.id,
          name: node.name,
          glyph: node.glyph,
          color: node.color,
          image: node.image,
        })
        break
      case 'npc':
        npcsC.set(node.id, {
          key: `npc-${node.id}`,
          kind: 'npc',
          refId: node.id,
          name: node.name,
          glyph: node.glyph,
          color: node.color,
          image: node.image,
        })
        break
      case 'event':
        eventsC.set(node.id, {
          key: `event-${node.id}`,
          kind: 'event',
          refId: node.id,
          name: node.name,
          glyph: node.glyph,
          color: node.color,
          image: node.image,
        })
        break
      case 'station':
        stationsC.set(node.id, {
          key: `station-${node.id}`,
          kind: 'station',
          refId: node.id,
          name: node.name,
          glyph: node.glyph,
          color: node.color,
          image: node.image,
        })
        break
      case 'biome':
        biomesC.set(node.id, {
          key: `biome-${node.id}`,
          kind: 'biome',
          refId: node.id,
          name: node.name,
          glyph: node.glyph,
          color: node.color,
          image: node.image,
        })
        break
    }
    node.children.forEach((c) => walk(c, false))
  }
  walk(tree, true)

  return [
    ...bossesC.values(),
    ...eventsC.values(),
    ...biomesC.values(),
    ...materials.values(),
    ...crafts.values(),
    ...stationsC.values(),
    ...npcsC.values(),
  ]
}
