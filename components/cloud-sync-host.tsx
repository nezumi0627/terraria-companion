'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-store'
import { useStore } from '@/lib/store'
import { fetchUserFile, githubDataToken, hashPin } from '@/lib/github-users'

const SAVE_DEBOUNCE_MS = 2500

/**
 * When logged in: pull cloud save on mount, and debounce-push local changes to users/{id}.json
 */
export function CloudSyncHost() {
  const userId = useAuth((s) => s.userId)
  const pin = useAuth((s) => s.pin)
  const saveNow = useAuth((s) => s.saveNow)
  const setFileSha = useAuth((s) => s.setFileSha)
  const importState = useStore((s) => s.importState)
  const hydrated = useStore((s) => s.hydrated)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNext = useRef(false)

  // Re-validate + pull on boot when session exists
  useEffect(() => {
    if (!hydrated || !userId || !pin || !githubDataToken()) return
    let cancelled = false
    ;(async () => {
      try {
        const got = await fetchUserFile(userId)
        if (cancelled || !got) return
        const pinHash = await hashPin(userId, pin)
        if (pinHash !== got.file.pinHash) {
          useAuth.getState().logout()
          return
        }
        skipNext.current = true
        importState(got.file.state || {})
        setFileSha(got.sha)
        useAuth.setState({ lastSyncedAt: got.file.updatedAt, status: 'ready' })
      } catch {
        /* keep local session; next save may refresh */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hydrated, userId, pin, importState, setFileSha])

  // Debounced upload on store changes
  useEffect(() => {
    if (!userId || !pin) return
    const unsub = useStore.subscribe(() => {
      if (skipNext.current) {
        skipNext.current = false
        return
      }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        void saveNow()
      }, SAVE_DEBOUNCE_MS)
    })
    return () => {
      unsub()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [userId, pin, saveNow])

  return null
}
