'use client'

import { useEffect, useState } from 'react'
import { Cloud, Moon, Sun } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { cn } from '@/lib/utils'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function phase(h: number): { label: string; Icon: typeof Sun; tone: string } {
  if (h >= 5 && h < 11) return { label: '朝', Icon: Sun, tone: 'text-gold' }
  if (h >= 11 && h < 17) return { label: '昼', Icon: Sun, tone: 'text-gold' }
  if (h >= 17 && h < 20) return { label: '夕暮れ', Icon: Cloud, tone: 'text-copper' }
  return { label: '夜', Icon: Moon, tone: 'text-magic' }
}

export function WorldClockPanel({ className }: { className?: string }) {
  const userId = useAuth((s) => s.userId)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const h = now.getHours()
  const { label, Icon, tone } = phase(h)
  const date = now.toLocaleDateString('ja-JP', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      className={cn(
        'relative flex h-full min-h-[70dvh] flex-col justify-between px-1 py-2',
        className,
      )}
    >
      <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-[2px]">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className={cn('size-3.5', tone)} />
          <span>{label}の世界</span>
          {userId && <span className="ml-auto truncate text-grass">@{userId}</span>}
        </div>
        <div className="mt-3 font-display text-[3.25rem] leading-none tracking-wide text-glow-gold tabular-nums">
          {pad(h)}
          <span className="animate-pulse text-gold/80">:</span>
          {pad(now.getMinutes())}
        </div>
        <div className="mt-1 font-display text-lg text-muted-foreground/90 tabular-nums">
          {pad(now.getSeconds())}
          <span className="ml-2 text-sm font-sans tracking-normal">{date}</span>
        </div>
      </div>

      <p className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground backdrop-blur-[1px]">
        背景の空・星・草原はここに広がっています。左右にスワイプしてダッシュボードや目標へ戻れます。
      </p>
    </div>
  )
}
