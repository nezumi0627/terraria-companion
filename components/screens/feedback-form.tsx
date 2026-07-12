'use client'

import { useState } from 'react'
import { MessageSquarePlus, ExternalLink, Loader2 } from 'lucide-react'
import {
  submitFeedback,
  type FeedbackCategory,
  FEEDBACK_REPO,
} from '@/lib/feedback'
import { cn } from '@/lib/utils'

export function FeedbackForm({ onFlash }: { onFlash: (msg: string) => void }) {
  const [category, setCategory] = useState<FeedbackCategory>('idea')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [sending, setSending] = useState(false)
  const [lastUrl, setLastUrl] = useState<string | null>(null)

  const submit = async () => {
    setSending(true)
    setLastUrl(null)
    try {
      const result = await submitFeedback({ category, title, body, website })
      if (!result.ok) {
        onFlash(result.error || '送信に失敗しました')
        return
      }
      if (result.mode === 'redirect' && result.url) {
        setLastUrl(result.url)
        window.open(result.url, '_blank', 'noopener,noreferrer')
        onFlash('GitHub の Issue 作成画面を開きました。作成を押すと届きます')
        setTitle('')
        setBody('')
        return
      }
      setLastUrl(result.url || null)
      onFlash('フィードバックを GitHub Issue として送信しました')
      setTitle('')
      setBody('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <MessageSquarePlus className="size-4 text-grass" />
        フィードバック
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        バグや改善案を送ると、GitHub（
        <a
          href={`https://github.com/${FEEDBACK_REPO}/issues`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          {FEEDBACK_REPO}
        </a>
        ）の Issue として届きます。メールは不要です。
      </p>

      <div className="mb-2 flex gap-1.5">
        {(
          [
            ['bug', 'バグ'],
            ['idea', 'アイデア'],
            ['other', 'その他'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setCategory(k)}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
              category === k ? 'bg-grass text-primary-foreground' : 'bg-secondary text-secondary-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* honeypot */}
      <input
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden
      />

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タイトル（例: 重力球のレア表示）"
        maxLength={120}
        className="mb-2 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none ring-grass focus:ring-2"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="詳しい内容・再現手順など"
        rows={4}
        maxLength={4000}
        className="mb-2 w-full resize-none rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none ring-grass focus:ring-2"
      />
      <button
        type="button"
        disabled={sending}
        onClick={() => void submit()}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-grass px-3 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {sending ? <Loader2 className="size-4 animate-spin" /> : <MessageSquarePlus className="size-4" />}
        {sending ? '送信中…' : 'Issue として送る'}
      </button>

      {lastUrl && (
        <a
          href={lastUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-grass underline-offset-2 hover:underline"
        >
          作成した Issue を開く
          <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  )
}
