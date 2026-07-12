'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, CloudOff, Loader2, LogIn, LogOut, UserPlus, Sparkles, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { cloudApiConfigured, cloudApiReady } from '@/lib/cloud-api'
import { GITHUB_REPO } from '@/lib/github-users'
import { cn } from '@/lib/utils'

export function AuthPanel({ onFlash }: { onFlash: (msg: string) => void }) {
  const userId = useAuth((s) => s.userId)
  const status = useAuth((s) => s.status)
  const syncing = useAuth((s) => s.syncing)
  const lastSyncedAt = useAuth((s) => s.lastSyncedAt)
  const lastError = useAuth((s) => s.lastError)
  const login = useAuth((s) => s.login)
  const register = useAuth((s) => s.register)
  const logout = useAuth((s) => s.logout)
  const saveNow = useAuth((s) => s.saveNow)

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [id, setId] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [apiOk, setApiOk] = useState(cloudApiConfigured())
  const [apiChecking, setApiChecking] = useState(!cloudApiConfigured())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const ok = await cloudApiReady()
      if (!cancelled) {
        setApiOk(ok)
        setApiChecking(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const submit = async () => {
    setBusy(true)
    try {
      const result = mode === 'login' ? await login(id, pin) : await register(id, pin)
      if (!result.ok) {
        onFlash(result.error || '失敗しました')
        return
      }
      onFlash(mode === 'login' ? 'ログインしました — クラウド同期オン' : '冒険の記録をクラウドに保存しました')
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  if (userId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-grass/25 bg-gradient-to-br from-card via-card to-grass/10 p-4"
      >
        <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-grass/15 blur-2xl" />
        <div className="relative mb-3 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-grass/20 text-grass">
            <Cloud className="size-4" />
          </span>
          <div>
            <div className="text-sm font-bold">クラウドアカウント</div>
            <div className="text-[11px] text-muted-foreground">端末を変えても進行を引き継げます</div>
          </div>
        </div>
        <div className="relative mb-3 flex items-center justify-between gap-2 rounded-xl bg-background/50 px-3 py-2">
          <span className="font-display text-lg text-grass">{userId}</span>
          <span className="text-[11px] text-muted-foreground">
            {syncing
              ? '同期中…'
              : lastSyncedAt
                ? `最終同期 ${new Date(lastSyncedAt).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                : '未同期'}
          </span>
        </div>
        {lastError && <p className="mb-2 text-[11px] text-danger">{lastError}</p>}
        <div className="relative flex gap-2">
          <button
            type="button"
            disabled={syncing || status === 'loading'}
            onClick={async () => {
              const r = await saveNow()
              onFlash(r.ok ? 'クラウドへ保存しました' : r.error || '保存に失敗')
            }}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-grass py-2.5 text-xs font-bold text-primary-foreground shadow-[0_0_20px_-6px] shadow-grass/50 transition hover:brightness-110 disabled:opacity-60"
          >
            {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            {syncing ? '同期中…' : '今すぐ同期'}
          </button>
          <button
            type="button"
            onClick={() => {
              logout()
              onFlash('ログアウトしました（この端末のローカルデータは残ります）')
            }}
            className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-2.5 text-xs font-semibold text-secondary-foreground transition hover:bg-secondary/80"
          >
            <LogOut className="size-3.5" />
            ログアウト
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/40 p-4"
    >
      <div className="pointer-events-none absolute -left-8 top-0 size-28 rounded-full bg-gold/10 blur-2xl" />
      <div className="relative mb-3 flex items-center gap-2">
        <span
          className={cn(
            'grid size-8 place-items-center rounded-xl',
            apiOk ? 'bg-grass/20 text-grass' : 'bg-muted text-muted-foreground',
          )}
        >
          {apiChecking ? (
            <Loader2 className="size-4 animate-spin" />
          ) : apiOk ? (
            <Cloud className="size-4" />
          ) : (
            <CloudOff className="size-4" />
          )}
        </span>
        <div>
          <div className="flex items-center gap-1.5 text-sm font-bold">
            ログイン / 新規登録
            {apiOk && <Sparkles className="size-3.5 text-gold" />}
          </div>
          <div className="text-[11px] text-muted-foreground">ID + 数字4桁でクラウド保存</div>
        </div>
      </div>

      <p className="relative mb-3 text-[11px] leading-relaxed text-muted-foreground">
        進行データは公開リポジトリの{' '}
        <a
          href={`https://github.com/${GITHUB_REPO}/tree/main/users`}
          target="_blank"
          rel="noreferrer"
          className="text-grass underline-offset-2 hover:underline"
        >
          users/
        </a>{' '}
        に保存されます。トークンはブラウザに載せず、専用 API 経由で書き込みます。
      </p>

      {!apiChecking && !apiOk && (
        <p className="relative mb-3 rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-[11px] text-danger">
          クラウド API に未接続です。接続復旧までローカル保存のみ使えます。
        </p>
      )}

      <div className="relative mb-3 flex gap-1 rounded-xl bg-background/60 p-1">
        {(
          [
            ['login', 'ログイン', LogIn],
            ['register', '新規登録', UserPlus],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className={cn(
              'relative inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-[11px] font-semibold transition',
              mode === k ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {mode === k && (
              <motion.span
                layoutId="auth-mode"
                className="absolute inset-0 rounded-lg bg-grass shadow-sm"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1">
              <Icon className="size-3.5" />
              {label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === 'login' ? -8 : 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="relative space-y-2"
        >
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="ID（例: nezumi）"
            autoComplete="username"
            maxLength={24}
            className="w-full rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm outline-none ring-grass/40 transition focus:border-grass/50 focus:ring-2"
          />
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="数字4桁"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={4}
            className="w-full rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm tracking-[0.35em] outline-none ring-grass/40 transition focus:border-grass/50 focus:ring-2"
          />
          <button
            type="button"
            disabled={busy || !apiOk || status === 'loading' || pin.length !== 4 || id.trim().length < 3}
            onClick={() => void submit()}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-grass px-3 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_0_24px_-8px] shadow-grass/60 transition hover:brightness-110 disabled:opacity-50"
          >
            {busy || status === 'loading' ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === 'login' ? 'ログイン' : '登録して始める'}
          </button>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
