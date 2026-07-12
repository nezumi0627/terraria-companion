'use client'

import { create } from 'zustand'

export type Tab = 'home' | 'wiki' | 'acquire' | 'progress' | 'settings'

export type EntityKind = 'boss' | 'npc' | 'biome' | 'event' | 'station' | 'enemy'

export type Overlay =
  | { type: 'item'; id: string }
  | { type: 'entity'; kind: EntityKind; id: string }
  | { type: 'goal'; id: string }

function sameOverlay(a: Overlay, b: Overlay): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'item' && b.type === 'item') return a.id === b.id
  if (a.type === 'goal' && b.type === 'goal') return a.id === b.id
  if (a.type === 'entity' && b.type === 'entity') return a.kind === b.kind && a.id === b.id
  return false
}

/** Push overlay, or pop back to an existing matching frame (no duplicate stacks). */
function pushOverlay(stack: Overlay[], next: Overlay): Overlay[] {
  const top = stack[stack.length - 1]
  if (top && sameOverlay(top, next)) return stack
  const idx = stack.findIndex((o) => sameOverlay(o, next))
  if (idx >= 0) return stack.slice(0, idx + 1)
  return [...stack, next]
}

interface UiState {
  tab: Tab
  setTab: (t: Tab) => void
  stack: Overlay[]
  openItem: (id: string) => void
  openEntity: (kind: EntityKind, id: string) => void
  openGoal: (id: string) => void
  back: () => void
  closeAll: () => void
}

export const useUi = create<UiState>((set) => ({
  tab: 'home',
  setTab: (t) => set({ tab: t, stack: [] }),
  stack: [],
  openItem: (id) => set((s) => ({ stack: pushOverlay(s.stack, { type: 'item', id }) })),
  openEntity: (kind, id) =>
    set((s) => ({ stack: pushOverlay(s.stack, { type: 'entity', kind, id }) })),
  openGoal: (id) => set((s) => ({ stack: pushOverlay(s.stack, { type: 'goal', id }) })),
  back: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  closeAll: () => set({ stack: [] }),
}))
