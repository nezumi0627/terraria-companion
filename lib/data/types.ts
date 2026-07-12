export type Rarity =
  | 'white'
  | 'blue'
  | 'green'
  | 'orange'
  | 'lightred'
  | 'pink'
  | 'lightpurple'
  | 'lime'
  | 'yellow'
  | 'cyan'
  | 'red'
  | 'rainbow'

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'accessory'
  | 'tool'
  | 'furniture'
  | 'potion'
  | 'material'
  | 'mount'
  | 'pet'
  | 'block'

export type Progression = 'pre-hardmode' | 'hardmode' | 'endgame'

/** A single ingredient reference used in recipes and requirements. */
export interface Ingredient {
  itemId: string
  count: number
}

export interface Recipe {
  /** crafting station id required, e.g. "mythril-anvil" */
  stationId?: string
  ingredients: Ingredient[]
}

export interface GameItem {
  id: string
  name: string
  /** searchable readings / aliases (hiragana, katakana, english) */
  readings?: string[]
  category: ItemCategory
  rarity: Rarity
  progression: Progression
  description: string
  /** sell value in copper coins */
  sell?: number
  /** icon key used to render an emoji-free pixel glyph */
  glyph: string
  /** color token name for the glyph background */
  color: string
  /** wiki sprite file basename (without .png), used to fetch the real sprite */
  sprite?: string
  /** recipe used to craft this item */
  recipe?: Recipe
  /** dropped by these boss/enemy ids */
  droppedBy?: { sourceId: string; chance: string }[]
  /** requires these boss defeats to obtain */
  requiredBosses?: string[]
  /** requires these NPCs */
  requiredNpcs?: string[]
  /** requires these events */
  requiredEvents?: string[]
  /** requires access to these biomes */
  requiredBiomes?: string[]
  /** related items (soft links) */
  related?: string[]
}

export interface Boss {
  id: string
  name: string
  readings?: string[]
  progression: Progression
  /** order in the canonical progression timeline */
  order: number
  hardmode: boolean
  description: string
  summon: string
  arena: string
  glyph: string
  color: string
  sprite?: string
  /** notable drops (item ids) */
  drops: string[]
}

export interface Enemy {
  id: string
  name: string
  readings?: string[]
  progression: Progression
  hardmode: boolean
  /** biome / location label, e.g. "地下ジャングル" */
  biome: string
  description: string
  /** classic-mode HP as a short string, e.g. "14" or "260" */
  hp?: string
  /** classic-mode contact damage as a short string */
  damage?: string
  glyph: string
  color: string
  sprite?: string
  /** notable drops (item ids) */
  drops?: string[]
}

export interface Npc {
  id: string
  name: string
  readings?: string[]
  unlock: string
  likedBiome: string
  likedNpc: string
  dislikedBiome?: string
  role: string
  glyph: string
  color: string
  sprite?: string
}

export interface Biome {
  id: string
  name: string
  readings?: string[]
  layer: string
  description: string
  glyph: string
  color: string
  sprite?: string
}

export interface Station {
  id: string
  name: string
  readings?: string[]
  progression: Progression
  howTo: string
  glyph: string
  color: string
  sprite?: string
}

export interface GameEvent {
  id: string
  name: string
  readings?: string[]
  progression: Progression
  trigger: string
  description: string
  glyph: string
  color: string
  sprite?: string
}

export interface Achievement {
  id: string
  name: string
  description: string
}

/** Offline wiki-catalog entry (mirrored from Terraria JA/EN wiki). */
export interface CatalogEntry {
  id: string
  name: string
  enName: string
  kind: string
  description: string
  glyph: string
  color: string
  sprite?: string
}

/** A node in an expanded acquisition tree. */
export interface TreeNode {
  id: string
  kind: 'item' | 'boss' | 'npc' | 'event' | 'biome' | 'station'
  name: string
  glyph: string
  color: string
  /** local sprite src if available */
  image?: string
  count?: number
  /** how this node is obtained, short label */
  method: string
  children: TreeNode[]
}

/** Flat checklist entry generated from a goal tree. */
export interface ChecklistEntry {
  key: string
  kind: 'material' | 'boss' | 'npc' | 'event' | 'station' | 'biome' | 'craft'
  refId: string
  name: string
  glyph: string
  color: string
  image?: string
  count?: number
}
