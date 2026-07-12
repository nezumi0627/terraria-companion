'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-store'
import { cn } from '@/lib/utils'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function phaseLabel(h: number) {
  if (h >= 5 && h < 11) return '朝の世界'
  if (h >= 11 && h < 17) return '昼の世界'
  if (h >= 17 && h < 20) return '夕暮れの世界'
  return '夜の世界'
}

/** Full-bleed screensaver: text only over ambient sky / grass — no cards. */
export function WorldClockScreensaver({ className }: { className?: string }) {
  const userId = useAuth((s) => s.userId)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const h = now.getHours()
  const date = now.toLocaleDateString('ja-JP', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      className={cn(
        'relative flex min-h-[100dvh] flex-col items-center justify-center px-2 text-center',
        'pt-[max(env(safe-area-inset-top),0.5rem)] pb-16',
        className,
      )}
    >
      <p className="text-sm tracking-[0.2em] text-muted-foreground/90">{phaseLabel(h)}</p>

      <p className="mt-6 font-display text-[4.75rem] leading-none tracking-wide text-glow-gold tabular-nums sm:text-[5.5rem]">
        {pad(h)}
        <span className="text-gold/70">:</span>
        {pad(now.getMinutes())}
      </p>

      <p className="mt-3 font-display text-2xl tabular-nums text-foreground/70">
        {pad(now.getSeconds())}
      </p>

      <p className="mt-8 text-sm text-muted-foreground/85">{date}</p>

      {userId ? (
        <p className="mt-3 text-xs text-grass/90">{userId}</p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground/70">テラリア コンパニオン</p>
      )}

      <p className="mt-16 text-[11px] tracking-wide text-muted-foreground/55">
        右へスワイプでホームへ
      </p>
    </div>
  )
}
