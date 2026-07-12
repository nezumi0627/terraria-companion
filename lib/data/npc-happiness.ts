/**
 * Town NPC happiness preferences (1.4+).
 * Structured from community mirror of game prefs (synchromic/terraria-npc-happiness info.js),
 * remapped to this app's npc / biome ids. Stored locally — not fetched at runtime.
 *
 * Multipliers (reference): love 0.88×, like 0.94×, dislike 1.06×, hate 1.12× (current wiki).
 */
export type PrefTier = 'loved' | 'liked' | 'disliked' | 'hated'

export interface NpcHappiness {
  /** biome ids in this app (see biomes in world.ts) */
  lovedBiome?: string
  likedBiome?: string
  dislikedBiome?: string
  lovedNpcs: string[]
  likedNpcs: string[]
  dislikedNpcs: string[]
  hatedNpcs: string[]
  /** special rules shown in UI */
  note?: string
}

/** synchromic key → our npc id */
const ID: Record<string, string> = {
  guide: 'guide',
  merchant: 'merchant',
  zoologist: 'zoologist',
  golfer: 'golfer',
  nurse: 'nurse',
  tavernkeep: 'tavernkeep',
  partygirl: 'party-girl',
  wizard: 'wizard',
  demolitionist: 'demolitionist',
  tinkerer: 'goblin-tinkerer',
  clothier: 'clothier',
  dyetrader: 'dye-trader',
  armsdealer: 'arms-dealer',
  steampunker: 'steampunker',
  dryad: 'dryad',
  painter: 'painter',
  witchdoctor: 'witch-doctor',
  stylist: 'stylist',
  angler: 'angler',
  pirate: 'pirate',
  mechanic: 'mechanic',
  taxcollector: 'tax-collector',
  cyborg: 'cyborg',
  santa: 'santa-claus',
  truffle: 'truffle',
  princess: 'princess',
}

const BIOME: Record<string, string> = {
  forest: 'forest',
  hallow: 'hallow',
  underground: 'underground',
  desert: 'desert',
  jungle: 'jungle',
  ocean: 'ocean',
  snow: 'snow',
  mushroom: 'glowing-mushroom',
}

function mapIds(ids: string[]): string[] {
  return ids.map((k) => ID[k]).filter(Boolean)
}

function mapBiome(k: string | undefined): string | undefined {
  if (!k || k === 'n/a') return undefined
  return BIOME[k]
}

/** Raw preference table keyed by our npc id */
export const npcHappiness: Record<string, NpcHappiness> = {
  guide: {
    likedBiome: 'forest',
    dislikedBiome: 'ocean',
    lovedNpcs: [],
    likedNpcs: mapIds(['clothier', 'zoologist']),
    dislikedNpcs: mapIds(['steampunker']),
    hatedNpcs: mapIds(['painter']),
  },
  merchant: {
    likedBiome: 'forest',
    dislikedBiome: 'desert',
    lovedNpcs: [],
    likedNpcs: mapIds(['golfer', 'nurse']),
    dislikedNpcs: mapIds(['taxcollector']),
    hatedNpcs: mapIds(['angler']),
  },
  zoologist: {
    likedBiome: 'forest',
    dislikedBiome: 'desert',
    lovedNpcs: mapIds(['witchdoctor']),
    likedNpcs: mapIds(['golfer']),
    dislikedNpcs: mapIds(['angler']),
    hatedNpcs: mapIds(['armsdealer']),
  },
  golfer: {
    likedBiome: 'forest',
    dislikedBiome: 'underground',
    lovedNpcs: mapIds(['angler']),
    likedNpcs: mapIds(['painter', 'zoologist']),
    dislikedNpcs: mapIds(['pirate']),
    hatedNpcs: mapIds(['merchant']),
  },
  nurse: {
    likedBiome: 'hallow',
    dislikedBiome: 'snow',
    lovedNpcs: mapIds(['armsdealer']),
    likedNpcs: mapIds(['wizard']),
    dislikedNpcs: mapIds(['dryad', 'partygirl']),
    hatedNpcs: mapIds(['zoologist']),
  },
  tavernkeep: {
    likedBiome: 'hallow',
    dislikedBiome: 'snow',
    lovedNpcs: mapIds(['demolitionist']),
    likedNpcs: mapIds(['tinkerer']),
    dislikedNpcs: mapIds(['guide']),
    hatedNpcs: mapIds(['dyetrader']),
  },
  'party-girl': {
    likedBiome: 'hallow',
    dislikedBiome: 'underground',
    lovedNpcs: mapIds(['wizard']),
    likedNpcs: mapIds(['stylist']),
    dislikedNpcs: mapIds(['merchant']),
    hatedNpcs: mapIds(['taxcollector']),
  },
  wizard: {
    likedBiome: 'hallow',
    dislikedBiome: 'ocean',
    lovedNpcs: mapIds(['golfer']),
    likedNpcs: mapIds(['merchant']),
    dislikedNpcs: mapIds(['witchdoctor']),
    hatedNpcs: mapIds(['cyborg']),
  },
  demolitionist: {
    likedBiome: 'underground',
    dislikedBiome: 'ocean',
    lovedNpcs: mapIds(['tavernkeep']),
    likedNpcs: mapIds(['mechanic']),
    dislikedNpcs: mapIds(['armsdealer', 'tinkerer']),
    hatedNpcs: [],
  },
  'goblin-tinkerer': {
    likedBiome: 'underground',
    dislikedBiome: 'jungle',
    lovedNpcs: mapIds(['mechanic']),
    likedNpcs: mapIds(['dyetrader']),
    dislikedNpcs: mapIds(['clothier']),
    hatedNpcs: mapIds(['stylist']),
  },
  clothier: {
    likedBiome: 'underground',
    dislikedBiome: 'hallow',
    lovedNpcs: mapIds(['truffle']),
    likedNpcs: mapIds(['taxcollector']),
    dislikedNpcs: mapIds(['nurse']),
    hatedNpcs: mapIds(['mechanic']),
  },
  'dye-trader': {
    likedBiome: 'desert',
    dislikedBiome: 'forest',
    lovedNpcs: [],
    likedNpcs: mapIds(['armsdealer', 'painter']),
    dislikedNpcs: mapIds(['steampunker']),
    hatedNpcs: mapIds(['pirate']),
  },
  'arms-dealer': {
    likedBiome: 'desert',
    dislikedBiome: 'snow',
    lovedNpcs: mapIds(['nurse']),
    likedNpcs: mapIds(['steampunker']),
    dislikedNpcs: mapIds(['golfer']),
    hatedNpcs: mapIds(['demolitionist']),
  },
  steampunker: {
    likedBiome: 'desert',
    dislikedBiome: 'jungle',
    lovedNpcs: mapIds(['cyborg']),
    likedNpcs: mapIds(['painter']),
    dislikedNpcs: mapIds(['dryad', 'wizard', 'partygirl']),
    hatedNpcs: [],
  },
  dryad: {
    likedBiome: 'jungle',
    dislikedBiome: 'desert',
    lovedNpcs: [],
    likedNpcs: mapIds(['witchdoctor', 'truffle']),
    dislikedNpcs: mapIds(['angler', 'zoologist']),
    hatedNpcs: mapIds(['golfer']),
  },
  painter: {
    likedBiome: 'jungle',
    dislikedBiome: 'forest',
    lovedNpcs: mapIds(['dryad']),
    likedNpcs: mapIds(['partygirl']),
    dislikedNpcs: mapIds(['truffle', 'cyborg']),
    hatedNpcs: [],
  },
  'witch-doctor': {
    likedBiome: 'jungle',
    dislikedBiome: 'hallow',
    lovedNpcs: [],
    likedNpcs: mapIds(['dryad', 'guide']),
    dislikedNpcs: mapIds(['nurse']),
    hatedNpcs: mapIds(['truffle']),
  },
  stylist: {
    likedBiome: 'ocean',
    dislikedBiome: 'snow',
    lovedNpcs: mapIds(['dyetrader']),
    likedNpcs: mapIds(['pirate']),
    dislikedNpcs: mapIds(['tavernkeep']),
    hatedNpcs: mapIds(['tinkerer']),
  },
  angler: {
    likedBiome: 'ocean',
    dislikedBiome: 'desert',
    lovedNpcs: [],
    likedNpcs: mapIds(['demolitionist', 'partygirl', 'taxcollector']),
    dislikedNpcs: [],
    hatedNpcs: mapIds(['tavernkeep']),
  },
  pirate: {
    likedBiome: 'ocean',
    dislikedBiome: 'underground',
    lovedNpcs: mapIds(['angler']),
    likedNpcs: mapIds(['tavernkeep']),
    dislikedNpcs: mapIds(['stylist']),
    hatedNpcs: mapIds(['guide']),
  },
  mechanic: {
    likedBiome: 'snow',
    dislikedBiome: 'underground',
    lovedNpcs: mapIds(['tinkerer']),
    likedNpcs: mapIds(['cyborg']),
    dislikedNpcs: mapIds(['armsdealer']),
    hatedNpcs: mapIds(['clothier']),
  },
  'tax-collector': {
    likedBiome: 'snow',
    dislikedBiome: 'hallow',
    lovedNpcs: mapIds(['merchant']),
    likedNpcs: mapIds(['partygirl']),
    dislikedNpcs: mapIds(['demolitionist', 'mechanic']),
    hatedNpcs: mapIds(['santa']),
  },
  cyborg: {
    likedBiome: 'snow',
    dislikedBiome: 'jungle',
    lovedNpcs: [],
    likedNpcs: mapIds(['steampunker', 'pirate', 'stylist']),
    dislikedNpcs: mapIds(['zoologist']),
    hatedNpcs: mapIds(['wizard']),
  },
  'santa-claus': {
    likedBiome: 'snow',
    dislikedBiome: 'desert',
    lovedNpcs: [],
    likedNpcs: [],
    dislikedNpcs: [],
    hatedNpcs: mapIds(['taxcollector']),
    note: 'クリスマス期間のみ滞在。雪原を愛し砂漠を嫌う。',
  },
  truffle: {
    lovedBiome: 'glowing-mushroom',
    likedBiome: 'glowing-mushroom',
    dislikedBiome: 'forest',
    lovedNpcs: mapIds(['guide']),
    likedNpcs: mapIds(['dryad']),
    dislikedNpcs: mapIds(['clothier']),
    hatedNpcs: mapIds(['witchdoctor']),
    note: '光るキノコバイオームの家でのみ移住可能。',
  },
  princess: {
    lovedNpcs: [],
    likedNpcs: [],
    dislikedNpcs: [],
    hatedNpcs: [],
    note: 'バイオームの好き嫌いはなし。他の町NPCを全員「大好き」（孤独は嫌う）。他NPCからも嫌われない。',
  },
}

export function getNpcHappiness(npcId: string): NpcHappiness | undefined {
  return npcHappiness[npcId]
}

export const TIER_LABEL: Record<PrefTier, string> = {
  loved: '大好き',
  liked: '好き',
  disliked: '嫌い',
  hated: '大嫌い',
}
