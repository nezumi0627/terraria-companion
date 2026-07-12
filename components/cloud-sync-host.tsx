'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-store'
import { useStore } from '@/lib/store'
import { cloudApiReady } from '@/lib/cloud-api'
import { hashPin, loginCloudUser } from '@/lib/github-users'

const SAVE_DEBOUNCE_MS = 2500

/**
 * When logged in: pull cloud save on mount, and debounce-push local changes via cloud API.
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

  useEffect(() => {
    if (!hydrated || !userId || !pin) return
    let cancelled = false
    ;(async () => {
      if (!(await cloudApiReady())) return
      try {
        const pinHash = await hashPin(userId, pin)
        const got = await loginCloudUser(userId, pinHash)
        if (cancelled) return
        skipNext.current = true
        importState(got.state || {})
        setFileSha(got.sha)
        useAuth.setState({ lastSyncedAt: got.updatedAt, status: 'ready' })
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        if (msg.includes('パスワード') || msg.includes('見つかりません')) {
          useAuth.getState().logout()
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hydrated, userId, pin, importState, setFileSha])

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
