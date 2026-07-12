'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Target, Plus, Check, ChevronRight, Sparkles, Cloud, Settings, ChevronLeft } from 'lucide-react'
import { itemMap, bosses, iconSrc } from '@/lib/data'
import { GlyphTile } from '@/components/common/glyph-tile'
import { ProgressBar } from '@/components/common/progress-ring'
import { useStore, goalProgress, overallProgress } from '@/lib/store'
import { useUi } from '@/lib/ui-store'
import { useAuth } from '@/lib/auth-store'
import { useDataStatus } from '@/lib/data-status'
import { WorldClockScreensaver } from '@/components/home/world-clock-panel'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

function greeting(name?: string | null) {
  const h = new Date().getHours()
  const who = name?.trim() || '冒険者'
  if (h < 3) return `真夜中までお疲れさま、${who}`
  if (h < 5) return `よふかしお疲れさま、${who}`
  if (h < 7) return `早朝の探索、いってらっしゃい ${who}`
  if (h < 11) return `おはよう、${who}`
  if (h < 14) return `こんにちは、${who}`
  if (h < 17) return `午後も掘っていこう、${who}`
  if (h < 20) return `こんばんは、${who}`
  if (h < 23) return `夜の冒険、いってらっしゃい ${who}`
  return `よふかし注意だよ、${who}`
}

function avatarLetter(id: string) {
  return id.slice(0, 1).toUpperCase()
}

/** 0 = screensaver, 1 = home */
const PAGE_LABELS = ['世界', 'ホーム'] as const

export function HomeScreen() {
  const store = useStore()
  const goals = useStore((s) => s.goals)
  const dailyChecked = useStore((s) => s.dailyChecked)
  const dailyDate = useStore((s) => s.dailyDate)
  const dailyTasks = useStore((s) => s.dailyTasks)
  const toggleDaily = useStore((s) => s.toggleDaily)
  const defeated = useStore((s) => s.defeatedBosses)
  const setTab = useUi((s) => s.setTab)
  const openGoal = useUi((s) => s.openGoal)
  const setScreensaver = useUi((s) => s.setScreensaver)
  const dataVersion = useDataStatus((s) => s.version)
  const userId = useAuth((s) => s.userId)
  const syncing = useAuth((s) => s.syncing)

  const pagerRef = useRef<HTMLDivElement>(null)
  const didCenter = useRef(false)
  const [page, setPage] = useState(1)
  const [pageWidth, setPageWidth] = useState(0)

  const overall = overallProgress(store)
  const today = new Date().toISOString().slice(0, 10)
  const checkedToday = dailyDate === today ? dailyChecked : {}
  const dailyDone = dailyTasks.filter((t) => checkedToday[t.id]).length
  const hello = greeting(userId)

  const timelineBosses = useMemo(
    () => bosses.filter((b) => b.order > 0 && b.order < 100).sort((a, b) => a.order - b.order),
    [dataVersion],
  )
  const nextBoss = timelineBosses.find((b) => !defeated[b.id])
  const defeatedCount = timelineBosses.filter((b) => defeated[b.id]).length

  useEffect(() => {
    const el = pagerRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      if (w > 0) setPageWidth(w)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = pagerRef.current
    if (!el || pageWidth <= 0) return
    if (!didCenter.current) {
      el.scrollLeft = pageWidth
      setPage(1)
      didCenter.current = true
      return
    }
    el.scrollLeft = page * pageWidth
  }, [pageWidth])

  useEffect(() => {
    const el = pagerRef.current
    if (!el) return
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const w = el.clientWidth || 1
        const next = Math.max(0, Math.min(1, Math.round(el.scrollLeft / w)))
        setPage((prev) => {
          if (prev !== next) haptic('selection')
          return next
        })
        ticking = false
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setScreensaver(page === 0)
    return () => setScreensaver(false)
  }, [page, setScreensaver])

  const scrollToPage = (i: number) => {
    const el = pagerRef.current
    if (!el) return
    haptic('light')
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  const header = (
    <header className="relative pt-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{hello}</p>
          <h1 className="font-display text-2xl text-balance text-glow-gold">
            {userId ? (
              <>
                <span className="text-grass">{userId}</span>
                <span className="text-lg text-muted-foreground"> の冒険</span>
              </>
            ) : (
              'テラリア コンパニオン'
            )}
          </h1>
        </div>

        {userId ? (
          <button
            type="button"
            onClick={() => {
              haptic('light')
              setTab('settings')
            }}
            className="relative shrink-0"
            aria-label="アカウント設定"
          >
            <span className="grid size-12 place-items-center rounded-2xl border border-grass/30 bg-gradient-to-br from-grass/30 to-grass/10 font-display text-xl text-grass shadow-[0_0_20px_-8px] shadow-grass/50">
              {avatarLetter(userId)}
            </span>
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full border border-background',
                syncing ? 'bg-gold' : 'bg-grass',
              )}
            >
              <Cloud className="size-2.5 text-primary-foreground" />
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              haptic('light')
              setTab('settings')
            }}
            className="grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground"
            aria-label="設定"
          >
            <Settings className="size-4" />
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {userId && (syncing ? 'クラウドへ同期中… · ' : 'クラウド同期オン · ')}
        左スワイプで世界時計
      </p>
    </header>
  )

  const progressCard = (
    <div className="relative overflow-hidden rounded-2xl border border-grass/20 bg-gradient-to-br from-card/90 via-card/85 to-grass/10 p-4 backdrop-blur-[2px]">
      <div className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">全体の攻略度</div>
          <div className="font-display text-3xl text-grass">{overall}%</div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>
            討伐ボス {defeatedCount}/{timelineBosses.length}
          </div>
          {nextBoss && (
            <button
              type="button"
              onClick={() => {
                haptic('light')
                useUi.getState().openEntity('boss', nextBoss.id)
              }}
              className="mt-1 inline-flex items-center gap-1 text-grass transition hover:brightness-125"
            >
              次: {nextBoss.name}
              <ChevronRight className="size-3" />
            </button>
          )}
        </div>
      </div>
      <div className="relative mt-3">
        <ProgressBar value={overall} />
      </div>
    </div>
  )

  const goalsSection = (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <Target className="size-4 text-grass" />
          追跡中の目標
        </h2>
        <span className="text-xs text-muted-foreground">{goals.length}/3</span>
      </div>

      {goals.length === 0 ? (
        <button
          type="button"
          onClick={() => {
            haptic('medium')
            setTab('acquire')
          }}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 px-4 py-6 text-center backdrop-blur-[1px]"
        >
          <span className="grid size-11 place-items-center rounded-full bg-secondary text-grass">
            <Plus className="size-5" />
          </span>
          <span className="text-sm font-semibold">目標の装備を追加</span>
          <span className="text-xs text-muted-foreground">欲しい武器や防具を選ぶと、必要素材とボスが自動で並びます</span>
        </button>
      ) : (
        goals.map((g) => {
          const item = itemMap.get(g.itemId)
          if (!item) {
            return (
              <div
                key={g.itemId}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-3"
              >
                <div className="grid size-12 place-items-center rounded-xl bg-secondary text-xs text-muted-foreground">
                  ?
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-muted-foreground">{g.itemId}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    haptic('warning')
                    useStore.getState().removeGoal(g.itemId)
                  }}
                  className="shrink-0 rounded-lg bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground"
                >
                  削除
                </button>
              </div>
            )
          }
          const gp = goalProgress(store, g.itemId)
          return (
            <button
              key={g.itemId}
              type="button"
              onClick={() => {
                haptic('medium')
                openGoal(g.itemId)
              }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card/75 p-3 text-left backdrop-blur-[1px] active:scale-[0.98] transition-transform"
            >
              <GlyphTile glyph={item.glyph} color={item.color} image={iconSrc(item.id)} size={48} glow />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold">{item.name}</span>
                  <span className="shrink-0 text-xs font-bold text-grass">{gp.percent}%</span>
                </div>
                <div className="my-1.5">
                  <ProgressBar value={gp.done} max={gp.total} height={6} />
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {gp.nextTask ? `次: ${gp.nextTask.name}` : 'すべて達成'} ・ 残ボス {gp.remainingBosses}
                </div>
              </div>
            </button>
          )
        })
      )}
      {goals.length > 0 && goals.length < 3 && (
        <button
          type="button"
          onClick={() => {
            haptic('light')
            setTab('acquire')
          }}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground"
        >
          <Plus className="size-4" />
          目標を追加
        </button>
      )}
    </section>
  )

  const dailySection = (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <Sparkles className="size-4 text-gold" />
          今日のクエスト
        </h2>
        <span className="text-xs text-muted-foreground">
          {dailyDone}/{dailyTasks.length}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card/60 p-2 backdrop-blur-[1px]">
        {dailyTasks.length === 0 ? (
          <button
            type="button"
            onClick={() => {
              haptic('light')
              setTab('settings')
            }}
            className="rounded-xl px-2 py-3 text-center text-xs text-muted-foreground"
          >
            クエストがありません。設定から追加できます。
          </button>
        ) : (
          dailyTasks.map((t) => {
            const done = !!checkedToday[t.id]
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  haptic(done ? 'light' : 'success')
                  toggleDaily(t.id)
                }}
                className="flex items-center gap-3 rounded-xl px-2 py-2 text-left active:scale-[0.99] transition-transform"
              >
                <span
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors',
                    done ? 'border-gold bg-gold text-accent-foreground' : 'border-border',
                  )}
                >
                  {done && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className={cn('text-sm', done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                  {t.label}
                </span>
              </button>
            )
          })
        )}
      </div>
    </section>
  )

  const homeBody = (
    <div className="flex flex-col gap-5">
      {header}
      {progressCard}
      {goalsSection}
      {dailySection}
    </div>
  )

  return (
    <div className="flex flex-col gap-2">
      {/* Landscape: normal dashboard only */}
      <div className="hidden landscape:block">{homeBody}</div>

      {/* Portrait: screensaver | home */}
      <div className="home-pager-host -mx-4 landscape:hidden">
        <div
          ref={pagerRef}
          className="home-pager flex touch-pan-x overflow-x-auto overscroll-x-contain no-scrollbar"
        >
          <section
            className="home-pager-page box-border shrink-0 snap-center snap-always"
            style={pageWidth > 0 ? { width: pageWidth, flex: `0 0 ${pageWidth}px` } : { width: '100%', flex: '0 0 100%' }}
          >
            <WorldClockScreensaver />
          </section>
          <section
            className="home-pager-page box-border shrink-0 snap-center snap-always px-4"
            style={pageWidth > 0 ? { width: pageWidth, flex: `0 0 ${pageWidth}px` } : { width: '100%', flex: '0 0 100%' }}
          >
            {homeBody}
          </section>
        </div>

        {page === 1 && (
          <div className="pointer-events-auto flex items-center justify-center gap-2 py-2">
            {PAGE_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                aria-current={page === i}
                onClick={() => scrollToPage(i)}
                className={cn(
                  'rounded-full transition-all',
                  page === i ? 'h-1.5 w-5 bg-grass' : 'size-1.5 bg-muted-foreground/40',
                )}
              />
            ))}
          </div>
        )}

        {page === 0 && (
          <button
            type="button"
            onClick={() => scrollToPage(1)}
            className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] text-muted-foreground/80"
          >
            <ChevronLeft className="size-3 rotate-180" />
            ホーム
          </button>
        )}
      </div>
    </div>
  )
}
