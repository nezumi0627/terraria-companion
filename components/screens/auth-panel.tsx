'use client'

import { useState } from 'react'
import { Cloud, CloudOff, Loader2, LogIn, LogOut, UserPlus } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { githubDataToken, GITHUB_REPO } from '@/lib/github-users'
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
  const tokenOk = !!githubDataToken()

  const submit = async () => {
    setBusy(true)
    try {
      const result = mode === 'login' ? await login(id, pin) : await register(id, pin)
      if (!result.ok) {
        onFlash(result.error || '失敗しました')
        return
      }
      onFlash(mode === 'login' ? 'ログインしました（クラウド同期オン）' : '登録してログインしました')
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  if (userId) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Cloud className="size-4 text-grass" />
          クラウドアカウント
        </div>
        <p className="mb-2 text-[11px] text-muted-foreground">
          進行データはリポジトリ内の{' '}
          <code className="rounded bg-muted px-1">users/{userId}.json</code> に保存されます。
        </p>
        <div className="mb-3 flex items-center justify-between gap-2 text-sm">
          <span className="font-bold text-grass">{userId}</span>
          <span className="text-[11px] text-muted-foreground">
            {syncing
              ? '同期中…'
              : lastSyncedAt
                ? `最終同期 ${new Date(lastSyncedAt).toLocaleString('ja-JP')}`
                : '未同期'}
          </span>
        </div>
        {lastError && <p className="mb-2 text-[11px] text-danger">{lastError}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={syncing || status === 'loading'}
            onClick={async () => {
              const r = await saveNow()
              onFlash(r.ok ? 'クラウドへ保存しました' : r.error || '保存に失敗')
            }}
            className="flex-1 rounded-lg bg-grass py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {syncing ? '同期中…' : '今すぐ同期'}
          </button>
          <button
            type="button"
            onClick={() => {
              logout()
              onFlash('ログアウトしました（この端末のローカルデータは残ります）')
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground"
          >
            <LogOut className="size-3.5" />
            ログアウト
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {tokenOk ? <Cloud className="size-4 text-grass" /> : <CloudOff className="size-4 text-muted-foreground" />}
        ログイン / 新規登録
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        ID（英数字）と好きな数字4桁でクラウド保存できます。データは公開リポジトリの{' '}
        <a
          href={`https://github.com/${GITHUB_REPO}/tree/main/users`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          users/
        </a>{' '}
        に JSON で置かれます。
      </p>

      {!tokenOk && (
        <p className="mb-3 rounded-lg bg-danger/10 px-2 py-1.5 text-[11px] text-danger">
          このビルドにはクラウド用 GitHub トークンがありません。ローカル保存のみ使えます。
        </p>
      )}

      <div className="mb-2 flex gap-1.5">
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
              'inline-flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold',
              mode === k ? 'bg-grass text-primary-foreground' : 'bg-secondary text-secondary-foreground',
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      <input
        value={id}
        onChange={(e) => setId(e.target.value)}
        placeholder="ID（例: nezumi）"
        autoComplete="username"
        maxLength={24}
        className="mb-2 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none ring-grass focus:ring-2"
      />
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="数字4桁"
        inputMode="numeric"
        autoComplete="current-password"
        maxLength={4}
        className="mb-2 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm tracking-[0.3em] outline-none ring-grass focus:ring-2"
      />
      <button
        type="button"
        disabled={busy || !tokenOk || status === 'loading'}
        onClick={() => void submit()}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-grass px-3 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy || status === 'loading' ? <Loader2 className="size-4 animate-spin" /> : null}
        {mode === 'login' ? 'ログイン' : '登録して始める'}
      </button>
    </div>
  )
}
