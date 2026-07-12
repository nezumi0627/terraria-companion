'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  assertValidPin,
  assertValidUserId,
  hashPin,
  loginCloudUser,
  registerCloudUser,
  saveCloudUser,
} from '@/lib/github-users'
import { cloudApiConfigured, cloudApiReady } from '@/lib/cloud-api'
import { exportProgressSnapshot, useStore } from '@/lib/store'

const SESSION_KEY = 'tc-cloud-auth'

export type AuthStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AuthState {
  userId: string | null
  /** Kept in persisted session for simple re-login; 4-digit by design */
  pin: string | null
  fileSha: string | null
  status: AuthStatus
  lastError: string | null
  lastSyncedAt: number | null
  syncing: boolean

  register: (id: string, pin: string) => Promise<{ ok: boolean; error?: string }>
  login: (id: string, pin: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  saveNow: () => Promise<{ ok: boolean; error?: string }>
  setFileSha: (sha: string | null) => void
}

function applyUserState(state: Record<string, unknown>) {
  useStore.getState().importState(state)
}

const NO_API =
  'クラウド API に接続できません。数分後に再試行するか、設定を確認してください'

async function ensureApi() {
  if (cloudApiConfigured()) return true
  return cloudApiReady()
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: null,
      pin: null,
      fileSha: null,
      status: 'idle',
      lastError: null,
      lastSyncedAt: null,
      syncing: false,

      setFileSha: (sha) => set({ fileSha: sha }),

      register: async (id, pin) => {
        const idErr = assertValidUserId(id)
        if (idErr) return { ok: false, error: idErr }
        const pinErr = assertValidPin(pin)
        if (pinErr) return { ok: false, error: pinErr }
        if (!(await ensureApi())) return { ok: false, error: NO_API }

        set({ status: 'loading', lastError: null })
        try {
          const userId = id.trim().toLowerCase()
          const pinHash = await hashPin(userId, pin)
          const snapshot = exportProgressSnapshot(useStore.getState())
          const result = await registerCloudUser(userId, pinHash, snapshot)
          set({
            userId: result.userId,
            pin,
            fileSha: result.sha,
            status: 'ready',
            lastSyncedAt: result.updatedAt,
            lastError: null,
          })
          return { ok: true }
        } catch (e) {
          const msg = e instanceof Error ? e.message : '登録に失敗しました'
          set({ status: 'error', lastError: msg })
          return { ok: false, error: msg }
        }
      },

      login: async (id, pin) => {
        const idErr = assertValidUserId(id)
        if (idErr) return { ok: false, error: idErr }
        const pinErr = assertValidPin(pin)
        if (pinErr) return { ok: false, error: pinErr }
        if (!(await ensureApi())) return { ok: false, error: NO_API }

        set({ status: 'loading', lastError: null })
        try {
          const userId = id.trim().toLowerCase()
          const pinHash = await hashPin(userId, pin)
          const result = await loginCloudUser(userId, pinHash)
          applyUserState(result.state || {})
          set({
            userId: result.userId,
            pin,
            fileSha: result.sha,
            status: 'ready',
            lastSyncedAt: result.updatedAt,
            lastError: null,
          })
          return { ok: true }
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'ログインに失敗しました'
          set({ status: 'error', lastError: msg })
          return { ok: false, error: msg }
        }
      },

      logout: () => {
        set({
          userId: null,
          pin: null,
          fileSha: null,
          status: 'idle',
          lastError: null,
          lastSyncedAt: null,
          syncing: false,
        })
      },

      saveNow: async () => {
        const { userId, pin, fileSha } = get()
        if (!userId || !pin) return { ok: false, error: 'ログインしていません' }
        if (!(await ensureApi())) return { ok: false, error: NO_API }

        set({ syncing: true, lastError: null })
        try {
          const pinHash = await hashPin(userId, pin)
          const result = await saveCloudUser(
            userId,
            pinHash,
            exportProgressSnapshot(useStore.getState()),
            fileSha || undefined,
          )
          set({
            fileSha: result.sha,
            syncing: false,
            lastSyncedAt: result.updatedAt,
            status: 'ready',
          })
          return { ok: true }
        } catch (e) {
          const msg = e instanceof Error ? e.message : '同期に失敗しました'
          set({ syncing: false, lastError: msg, status: 'error' })
          return { ok: false, error: msg }
        }
      },
    }),
    {
      name: SESSION_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        userId: s.userId,
        pin: s.pin,
        fileSha: s.fileSha,
        lastSyncedAt: s.lastSyncedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.userId || !state.pin) return
        state.status = 'ready'
      },
    },
  ),
)
