"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Target, Plus, Check, ChevronRight, Sparkles } from "lucide-react"
import { itemMap, bosses, iconSrc } from "@/lib/data"
import { GlyphTile } from "@/components/common/glyph-tile"
import { ProgressBar } from "@/components/common/progress-ring"
import { useStore, goalProgress, overallProgress } from "@/lib/store"
import { useUi } from "@/lib/ui-store"
import { useDataStatus } from "@/lib/data-status"
import { cn } from "@/lib/utils"

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return "よふかしお疲れさま"
  if (h < 11) return "おはよう、冒険者"
  if (h < 17) return "こんにちは、冒険者"
  return "こんばんは、冒険者"
}

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
  const dataVersion = useDataStatus((s) => s.version)

  const overall = overallProgress(store)
  const today = new Date().toISOString().slice(0, 10)
  const checkedToday = dailyDate === today ? dailyChecked : {}
  const dailyDone = dailyTasks.filter((t) => checkedToday[t.id]).length

  const timelineBosses = useMemo(
    () => bosses.filter((b) => b.order > 0 && b.order < 100).sort((a, b) => a.order - b.order),
    [dataVersion],
  )
  const nextBoss = timelineBosses.find((b) => !defeated[b.id])
  const defeatedCount = timelineBosses.filter((b) => defeated[b.id]).length

  return (
    <div className="flex flex-col gap-5">
      <header className="relative overflow-hidden pt-2">
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-muted-foreground"
        >
          {greeting()}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-display text-2xl text-balance text-glow-gold"
        >
          テラリア コンパニオン
        </motion.h1>
      </header>

      {/* overall progress card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="relative overflow-hidden rounded-2xl border border-grass/20 bg-gradient-to-br from-card via-card to-grass/10 p-4"
      >
        <div className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">全体の攻略度</div>
            <div className="font-display text-3xl text-grass">{overall}%</div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>討伐ボス {defeatedCount}/{timelineBosses.length}</div>
            {nextBoss && (
              <button onClick={() => useUi.getState().openEntity("boss", nextBoss.id)} className="mt-1 inline-flex items-center gap-1 text-grass transition hover:brightness-125">
                次: {nextBoss.name}
                <ChevronRight className="size-3" />
              </button>
            )}
          </div>
        </div>
        <div className="relative mt-3">
          <ProgressBar value={overall} />
        </div>
      </motion.div>

      {/* tracked goals */}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <Target className="size-4 text-grass" />
            追跡中の目標
          </h2>
          <span className="text-xs text-muted-foreground">{goals.length}/3</span>
        </div>

        {goals.length === 0 ? (
          <button
            onClick={() => setTab("acquire")}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 px-4 py-6 text-center"
          >
            <span className="grid size-11 place-items-center rounded-full bg-secondary text-grass">
              <Plus className="size-5" />
            </span>
            <span className="text-sm font-semibold">目標の装備を追加</span>
            <span className="text-xs text-muted-foreground">欲しい武器や防具を選ぶと、必要素材とボスが自動で並びます</span>
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {goals.map((g) => {
              const item = itemMap.get(g.itemId)
              if (!item) {
                return (
                  <div
                    key={g.itemId}
                    className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-3"
                  >
                    <div className="grid size-12 place-items-center rounded-xl bg-secondary text-xs text-muted-foreground">?</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-muted-foreground">{g.itemId}</div>
                      <div className="text-[11px] text-muted-foreground">データ未読込または不明な目標</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => useStore.getState().removeGoal(g.itemId)}
                      className="shrink-0 rounded-lg bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground"
                    >
                      削除
                    </button>
                  </div>
                )
              }
              const gp = goalProgress(store, g.itemId)
              return (
                <motion.button
                  key={g.itemId}
                  layout
                  onClick={() => openGoal(g.itemId)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-3 text-left"
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
                      {gp.nextTask ? `次: ${gp.nextTask.name}` : "すべて達成"} ・ 残ボス {gp.remainingBosses}
                    </div>
                  </div>
                </motion.button>
              )
            })}
            {goals.length < 3 && (
              <button
                onClick={() => setTab("acquire")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground"
              >
                <Plus className="size-4" />
                目標を追加
              </button>
            )}
          </div>
        )}
      </section>

      {/* daily checklist */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <Sparkles className="size-4 text-gold" />
            今日のクエスト
          </h2>
          <span className="text-xs text-muted-foreground">{dailyDone}/{dailyTasks.length}</span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card/60 p-2">
          {dailyTasks.length === 0 ? (
            <button
              onClick={() => setTab("settings")}
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
                  onClick={() => toggleDaily(t.id)}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 text-left"
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors",
                      done ? "border-gold bg-gold text-accent-foreground" : "border-border",
                    )}
                  >
                    {done && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className={cn("text-sm", done ? "text-muted-foreground line-through" : "text-foreground")}>{t.label}</span>
                </button>
              )
            })
          )}
        </div>
        <button
          onClick={() => setTab("settings")}
          className="mt-1.5 w-full text-center text-[11px] text-muted-foreground underline-offset-2 hover:underline"
        >
          クエストを編集
        </button>
      </section>
    </div>
  )
}
