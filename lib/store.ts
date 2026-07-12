'use client'

import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import {
  buildChecklist,
  progressionBosses,
  curatedItems,
  npcs,
  type ChecklistEntry,
} from './data'

const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet(name)) ?? null,
  setItem: async (name, value) => {
    await idbSet(name, value)
  },
  removeItem: async (name) => {
    await idbDel(name)
  },
}

export type FavKind = 'item' | 'boss' | 'npc' | 'biome' | 'event' | 'station' | 'enemy'
export interface RecentView {
  kind: FavKind
  id: string
  at: number
}
export interface Goal {
  itemId: string
  createdAt: number
}
export interface DailyTask {
  id: string
  label: string
}

export interface AppState {
  hydrated: boolean
  setHydrated: (v: boolean) => void

  // progression tracking
  owned: Record<string, number>
  defeatedBosses: Record<string, boolean>
  unlockedNpcs: Record<string, boolean>
  completedEvents: Record<string, boolean>
  visitedBiomes: Record<string, boolean>
  builtStations: Record<string, boolean>
  craftedItems: Record<string, boolean>
  collected: Record<string, boolean>

  // goals (max 3)
  goals: Goal[]
  addGoal: (itemId: string) => void
  removeGoal: (itemId: string) => void

  // favorites
  favorites: Record<string, boolean>
  toggleFavorite: (kind: FavKind, id: string) => void
  isFavorite: (kind: FavKind, id: string) => boolean

  // recents
  recentSearches: string[]
  addRecentSearch: (q: string) => void
  recentViews: RecentView[]
  addRecentView: (kind: FavKind, id: string) => void

  // daily checklist (user-editable)
  dailyTasks: DailyTask[]
  dailyDate: string
  dailyChecked: Record<string, boolean>
  toggleDaily: (id: string) => void
  addDailyTask: (label: string) => void
  updateDailyTask: (id: string, label: string) => void
  removeDailyTask: (id: string) => void
  resetDailyTasks: () => void

  // mutations
  setOwned: (itemId: string, count: number) => void
  toggleBoss: (id: string) => void
  toggleNpc: (id: string) => void
  toggleEvent: (id: string) => void
  toggleBiome: (id: string) => void
  toggleStation: (id: string) => void
  toggleCrafted: (id: string) => void
  toggleCollected: (id: string) => void

  // settings
  theme: 'dark' | 'light'
  setTheme: (t: 'dark' | 'light') => void
  notifications: boolean
  setNotifications: (v: boolean) => void

  resetProgress: () => void
  /** Returns false when the payload is invalid / empty. */
  importState: (data: unknown) => boolean
}

/** Default seed used on first launch / when user resets the quest list. */
export const DEFAULT_DAILY_TASKS: DailyTask[] = [
  { id: 'mine', label: '鉱石を採掘して装備を更新する' },
  { id: 'npc', label: '新しいNPCの家を用意する' },
  { id: 'boss', label: '次のボスに1回挑戦する' },
  { id: 'explore', label: '未踏のバイオームを探索する' },
  { id: 'potion', label: 'ボス戦用のポーションを補充する' },
]

/** @deprecated use DEFAULT_DAILY_TASKS or store.dailyTasks */
export const DAILY_TASKS = DEFAULT_DAILY_TASKS

const today = () => new Date().toISOString().slice(0, 10)

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),

      owned: {},
      defeatedBosses: {},
      unlockedNpcs: {},
      completedEvents: {},
      visitedBiomes: {},
      builtStations: {},
      craftedItems: {},
      collected: {},

      goals: [],
      addGoal: (itemId) =>
        set((s) => {
          if (s.goals.some((g) => g.itemId === itemId)) return s
          if (s.goals.length >= 3) return s
          return { goals: [...s.goals, { itemId, createdAt: Date.now() }] }
        }),
      removeGoal: (itemId) =>
        set((s) => ({ goals: s.goals.filter((g) => g.itemId !== itemId) })),

      favorites: {},
      toggleFavorite: (kind, id) =>
        set((s) => {
          const key = `${kind}:${id}`
          const favorites = { ...s.favorites }
          if (favorites[key]) delete favorites[key]
          else favorites[key] = true
          return { favorites }
        }),
      isFavorite: (kind, id) => !!get().favorites[`${kind}:${id}`],

      recentSearches: [],
      addRecentSearch: (q) =>
        set((s) => {
          const t = q.trim()
          if (!t) return s
          const recentSearches = [t, ...s.recentSearches.filter((x) => x !== t)].slice(0, 10)
          return { recentSearches }
        }),
      recentViews: [],
      addRecentView: (kind, id) =>
        set((s) => {
          const recentViews = [
            { kind, id, at: Date.now() },
            ...s.recentViews.filter((r) => !(r.kind === kind && r.id === id)),
          ].slice(0, 20)
          return { recentViews }
        }),

      dailyTasks: DEFAULT_DAILY_TASKS.map((t) => ({ ...t })),
      dailyDate: today(),
      dailyChecked: {},
      toggleDaily: (id) =>
        set((s) => {
          const d = today()
          const dailyChecked = s.dailyDate === d ? { ...s.dailyChecked } : {}
          dailyChecked[id] = !dailyChecked[id]
          return { dailyChecked, dailyDate: d }
        }),
      addDailyTask: (label) =>
        set((s) => {
          const text = label.trim()
          if (!text || s.dailyTasks.length >= 20) return s
          const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
          return { dailyTasks: [...s.dailyTasks, { id, label: text.slice(0, 80) }] }
        }),
      updateDailyTask: (id, label) =>
        set((s) => {
          const text = label.trim().slice(0, 80)
          if (!text) return s
          return {
            dailyTasks: s.dailyTasks.map((t) => (t.id === id ? { ...t, label: text } : t)),
          }
        }),
      removeDailyTask: (id) =>
        set((s) => {
          const dailyChecked = { ...s.dailyChecked }
          delete dailyChecked[id]
          return {
            dailyTasks: s.dailyTasks.filter((t) => t.id !== id),
            dailyChecked,
          }
        }),
      resetDailyTasks: () =>
        set({
          dailyTasks: DEFAULT_DAILY_TASKS.map((t) => ({ ...t })),
          dailyChecked: {},
          dailyDate: today(),
        }),

      setOwned: (itemId, count) =>
        set((s) => ({ owned: { ...s.owned, [itemId]: Math.max(0, count) } })),
      toggleBoss: (id) =>
        set((s) => ({ defeatedBosses: flip(s.defeatedBosses, id) })),
      toggleNpc: (id) => set((s) => ({ unlockedNpcs: flip(s.unlockedNpcs, id) })),
      toggleEvent: (id) => set((s) => ({ completedEvents: flip(s.completedEvents, id) })),
      toggleBiome: (id) => set((s) => ({ visitedBiomes: flip(s.visitedBiomes, id) })),
      toggleStation: (id) => set((s) => ({ builtStations: flip(s.builtStations, id) })),
      toggleCrafted: (id) => set((s) => ({ craftedItems: flip(s.craftedItems, id) })),
      toggleCollected: (id) => set((s) => ({ collected: flip(s.collected, id) })),

      theme: 'dark',
      setTheme: (t) => {
        set({ theme: t })
        applyTheme(t)
      },
      notifications: false,
      setNotifications: (v) => set({ notifications: v }),

      resetProgress: () =>
        set({
          owned: {},
          defeatedBosses: {},
          unlockedNpcs: {},
          completedEvents: {},
          visitedBiomes: {},
          builtStations: {},
          craftedItems: {},
          collected: {},
          goals: [],
          favorites: {},
          recentSearches: [],
          recentViews: [],
          dailyChecked: {},
        }),
      importState: (data) => {
        const patch = sanitizeImport(data)
        if (!patch) return false
        set((s) => ({ ...s, ...patch }))
        if (patch.theme) applyTheme(patch.theme)
        return true
      },
    }),
    {
      name: 'terraria-companion',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => {
        const { hydrated, setHydrated, ...rest } = s
        return rest as AppState
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.setHydrated(true)
        if (state.theme) applyTheme(state.theme)
        // Migrate older saves that lacked a customizable quest list.
        if (!state.dailyTasks?.length) {
          state.dailyTasks = DEFAULT_DAILY_TASKS.map((t) => ({ ...t }))
        }
      },
    },
  ),
)

function flip(rec: Record<string, boolean>, id: string): Record<string, boolean> {
  const next = { ...rec }
  if (next[id]) delete next[id]
  else next[id] = true
  return next
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function asBoolRecord(v: unknown): Record<string, boolean> | undefined {
  if (!isPlainObject(v)) return undefined
  const out: Record<string, boolean> = {}
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === 'boolean') out[k] = val
  }
  return out
}

function asOwnedRecord(v: unknown): Record<string, number> | undefined {
  if (!isPlainObject(v)) return undefined
  const out: Record<string, number> = {}
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === 'number' && Number.isFinite(val)) out[k] = Math.max(0, Math.floor(val))
  }
  return out
}

function asGoals(v: unknown): Goal[] | undefined {
  if (!Array.isArray(v)) return undefined
  const goals: Goal[] = []
  for (const g of v) {
    if (!isPlainObject(g)) continue
    if (typeof g.itemId !== 'string' || !g.itemId) continue
    const createdAt = typeof g.createdAt === 'number' && Number.isFinite(g.createdAt) ? g.createdAt : Date.now()
    if (goals.some((x) => x.itemId === g.itemId)) continue
    goals.push({ itemId: g.itemId, createdAt })
    if (goals.length >= 3) break
  }
  return goals
}

function asDailyTasks(v: unknown): DailyTask[] | undefined {
  if (!Array.isArray(v)) return undefined
  const tasks: DailyTask[] = []
  for (const t of v) {
    if (!isPlainObject(t)) continue
    if (typeof t.id !== 'string' || typeof t.label !== 'string') continue
    const label = t.label.trim().slice(0, 80)
    if (!label) continue
    tasks.push({ id: t.id, label })
    if (tasks.length >= 20) break
  }
  return tasks
}

/** Pick only persistable progress fields; ignore functions / hydrated / unknown keys. */
function sanitizeImport(data: unknown): Partial<AppState> | null {
  if (!isPlainObject(data)) return null
  const patch: Partial<AppState> = {}
  const owned = asOwnedRecord(data.owned)
  if (owned) patch.owned = owned
  const defeatedBosses = asBoolRecord(data.defeatedBosses)
  if (defeatedBosses) patch.defeatedBosses = defeatedBosses
  const unlockedNpcs = asBoolRecord(data.unlockedNpcs)
  if (unlockedNpcs) patch.unlockedNpcs = unlockedNpcs
  const completedEvents = asBoolRecord(data.completedEvents)
  if (completedEvents) patch.completedEvents = completedEvents
  const visitedBiomes = asBoolRecord(data.visitedBiomes)
  if (visitedBiomes) patch.visitedBiomes = visitedBiomes
  const builtStations = asBoolRecord(data.builtStations)
  if (builtStations) patch.builtStations = builtStations
  const craftedItems = asBoolRecord(data.craftedItems)
  if (craftedItems) patch.craftedItems = craftedItems
  const collected = asBoolRecord(data.collected)
  if (collected) patch.collected = collected
  const favorites = asBoolRecord(data.favorites)
  if (favorites) patch.favorites = favorites
  const goals = asGoals(data.goals)
  if (goals) patch.goals = goals
  const dailyTasks = asDailyTasks(data.dailyTasks)
  if (dailyTasks) patch.dailyTasks = dailyTasks
  if (data.theme === 'dark' || data.theme === 'light') patch.theme = data.theme
  if (typeof data.notifications === 'boolean') patch.notifications = data.notifications
  return Object.keys(patch).length ? patch : null
}

export function applyTheme(t: 'dark' | 'light') {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  el.classList.toggle('light', t === 'light')
  el.classList.toggle('dark', t === 'dark')
  try {
    localStorage.setItem('tc-theme', t)
  } catch {}
}

// ---------------- Derived selectors ----------------

/** Is a checklist entry satisfied by current progress state? */
export function isEntryDone(s: AppState, e: ChecklistEntry): boolean {
  switch (e.kind) {
    case 'boss':
      return !!s.defeatedBosses[e.refId]
    case 'npc':
      return !!s.unlockedNpcs[e.refId]
    case 'event':
      return !!s.completedEvents[e.refId]
    case 'biome':
      return !!s.visitedBiomes[e.refId]
    case 'station':
      return !!s.builtStations[e.refId]
    case 'craft':
      return !!s.craftedItems[e.refId]
    case 'material':
      return (s.owned[e.refId] ?? 0) >= (e.count ?? 1)
  }
}

export interface GoalProgress {
  itemId: string
  checklist: ChecklistEntry[]
  done: number
  total: number
  percent: number
  remainingBosses: number
  remainingMaterials: number
  nextTask?: ChecklistEntry
}

export function goalProgress(s: AppState, itemId: string): GoalProgress {
  const checklist = buildChecklist(itemId)
  let done = 0
  let remainingBosses = 0
  let remainingMaterials = 0
  let nextTask: ChecklistEntry | undefined
  for (const e of checklist) {
    const ok = isEntryDone(s, e)
    if (ok) done++
    else {
      if (!nextTask) nextTask = e
      if (e.kind === 'boss') remainingBosses++
      if (e.kind === 'material') remainingMaterials++
    }
  }
  const total = checklist.length
  return {
    itemId,
    checklist,
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    remainingBosses,
    remainingMaterials,
    nextTask,
  }
}

export function overallProgress(s: AppState): number {
  const bossIds = progressionBosses.map((b) => b.id)
  const npcIds = npcs.map((n) => n.id)
  const itemObtained =
    curatedItems.length === 0
      ? 0
      : curatedItems.filter(
          (i) => s.craftedItems[i.id] || s.collected[i.id] || (s.owned[i.id] ?? 0) > 0,
        ).length / curatedItems.length
  const parts = [
    ratioIds(s.defeatedBosses, bossIds),
    ratioIds(s.unlockedNpcs, npcIds),
    itemObtained,
  ]
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100)
}

function ratioIds(rec: Record<string, boolean>, ids: string[]): number {
  if (!ids.length) return 0
  return ids.filter((id) => !!rec[id]).length / ids.length
}
