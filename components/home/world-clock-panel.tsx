'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-store'
import { worldPhaseFromDate, worldPhaseLabel } from '@/lib/world-time'
import { cn } from '@/lib/utils'

function pad(n: number) {
  return String(n).padStart(2, '0')
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
  const phase = worldPhaseFromDate(now)
  const date = now.toLocaleDateString('ja-JP', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      className={cn(
        'relative flex min-h-[min(100dvh,100svh)] flex-col items-center justify-center px-2 text-center',
        'bg-transparent pt-[max(env(safe-area-inset-top),0.5rem)]',
        'pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))]',
        'landscape:min-h-[min(100dvh,100svh)] landscape:pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]',
        className,
      )}
    >
      <p className="text-sm tracking-[0.2em] text-white/75 drop-shadow-sm">{worldPhaseLabel(phase)}</p>

      <p className="mt-6 font-display text-[4.75rem] leading-none tracking-wide text-glow-gold tabular-nums drop-shadow-md sm:text-[5.5rem] landscape:text-[4rem]">
        {pad(h)}
        <span className="text-gold/70">:</span>
        {pad(now.getMinutes())}
      </p>

      <p className="mt-3 font-display text-2xl tabular-nums text-white/65 drop-shadow-sm landscape:text-xl">
        {pad(now.getSeconds())}
      </p>

      <p className="mt-8 text-sm text-white/70 drop-shadow-sm landscape:mt-4">{date}</p>

      {userId ? (
        <p className="mt-3 text-xs text-grass drop-shadow-sm">{userId}</p>
      ) : (
        <p className="mt-3 text-xs text-white/55 drop-shadow-sm">テラリア コンパニオン</p>
      )}

      <p className="mt-12 text-[11px] tracking-wide text-white/45 landscape:mt-6">
        右へスワイプでホーム · 下で BGM
      </p>
    </div>
  )
}
