'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  assertValidPin,
  assertValidUserId,
  fetchUserFile,
  githubDataToken,
  hashPin,
  putUserFile,
  type UserFile,
} from '@/lib/github-users'
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
        if (!githubDataToken()) {
          return {
            ok: false,
            error:
              'クラウド保存用の GitHub トークンがビルドに含まれていません。リポジトリ Secret「GITHUB_DATA_TOKEN」を設定して再デプロイしてください',
          }
        }

        set({ status: 'loading', lastError: null })
        try {
          const userId = id.trim().toLowerCase()
          const existing = await fetchUserFile(userId)
          if (existing) {
            set({ status: 'idle' })
            return { ok: false, error: 'そのIDはすでに使われています' }
          }

          const pinHash = await hashPin(userId, pin)
          const snapshot = exportProgressSnapshot(useStore.getState())
          const file: UserFile = {
            id: userId,
            pinHash,
            updatedAt: Date.now(),
            state: snapshot,
          }
          const { sha } = await putUserFile(file)
          set({
            userId,
            pin,
            fileSha: sha,
            status: 'ready',
            lastSyncedAt: Date.now(),
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
        if (!githubDataToken()) {
          return {
            ok: false,
            error:
              'クラウド保存用の GitHub トークンがビルドに含まれていません。リポジトリ Secret「GITHUB_DATA_TOKEN」を設定して再デプロイしてください',
          }
        }

        set({ status: 'loading', lastError: null })
        try {
          const userId = id.trim().toLowerCase()
          const got = await fetchUserFile(userId)
          if (!got) {
            set({ status: 'idle' })
            return { ok: false, error: 'IDが見つかりません。新規登録してください' }
          }
          const pinHash = await hashPin(userId, pin)
          if (pinHash !== got.file.pinHash) {
            set({ status: 'idle' })
            return { ok: false, error: 'パスワード（4桁）が違います' }
          }
          applyUserState(got.file.state || {})
          set({
            userId,
            pin,
            fileSha: got.sha,
            status: 'ready',
            lastSyncedAt: got.file.updatedAt,
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
        if (!githubDataToken()) return { ok: false, error: 'トークン未設定です' }

        set({ syncing: true, lastError: null })
        try {
          const pinHash = await hashPin(userId, pin)
          const file: UserFile = {
            id: userId,
            pinHash,
            updatedAt: Date.now(),
            state: exportProgressSnapshot(useStore.getState()),
          }
          const { sha } = await putUserFile(file, fileSha || undefined)
          set({
            fileSha: sha,
            syncing: false,
            lastSyncedAt: Date.now(),
            status: 'ready',
          })
          return { ok: true }
        } catch (e) {
          // Conflict: refetch sha and retry once
          const msg = e instanceof Error ? e.message : '同期に失敗しました'
          if (msg.includes('409') || msg.includes('422')) {
            try {
              const got = await fetchUserFile(userId)
              if (got) {
                const pinHash = await hashPin(userId, pin)
                const file: UserFile = {
                  id: userId,
                  pinHash,
                  updatedAt: Date.now(),
                  state: exportProgressSnapshot(useStore.getState()),
                }
                const { sha } = await putUserFile(file, got.sha)
                set({
                  fileSha: sha,
                  syncing: false,
                  lastSyncedAt: Date.now(),
                  status: 'ready',
                })
                return { ok: true }
              }
            } catch {
              /* fall through */
            }
          }
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
        // Soft restore: mark ready; full pull happens in CloudSyncHost
        state.status = 'ready'
      },
    },
  ),
)
