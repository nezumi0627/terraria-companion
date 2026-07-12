/**
 * In-game music catalog from https://terraria.wiki.gg/wiki/Music
 * Ordered by internal track index (#). Audio is streamed from the wiki Listen column
 * (not bundled). Optional: override with purchased OST files.
 *
 * © Re-Logic. Majority composed by Scott Lloyd Shelly (Resonance Array).
 */

import WIKI_STREAMS from './music-wiki-streams.json'

export type MusicGroup = 'main' | 'otherworld' | 'ambience'
export type MusicMood =
  | 'day'
  | 'night'
  | 'underground'
  | 'boss'
  | 'biome'
  | 'event'
  | 'town'
  | 'title'
  | 'other'

export interface MusicTrack {
  id: string
  /** Internal index from wiki Music table */
  index: number
  title: string
  titleJa: string
  /** When / where it plays (from wiki) */
  condition: string
  group: MusicGroup
  duration: number
  mood: MusicMood
  match: string[]
  /** Stream URL from terraria.wiki.gg Music page (Listen column) */
  streamUrl?: string
  credit?: string
}

function t(
  index: number,
  title: string,
  titleJa: string,
  condition: string,
  group: MusicGroup,
  mood: MusicMood,
  match: string[],
  credit?: string,
): MusicTrack {
  const stream = WIKI_STREAMS[index - 1] as { url?: string; durationHint?: number } | undefined
  return {
    id: `m${String(index).padStart(3, '0')}`,
    index,
    title,
    titleJa,
    condition,
    group,
    duration: stream?.durationHint || 0,
    mood,
    match: [...new Set([title.toLowerCase(), ...match])],
    streamUrl: stream?.url,
    credit,
  }
}

/** All Desktop tracks as listed on the Music wiki (1–104). */
export const MUSIC_TRACKS: MusicTrack[] = [
  t(1, 'Overworld Day', '地上（昼）', 'Forest, daytime', 'main', 'day', ['overworld day']),
  t(2, 'Eerie', '不気味', 'Blood Moon / Meteorite', 'main', 'event', ['eerie']),
  t(3, 'Night', '夜', 'Forest night / Hallow night', 'main', 'night', ['night', 'overworld night']),
  t(4, 'Underground', '地下', 'Underground / Cavern', 'main', 'underground', ['underground']),
  t(5, 'Boss 1', 'ボス1', 'Eye of Cthulhu など', 'main', 'boss', ['boss 1', 'eye of cthulhu']),
  t(6, 'Title', 'タイトル', 'Title screen', 'main', 'title', ['title', 'title screen']),
  t(7, 'Jungle', 'ジャングル', 'Jungle surface daytime', 'main', 'biome', ['jungle']),
  t(8, 'Corruption', '腐敗', 'The Corruption (surface)', 'main', 'biome', ['corruption']),
  t(9, 'The Hallow', '神聖', 'The Hallow daytime', 'main', 'biome', ['the hallow', 'hallow']),
  t(10, 'Underground Corruption', '地下腐敗', 'Underground Corruption', 'main', 'underground', ['underground corruption']),
  t(11, 'Underground Hallow', '地下神聖', 'Underground Hallow', 'main', 'underground', ['underground hallow']),
  t(12, 'Boss 2', 'ボス2', 'Wall of Flesh など', 'main', 'boss', ['boss 2', 'wall of flesh']),
  t(13, 'Boss 3', 'ボス3', 'Brain of Cthulhu / Frost Legion', 'main', 'boss', ['boss 3', 'brain of cthulhu']),
  t(14, 'Snow', '雪原', 'Snow biome', 'main', 'biome', ['snow']),
  t(15, 'Space Night', '宇宙（夜）', 'Space, night', 'main', 'night', ['space night', 'space']),
  t(16, 'Crimson', 'クリムゾン', 'The Crimson (surface)', 'main', 'biome', ['crimson']),
  t(17, 'Boss 4', 'ボス4', 'Golem / Mechdusa など', 'main', 'boss', ['boss 4', 'golem']),
  t(18, 'Alt Overworld Day', '地上（昼・別）', 'Forest daytime', 'main', 'day', ['alt overworld day', 'alternate day', 'alternate overworld day']),
  t(19, 'Rain', '雨', 'Rain', 'main', 'event', ['rain']),
  t(20, 'Ice', '氷', 'Ice biome', 'main', 'biome', ['ice']),
  t(21, 'Desert', '砂漠', 'Desert', 'main', 'biome', ['desert']),
  t(22, 'Ocean Day', '海（昼）', 'Ocean daytime', 'main', 'biome', ['ocean day', 'ocean']),
  t(23, 'Dungeon', 'ダンジョン', 'Dungeon', 'main', 'biome', ['dungeon']),
  t(24, 'Plantera', 'プランテラ', 'Plantera', 'main', 'boss', ['plantera']),
  t(25, 'Boss 5', 'ボス5', 'Mechdusa / Queen Bee（旧）', 'main', 'boss', ['boss 5', 'mechdusa']),
  t(26, 'Temple', '神殿', 'Jungle Temple', 'main', 'biome', ['temple', 'lihzahrd']),
  t(27, 'Eclipse', '日食', 'Solar Eclipse', 'main', 'event', ['eclipse', 'solar eclipse']),
  t(28, 'Rain ambience', '雨（環境音）', 'Rain / Thunderstorm', 'ambience', 'other', ['rain ambience']),
  t(29, 'Mushrooms', 'キノコ', 'Glowing Mushroom biome', 'main', 'biome', ['mushrooms', 'mushroom']),
  t(30, 'Pumpkin Moon', 'パンプキンムーン', 'Pumpkin Moon', 'main', 'event', ['pumpkin moon', 'pumpkin']),
  t(31, 'Alt Underground', '地下（別）', 'Underground / Cavern', 'main', 'underground', ['alt underground', 'alternate underground']),
  t(32, 'Frost Moon', 'フロストムーン', 'Frost Moon', 'main', 'event', ['frost moon']),
  t(33, 'Underground Crimson', '地下クリムゾン', 'Underground Crimson', 'main', 'underground', ['underground crimson']),
  t(34, 'The Towers', '天界の柱', 'Lunar Events', 'main', 'boss', ['the towers', 'lunar towers', 'celestial']),
  t(35, 'Pirate Invasion', '海賊の侵略', 'Pirate Invasion', 'main', 'event', ['pirate invasion', 'pirate']),
  t(36, 'Hell', '地獄', 'The Underworld', 'main', 'biome', ['hell', 'underworld']),
  t(37, 'Martian Madness', '火星人の狂気', 'Martian Madness', 'main', 'event', ['martian madness', 'martian']),
  t(38, 'Lunar Boss', '月のボス', 'Moon Lord', 'main', 'boss', ['lunar boss', 'moon lord']),
  t(39, 'Goblin Invasion', 'ゴブリン軍', 'Goblin Army', 'main', 'event', ['goblin invasion', 'goblin army', 'goblin']),
  t(40, 'Sandstorm', '砂嵐', 'Sandstorm', 'main', 'event', ['sandstorm']),
  t(41, "Old One's Army", 'オールドワンズアーミー', "Old One's Army", 'main', 'event', ["old one's army", 'old ones army']),
  t(42, 'Space Day', '宇宙（昼）', 'Space daytime', 'main', 'day', ['space day']),
  t(43, 'Ocean Night', '海（夜）', 'Ocean night', 'main', 'night', ['ocean night']),
  t(44, 'Windy Day', '風の強い日', 'Windy Day', 'main', 'event', ['windy day']),
  t(45, 'Wind ambience', '風（環境音）', 'Windy Day / Thunderstorm', 'ambience', 'other', ['wind ambience']),
  t(46, 'Town Day', '町（昼）', 'Town daytime', 'main', 'town', ['town day']),
  t(47, 'Town Night', '町（夜）', 'Town night', 'main', 'town', ['town night']),
  t(48, 'Slime Rain', 'スライムレイン', 'Slime Rain', 'main', 'event', ['slime rain']),
  t(49, 'Day Remix', '地上 Remix', 'Music Box only', 'main', 'other', ['day remix', 'day theme remix'], 'Xenon / DSniper'),
  t(50, "Journey's Beginning (with intro)", '旅の始まり（イントロ付き）', 'Title screen', 'main', 'title', ["journey's beginning (with intro)", 'journeys beginning with intro']),
  t(51, "Journey's Beginning", '旅の始まり', 'Title screen', 'main', 'title', ["journey's beginning", 'journey begins', 'the journey begins']),
  t(52, 'Storm', '嵐', 'Thunderstorm', 'main', 'event', ['storm']),
  t(53, 'Graveyard', '墓地', 'Graveyard', 'main', 'biome', ['graveyard']),
  t(54, 'Underground Jungle', '地下ジャングル', 'Underground Jungle', 'main', 'underground', ['underground jungle']),
  t(55, 'Jungle Night', 'ジャングル（夜）', 'Jungle surface night', 'main', 'night', ['jungle night']),
  t(56, 'Queen Slime', 'クイーンスライム', 'Queen Slime', 'main', 'boss', ['queen slime']),
  t(57, 'Empress of Light', '光の女帝', 'Empress of Light', 'main', 'boss', ['empress of light', 'empress']),
  t(58, 'Duke Fishron', 'デューク・フィッシュロン', 'Duke Fishron', 'main', 'boss', ['duke fishron', 'fishron']),
  t(59, 'Morning Rain', '朝の雨', 'Rain (morning)', 'main', 'event', ['morning rain']),
  t(60, 'Alt Title', 'タイトル（別）', 'Drunk world / Title', 'main', 'title', ['alt title', 'alternate title']),
  t(61, 'Underground Desert', '地下砂漠', 'Underground Desert', 'main', 'underground', ['underground desert']),

  // Otherworldly (62–88)
  t(62, 'Rain (Otherworldly)', '雨（Otherworld）', 'Rain (Otherworld)', 'otherworld', 'event', ['rain (otherworldly)', 'otherworldly rain']),
  t(63, 'Overworld Day (Otherworldly)', '地上・昼（Otherworld）', 'Forest daytime (OW)', 'otherworld', 'day', ['overworld day (otherworldly)']),
  t(64, 'Night (Otherworldly)', '夜（Otherworld）', 'Night (Otherworld)', 'otherworld', 'night', ['night (otherworldly)']),
  t(65, 'Underground (Otherworldly)', '地下（Otherworld）', 'Underground (OW)', 'otherworld', 'underground', ['underground (otherworldly)']),
  t(66, 'Desert (Otherworldly)', '砂漠（Otherworld）', 'Desert (OW)', 'otherworld', 'biome', ['desert (otherworldly)']),
  t(67, 'Ocean (Otherworldly)', '海（Otherworld）', 'Ocean (OW)', 'otherworld', 'biome', ['ocean (otherworldly)']),
  t(68, 'Mushrooms (Otherworldly)', 'キノコ（Otherworld）', 'Mushroom (OW)', 'otherworld', 'biome', ['mushrooms (otherworldly)']),
  t(69, 'Dungeon (Otherworldly)', 'ダンジョン（Otherworld）', 'Dungeon (OW)', 'otherworld', 'biome', ['dungeon (otherworldly)']),
  t(70, 'Space (Otherworldly)', '宇宙（Otherworld）', 'Space (OW)', 'otherworld', 'biome', ['space (otherworldly)']),
  t(71, 'Underworld (Otherworldly)', '地獄（Otherworld）', 'Underworld (OW)', 'otherworld', 'biome', ['underworld (otherworldly)']),
  t(72, 'Snow (Otherworldly)', '雪原（Otherworld）', 'Snow / Aether (OW)', 'otherworld', 'biome', ['snow (otherworldly)']),
  t(73, 'Corruption (Otherworldly)', '腐敗（Otherworld）', 'Corruption (OW)', 'otherworld', 'biome', ['corruption (otherworldly)']),
  t(74, 'Underground Corruption (Otherworldly)', '地下腐敗（Otherworld）', 'UG Corruption (OW)', 'otherworld', 'underground', ['underground corruption (otherworldly)']),
  t(75, 'Crimson (Otherworldly)', 'クリムゾン（Otherworld）', 'Crimson (OW)', 'otherworld', 'biome', ['crimson (otherworldly)']),
  t(76, 'Underground Crimson (Otherworldly)', '地下クリムゾン（Otherworld）', 'UG Crimson (OW)', 'otherworld', 'underground', ['underground crimson (otherworldly)']),
  t(77, 'Ice (Otherworldly)', '氷（Otherworld）', 'Ice (OW)', 'otherworld', 'biome', ['ice (otherworldly)']),
  t(78, 'Underground Hallow (Otherworldly)', '地下神聖（Otherworld）', 'UG Hallow (OW)', 'otherworld', 'underground', ['underground hallow (otherworldly)']),
  t(79, 'Eerie (Otherworldly)', '不気味（Otherworld）', 'Blood Moon など (OW)', 'otherworld', 'event', ['eerie (otherworldly)']),
  t(80, 'Boss 2 (Otherworldly)', 'ボス2（Otherworld）', '複数ボス (OW)', 'otherworld', 'boss', ['boss 2 (otherworldly)']),
  t(81, 'Boss 1 (Otherworldly)', 'ボス1（Otherworld）', '複数ボス (OW)', 'otherworld', 'boss', ['boss 1 (otherworldly)']),
  t(82, 'Invasion (Otherworldly)', '侵略（Otherworld）', '各種侵略 (OW)', 'otherworld', 'event', ['invasion (otherworldly)']),
  t(83, 'The Towers (Otherworldly)', '天界の柱（Otherworld）', 'Lunar Events (OW)', 'otherworld', 'boss', ['the towers (otherworldly)']),
  t(84, 'Lunar Boss (Otherworldly)', '月のボス（Otherworld）', 'Moon Lord (OW)', 'otherworld', 'boss', ['lunar boss (otherworldly)']),
  t(85, 'Plantera (Otherworldly)', 'プランテラ（Otherworld）', 'Plantera (OW)', 'otherworld', 'boss', ['plantera (otherworldly)']),
  t(86, 'Jungle (Otherworldly)', 'ジャングル（Otherworld）', 'Jungle (OW)', 'otherworld', 'biome', ['jungle (otherworldly)']),
  t(87, 'Wall of Flesh (Otherworldly)', 'ウォール・オブ・フレッシュ（Otherworld）', 'WoF / Torch God (OW)', 'otherworld', 'boss', ['wall of flesh (otherworldly)']),
  t(88, 'Hallow (Otherworldly)', '神聖（Otherworld）', 'Hallow daytime (OW)', 'otherworld', 'biome', ['hallow (otherworldly)']),

  t(89, "Journey's End", '旅の終わり', 'Credits', 'main', 'title', ["journey's end", 'credits', "journey's end - credits"]),
  t(90, 'Deerclops', 'ディアクロプス', 'Deerclops', 'main', 'boss', ['deerclops'], 'Klei Entertainment'),
  t(91, 'Aether', 'エーテル', 'The Aether', 'main', 'biome', ['aether']),
  t(92, 'The Destroyer', 'デストロイヤー', 'The Destroyer', 'main', 'boss', ['the destroyer', 'destroyer']),
  t(93, 'King Slime', 'キングスライム', 'King Slime', 'main', 'boss', ['king slime']),
  t(94, 'Lunatic Cultist', 'ルナティックカルト主義者', 'Lunatic Cultist', 'main', 'boss', ['lunatic cultist', 'cultist']),
  t(95, 'Alt Queen Bee', 'クイーンビー（別）', 'Music Box (Shimmer)', 'main', 'boss', ['alt queen bee', 'queen bee (alternate)', 'queen bee alternate']),
  t(96, 'Queen Bee', 'クイーンビー', 'Queen Bee', 'main', 'boss', ['queen bee']),
  t(97, 'The Twins', 'ツインズ', 'The Twins', 'main', 'boss', ['the twins', 'twins']),
  t(98, 'Skeletron Prime', 'スケレトロンプライム', 'Skeletron Prime', 'main', 'boss', ['skeletron prime']),
  t(99, 'Eater of Worlds', 'ワールドイーター', 'Eater of Worlds', 'main', 'boss', ['eater of worlds']),
  t(100, 'Alt Torch God', 'トーチゴッド（別）', 'Music Box (Shimmer)', 'main', 'event', ['alt torch god', 'torch god (alternate)'], 'Prosthetic Orchestra'),
  t(101, 'Torch God', 'トーチゴッド', 'The Torch God', 'main', 'event', ['torch god', 'the torch god'], 'Prosthetic Orchestra'),
  t(102, 'Rainbow Boulder (with intro)', 'レインボーボルダー（イントロ）', 'Rainbow Boulder', 'main', 'event', ['rainbow boulder (with intro)']),
  t(103, 'Rainbow Boulder', 'レインボーボルダー', 'Rainbow Boulder', 'main', 'event', ['rainbow boulder']),
  t(104, 'Skeletron', 'スケレトロン', 'Skeletron', 'main', 'boss', ['skeletron']),
]

export const MUSIC_LICENSE = {
  title: 'Terraria in-game Music',
  rights: '© Re-Logic. All rights reserved.',
  composers:
    'Scott Lloyd Shelly (Resonance Array) — 大半の曲。Deerclops — Klei Entertainment。Torch God — Prosthetic Orchestra。Day Remix — Xenon / DSniper。',
  extras:
    '曲目・再生条件は公式 Wiki「Music」に準拠。試聴は Wiki の Listen 列と同じ配信をストリーム再生します（本アプリに音源は同梱しません）。',
  personalUse:
    '購入済み OST を読み込むと、Wiki ストリームの代わりにローカルファイルで再生できます。',
  purchase: '正規購入: Steam「Terraria: Official Soundtrack」 / Bandcamp (Re-Logic)',
  source: 'https://terraria.wiki.gg/wiki/Music',
} as const

export const OFFICIAL_LINKS = {
  steam: 'https://store.steampowered.com/app/409210/Terraria_Official_Soundtrack/',
  bandcamp: 'https://re-logic.bandcamp.com/album/terraria-soundtrack',
  spotifyVol1: 'https://open.spotify.com/embed/album/00NU9JjK7J3YSYhDzfuzrb',
  wiki: 'https://terraria.wiki.gg/wiki/Music',
  wikiAlbums: 'https://terraria.wiki.gg/wiki/Soundtrack_albums',
} as const

export function trackById(id: string): MusicTrack | undefined {
  return MUSIC_TRACKS.find((t) => t.id === id)
}

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function suggestTrackIdForHour(hour: number): string {
  if (hour >= 5 && hour < 11) return 'm001'
  if (hour >= 11 && hour < 17) return 'm018'
  if (hour >= 17 && hour < 20) return 'm046'
  if (hour >= 20 || hour < 3) return 'm003'
  return 'm002'
}

export function scoreTrackMatch(filename: string, track: MusicTrack): number {
  const n = filename.toLowerCase().replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
  let best = 0
  for (const m of track.match) {
    if (!m || m.length < 3) continue
    if (n === m) best = Math.max(best, 1000 + m.length)
    else if (n.includes(m)) best = Math.max(best, 100 + m.length)
  }
  // Music Box style: "Music Box - Overworld Day"
  if (n.includes('music box') && track.match.some((m) => n.includes(m))) {
    best = Math.max(best, 200)
  }
  return best
}

export function matchTrackFromFilename(name: string): MusicTrack | undefined {
  let best: MusicTrack | undefined
  let bestScore = 0
  for (const track of MUSIC_TRACKS) {
    const s = scoreTrackMatch(name, track)
    if (s > bestScore) {
      bestScore = s
      best = track
    }
  }
  return bestScore > 0 ? best : undefined
}

export function customTrackId(filename: string): string {
  const base = filename
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
  return `custom-${base || 'track'}`
}
