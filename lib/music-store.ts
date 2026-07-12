'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import {
  MUSIC_TRACKS,
  customTrackId,
  matchTrackFromFilename,
  suggestTrackIdForHour,
  trackById,
  type MusicGroup,
  type MusicMood,
  type MusicTrack,
} from '@/lib/music-tracks'

const IDB_PREFIX = 'tc-music-blob:'
const META_KEY = 'tc-music-library'

export type RepeatMode = 'off' | 'all' | 'one'

interface CustomMeta {
  title: string
  titleJa: string
}

interface LibraryMeta {
  /** trackId → original file name */
  files: Record<string, string>
  /** unmatched personal files */
  custom?: Record<string, CustomMeta>
}

interface MusicState {
  expanded: boolean
  setExpanded: (v: boolean) => void
  toggleExpanded: () => void

  currentId: string | null
  playing: boolean
  shuffle: boolean
  repeat: RepeatMode
  volume: number
  muted: boolean
  progress: number
  duration: number

  filterGroup: MusicGroup | 'all'
  filterMood: MusicMood | 'all'
  setFilterGroup: (v: MusicGroup | 'all') => void
  setFilterMood: (v: MusicMood | 'all') => void

  library: Record<string, string>
  custom: Record<string, CustomMeta>
  libraryReady: boolean
  hydrateLibrary: () => Promise<void>
  importFiles: (files: FileList | File[]) => Promise<{ added: number; skipped: number }>
  clearLibrary: () => Promise<void>
  hasAudio: (trackId: string) => boolean
  resolveTrack: (trackId: string | null) => MusicTrack | null

  play: (trackId?: string) => Promise<void>
  pause: () => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (ratio: number) => void
  setVolume: (v: number) => void
  setMuted: (v: boolean) => void
  setShuffle: (v: boolean) => void
  setRepeat: (v: RepeatMode) => void
  playSuggested: () => void

  _bindAudio: (el: HTMLAudioElement | null) => void
  _onTimeUpdate: () => void
  _onEnded: () => void
  _onLoaded: () => void
}

let audioEl: HTMLAudioElement | null = null
const objectUrls = new Map<string, string>()

async function blobUrlFor(trackId: string): Promise<string | null> {
  const existing = objectUrls.get(trackId)
  if (existing) return existing
  const blob = await idbGet<Blob>(`${IDB_PREFIX}${trackId}`)
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  objectUrls.set(trackId, url)
  return url
}

function revokeAllUrls() {
  for (const url of objectUrls.values()) URL.revokeObjectURL(url)
  objectUrls.clear()
}

function filteredIds(group: MusicGroup | 'all', mood: MusicMood | 'all') {
  return MUSIC_TRACKS.filter((t) => {
    if (group !== 'all' && t.group !== group) return false
    if (mood !== 'all' && t.mood !== mood) return false
    return true
  }).map((t) => t.id)
}

function queueIds(
  group: MusicGroup | 'all',
  mood: MusicMood | 'all',
  library: Record<string, string>,
  custom: Record<string, CustomMeta>,
) {
  let ids = filteredIds(group, mood)
  if (group === 'all' && mood === 'all') {
    ids = [...ids, ...Object.keys(custom).filter((id) => library[id])]
  }
  return ids
}

async function resolvePlayUrl(trackId: string): Promise<string | null> {
  const local = await blobUrlFor(trackId)
  if (local) return local
  return trackById(trackId)?.streamUrl || null
}

function pickNext(
  currentId: string | null,
  ids: string[],
  shuffle: boolean,
  dir: 1 | -1,
): string | null {
  if (ids.length === 0) return null
  if (!currentId) return ids[0]
  const idx = ids.indexOf(currentId)
  if (shuffle) {
    if (ids.length === 1) return ids[0]
    let next = idx
    while (next === idx) next = Math.floor(Math.random() * ids.length)
    return ids[next]
  }
  if (idx < 0) return ids[0]
  const next = (idx + dir + ids.length) % ids.length
  return ids[next]
}

export const useMusic = create<MusicState>()(
  persist(
    (set, get) => ({
      expanded: false,
      setExpanded: (v) => set({ expanded: v }),
      toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),

      currentId: null,
      playing: false,
      shuffle: false,
      repeat: 'all',
      volume: 0.7,
      muted: false,
      progress: 0,
      duration: 0,

      filterGroup: 'all',
      filterMood: 'all',
      setFilterGroup: (v) => set({ filterGroup: v }),
      setFilterMood: (v) => set({ filterMood: v }),

      library: {},
      custom: {},
      libraryReady: false,

      hydrateLibrary: async () => {
        const meta = (await idbGet<LibraryMeta>(META_KEY)) || { files: {} }
        set({ library: meta.files, custom: meta.custom || {}, libraryReady: true })
      },

      resolveTrack: (trackId) => {
        if (!trackId) return null
        const catalog = trackById(trackId)
        if (catalog) return catalog
        const c = get().custom[trackId]
        if (!c) return null
        return {
          id: trackId,
          index: 0,
          title: c.title,
          titleJa: c.titleJa,
          condition: '個人ファイル',
          group: 'main',
          duration: 0,
          mood: 'other',
          match: [],
        }
      },

      importFiles: async (files) => {
        let added = 0
        let skipped = 0
        const next = { ...get().library }
        const custom = { ...get().custom }
        for (const file of Array.from(files)) {
          if (!file.type.startsWith('audio/') && !/\.(mp3|ogg|wav|flac|m4a)$/i.test(file.name)) {
            skipped += 1
            continue
          }
          const catalog = matchTrackFromFilename(file.name)
          const id = catalog?.id || customTrackId(file.name)
          if (!catalog) {
            const label = file.name.replace(/\.[^.]+$/, '')
            custom[id] = { title: label, titleJa: label }
          }
          await idbSet(`${IDB_PREFIX}${id}`, file)
          const prevUrl = objectUrls.get(id)
          if (prevUrl) {
            URL.revokeObjectURL(prevUrl)
            objectUrls.delete(id)
          }
          next[id] = file.name
          added += 1
        }
        await idbSet(META_KEY, { files: next, custom } satisfies LibraryMeta)
        set({ library: next, custom })
        return { added, skipped }
      },

      clearLibrary: async () => {
        const ids = Object.keys(get().library)
        for (const id of ids) await idbDel(`${IDB_PREFIX}${id}`)
        await idbSet(META_KEY, { files: {}, custom: {} } satisfies LibraryMeta)
        revokeAllUrls()
        if (audioEl) {
          audioEl.pause()
          audioEl.removeAttribute('src')
          audioEl.load()
        }
        set({ library: {}, custom: {}, playing: false, progress: 0, duration: 0 })
      },

      hasAudio: (trackId) => {
        if (get().library[trackId]) return true
        return !!trackById(trackId)?.streamUrl
      },

      _bindAudio: (el) => {
        audioEl = el
        if (!el) return
        el.volume = get().muted ? 0 : get().volume
      },

      _onTimeUpdate: () => {
        if (!audioEl) return
        set({
          progress: audioEl.duration ? audioEl.currentTime / audioEl.duration : 0,
          duration: audioEl.duration || 0,
        })
      },

      _onLoaded: () => {
        if (!audioEl) return
        set({ duration: audioEl.duration || 0 })
      },

      _onEnded: () => {
        const { repeat, currentId } = get()
        if (repeat === 'one' && currentId) {
          void get().play(currentId)
          return
        }
        if (repeat === 'off') {
          set({ playing: false, progress: 0 })
          return
        }
        get().next()
      },

      play: async (trackId) => {
        const id = trackId || get().currentId
        if (!id || !audioEl) return
        const url = await resolvePlayUrl(id)
        if (!url) return
        if (audioEl.src !== url) {
          audioEl.src = url
        }
        audioEl.volume = get().muted ? 0 : get().volume
        try {
          await audioEl.play()
          set({ currentId: id, playing: true })
          const meta = get().resolveTrack(id)
          if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && meta) {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: meta.titleJa,
              artist: meta.credit || 'Scott Lloyd Shelly / Terraria',
              album:
                meta.group === 'otherworld'
                  ? 'Terraria: Otherworld'
                  : meta.group === 'ambience'
                    ? 'Terraria ambience'
                    : 'Terraria Music',
            })
            navigator.mediaSession.setActionHandler('play', () => void get().play())
            navigator.mediaSession.setActionHandler('pause', () => get().pause())
            navigator.mediaSession.setActionHandler('previoustrack', () => get().prev())
            navigator.mediaSession.setActionHandler('nexttrack', () => get().next())
          }
        } catch {
          set({ currentId: id, playing: false })
        }
      },

      pause: () => {
        audioEl?.pause()
        set({ playing: false })
      },

      toggle: () => {
        if (get().playing) get().pause()
        else void get().play()
      },

      next: () => {
        const { filterGroup, filterMood, library, currentId, shuffle, custom } = get()
        const pool = queueIds(filterGroup, filterMood, library, custom)
        const nextId = pickNext(currentId, pool, shuffle, 1)
        if (nextId) void get().play(nextId)
      },

      prev: () => {
        if (audioEl && audioEl.currentTime > 3) {
          audioEl.currentTime = 0
          set({ progress: 0 })
          return
        }
        const { filterGroup, filterMood, library, currentId, shuffle, custom } = get()
        const pool = queueIds(filterGroup, filterMood, library, custom)
        const prevId = pickNext(currentId, pool, shuffle, -1)
        if (prevId) void get().play(prevId)
      },

      seek: (ratio) => {
        if (!audioEl || !audioEl.duration) return
        audioEl.currentTime = Math.max(0, Math.min(1, ratio)) * audioEl.duration
        set({ progress: ratio })
      },

      setVolume: (v) => {
        const volume = Math.max(0, Math.min(1, v))
        if (audioEl) audioEl.volume = get().muted ? 0 : volume
        set({ volume })
      },

      setMuted: (muted) => {
        if (audioEl) audioEl.volume = muted ? 0 : get().volume
        set({ muted })
      },

      setShuffle: (shuffle) => set({ shuffle }),
      setRepeat: (repeat) => set({ repeat }),

      playSuggested: () => {
        const hour = new Date().getHours()
        const suggested = suggestTrackIdForHour(hour)
        if (trackById(suggested)?.streamUrl || get().library[suggested]) {
          void get().play(suggested)
          return
        }
        const mood = trackById(suggested)?.mood
        const byMood = mood ? MUSIC_TRACKS.find((t) => t.mood === mood && t.streamUrl) : undefined
        const fallback = byMood?.id || MUSIC_TRACKS.find((t) => t.streamUrl)?.id
        if (fallback) void get().play(fallback)
      },
    }),
    {
      name: 'tc-music-prefs',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        volume: s.volume,
        muted: s.muted,
        shuffle: s.shuffle,
        repeat: s.repeat,
        currentId: s.currentId,
        filterGroup: s.filterGroup,
        filterMood: s.filterMood,
      }),
    },
  ),
)

export function musicQueueIds(): string[] {
  const s = useMusic.getState()
  return queueIds(s.filterGroup, s.filterMood, s.library, s.custom)
}
