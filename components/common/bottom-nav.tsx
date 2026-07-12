'use client'

import { Home, Book, Target, Map, Settings } from 'lucide-react'
import { motion } from 'framer-motion'
import { useUi, type Tab } from '@/lib/ui-store'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

const TABS: { key: Tab; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'ホーム', icon: Home },
  { key: 'wiki', label: 'Wiki', icon: Book },
  { key: 'acquire', label: '取得', icon: Target },
  { key: 'progress', label: '進行', icon: Map },
  { key: 'settings', label: '設定', icon: Settings },
]

export function BottomNav() {
  const tab = useUi((s) => s.tab)
  const setTab = useUi((s) => s.setTab)
  const closeAll = useUi((s) => s.closeAll)

  const go = (t: Tab) => {
    haptic(t === tab ? 'selection' : 'medium')
    closeAll()
    setTab(t)
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 landscape:max-w-5xl">
      <div className="glass relative flex items-end justify-between rounded-2xl px-2 py-2 ring-1 ring-border shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)]">
        {TABS.map((t) => {
          const active = tab === t.key
          const Icon = t.icon
          if (t.key === 'acquire') {
            return (
              <button
                key={t.key}
                onClick={() => go(t.key)}
                aria-label="アイテム取得"
                className="relative -mt-8 flex w-[20%] flex-col items-center"
              >
                <motion.span
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    'grid size-16 place-items-center rounded-full ring-4 ring-background',
                    'bg-gradient-to-br from-grass to-forest text-primary-foreground',
                  )}
                  style={{
                    boxShadow: active
                      ? '0 0 24px 2px color-mix(in oklab, var(--grass) 60%, transparent)'
                      : '0 8px 18px -6px rgba(0,0,0,0.7)',
                    animation: active ? 'pulse-glow 2.4s ease-in-out infinite' : undefined,
                  }}
                >
                  <Icon className="size-7" strokeWidth={2.4} />
                </motion.span>
                <span className={cn('mt-1 text-[10px] font-bold', active ? 'text-grass' : 'text-muted-foreground')}>
                  {t.label}
                </span>
              </button>
            )
          }
          return (
            <button
              key={t.key}
              onClick={() => go(t.key)}
              className="relative flex w-[20%] flex-col items-center gap-1 py-1.5 transition-transform active:scale-95"
              aria-label={t.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn('size-5 transition-colors', active ? 'text-grass' : 'text-muted-foreground')}
                strokeWidth={active ? 2.6 : 2}
              />
              <span
                className={cn(
                  'text-[10px] transition-colors',
                  active ? 'font-bold text-grass' : 'text-muted-foreground',
                )}
              >
                {t.label}
              </span>
              {active && (
                <motion.span
                  layoutId="nav-dot"
                  className="absolute -bottom-0.5 size-1 rounded-full bg-grass"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
