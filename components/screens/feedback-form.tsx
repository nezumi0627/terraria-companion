'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquarePlus, ExternalLink, Loader2, Bug, Lightbulb, MoreHorizontal } from 'lucide-react'
import {
  submitFeedback,
  type FeedbackCategory,
  FEEDBACK_REPO,
} from '@/lib/feedback'
import { cloudApiReady } from '@/lib/cloud-api'
import { cn } from '@/lib/utils'

const CATS: { id: FeedbackCategory; label: string; Icon: typeof Bug }[] = [
  { id: 'bug', label: 'バグ', Icon: Bug },
  { id: 'idea', label: 'アイデア', Icon: Lightbulb },
  { id: 'other', label: 'その他', Icon: MoreHorizontal },
]

export function FeedbackForm({ onFlash }: { onFlash: (msg: string) => void }) {
  const [category, setCategory] = useState<FeedbackCategory>('idea')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [website, setWebsite] = useState('')
  const [sending, setSending] = useState(false)
  const [lastUrl, setLastUrl] = useState<string | null>(null)
  const [apiOk, setApiOk] = useState(false)

  useEffect(() => {
    let cancelled = false
    void cloudApiReady().then((ok) => {
      if (!cancelled) setApiOk(ok)
    })
    return () => {
      cancelled = true
    }
  }, [])

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
      onFlash('フィードバックを受け取りました。ありがとうございます！')
      setTitle('')
      setBody('')
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-magic/5 p-4"
    >
      <div className="pointer-events-none absolute -right-10 bottom-0 size-32 rounded-full bg-magic/10 blur-3xl" />
      <div className="relative mb-3 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-magic/15 text-magic">
          <MessageSquarePlus className="size-4" />
        </span>
        <div>
          <div className="text-sm font-bold">フィードバック</div>
          <div className="text-[11px] text-muted-foreground">
            {apiOk ? 'ワンタップで Issue に届きます' : 'GitHub Issue 下書きを開きます'}
          </div>
        </div>
      </div>

      <p className="relative mb-3 text-[11px] leading-relaxed text-muted-foreground">
        バグや改善案は{' '}
        <a
          href={`https://github.com/${FEEDBACK_REPO}/issues`}
          target="_blank"
          rel="noreferrer"
          className="text-grass underline-offset-2 hover:underline"
        >
          {FEEDBACK_REPO}
        </a>{' '}
        の Issue として届きます。メール不要です。
      </p>

      <div className="relative mb-3 flex gap-1.5">
        {CATS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setCategory(id)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition',
              category === id
                ? 'bg-grass text-primary-foreground shadow-sm'
                : 'bg-secondary/80 text-secondary-foreground hover:bg-secondary',
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      <input
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden
      />

      <div className="relative space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル（例: 重力球のレア表示）"
          maxLength={120}
          className="w-full rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm outline-none ring-grass/40 transition focus:border-grass/50 focus:ring-2"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="詳しい内容・再現手順など"
          rows={4}
          maxLength={4000}
          className="w-full resize-none rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm outline-none ring-grass/40 transition focus:border-grass/50 focus:ring-2"
        />
        <button
          type="button"
          disabled={sending || title.trim().length === 0 || body.trim().length < 5}
          onClick={() => void submit()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-grass px-3 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_0_24px_-8px] shadow-grass/60 transition hover:brightness-110 disabled:opacity-50"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <MessageSquarePlus className="size-4" />}
          {sending ? '送信中…' : apiOk ? 'Issue として送る' : 'Issue 下書きを開く'}
        </button>
      </div>

      {lastUrl && (
        <a
          href={lastUrl}
          target="_blank"
          rel="noreferrer"
          className="relative mt-3 inline-flex items-center gap-1 text-[11px] text-grass underline-offset-2 hover:underline"
        >
          作成した Issue を開く
          <ExternalLink className="size-3" />
        </a>
      )}
    </motion.div>
  )
}
