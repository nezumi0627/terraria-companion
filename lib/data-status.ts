'use client'

import { create } from 'zustand'
import { loadExtendedData } from '@/lib/data'

interface DataStatus {
  /** Increments whenever registries are rebuilt (curated boot + wiki merge). */
  version: number
  /** True after wiki / sprites JSON has been merged successfully. */
  extended: boolean
  loading: boolean
  error: string | null
  ensure: () => Promise<void>
}

let inflight: Promise<void> | null = null

export const useDataStatus = create<DataStatus>((set, get) => ({
  version: 1,
  extended: false,
  loading: false,
  error: null,
  ensure: async () => {
    if (get().extended) return
    if (inflight) return inflight
    set({ loading: true, error: null })
    inflight = loadExtendedData()
      .then(() => {
        set((s) => ({
          extended: true,
          loading: false,
          error: null,
          version: s.version + 1,
        }))
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'データ読込に失敗しました'
        set((s) => ({
          loading: false,
          error: message,
          // Keep extended=false so ensure() can retry; still bump version for curated UI.
          extended: false,
          version: s.version + 1,
        }))
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  },
}))
