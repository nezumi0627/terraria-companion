"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Star, Target, Check, ListTree, ClipboardList, Hammer, ArrowRight } from "lucide-react"
import {
  itemMap,
  stationMap,
  buildTree,
  buildChecklist,
  iconSrc,
  categoryLabel,
  progressionLabel,
  rarityColor,
  rarityLabel,
  formatCoins,
  resolveDropSource,
} from "@/lib/data"
import { GlyphTile } from "@/components/common/glyph-tile"
import { ProgressBar } from "@/components/common/progress-ring"
import { DependencyTree } from "./dependency-tree"
import { GoalChecklist } from "./goal-checklist"
import { useStore, goalProgress } from "@/lib/store"
import { useUi } from "@/lib/ui-store"
import { useDataStatus } from "@/lib/data-status"
import { cn } from "@/lib/utils"
import { sanitizeDescription, sanitizeName } from "@/lib/sanitize-text"

export function ItemDetail({ id }: { id: string }) {
  const dataVersion = useDataStatus((s) => s.version)
  const item = itemMap.get(id)
  const [view, setView] = useState<"info" | "tree" | "check">("info")

  const addRecentView = useStore((s) => s.addRecentView)
  const goals = useStore((s) => s.goals)
  const addGoal = useStore((s) => s.addGoal)
  const removeGoal = useStore((s) => s.removeGoal)
  const isFav = useStore((s) => (item ? !!s.favorites[`item:${item.id}`] : false))
  const toggleFav = useStore((s) => s.toggleFavorite)
  const store = useStore()
  const openItem = useUi((s) => s.openItem)
  const openEntity = useUi((s) => s.openEntity)

  useEffect(() => {
    if (item) addRecentView("item", item.id)
  }, [item, addRecentView])

  const tree = useMemo(() => (item ? buildTree(item.id) : null), [item, dataVersion])
  const checklist = useMemo(() => (item ? buildChecklist(item.id) : []), [item, dataVersion])
  const gp = useMemo(() => (item ? goalProgress(store, item.id) : null), [store, item, dataVersion])

  if (!item) return <p className="py-10 text-center text-muted-foreground">アイテムが見つかりません。</p>

  const isGoal = goals.some((g) => g.itemId === item.id)
  const goalFull = goals.length >= 3 && !isGoal

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* header */}
      <div className="flex items-start gap-3">
        <GlyphTile glyph={item.glyph} color={item.color} image={iconSrc(item.id)} size={64} glow />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg leading-tight text-balance" style={{ color: rarityColor[item.rarity] }}>
              {sanitizeName(item.name, item.readings?.[0] || item.id)}
            </h2>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Tag>{categoryLabel[item.category]}</Tag>
            <Tag>{progressionLabel[item.progression]}</Tag>
            <Tag style={{ color: rarityColor[item.rarity] }}>{rarityLabel[item.rarity]}</Tag>
          </div>
        </div>
        <button
          onClick={() => toggleFav("item", item.id)}
          aria-label="お気に入り"
          className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-secondary", isFav ? "text-gold" : "text-muted-foreground")}
        >
          <Star className={cn("size-5", isFav && "fill-current")} />
        </button>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {sanitizeDescription(item.description, item.name)}
      </p>

      {gp && gp.total > 0 && (
        <div className="rounded-xl border border-border bg-background/40 px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">入手までの進捗</span>
            <span className="font-bold text-grass">{gp.percent}%</span>
          </div>
          <ProgressBar value={gp.done} max={gp.total} />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {gp.done}/{gp.total} 完了
            {gp.nextTask ? ` ・ 次: ${gp.nextTask.name}` : " ・ すべて達成"}
          </p>
        </div>
      )}

      {/* set goal button */}
      <button
        onClick={() => (isGoal ? removeGoal(item.id) : addGoal(item.id))}
        disabled={goalFull}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all",
          isGoal
            ? "bg-secondary text-secondary-foreground"
            : "bg-gradient-to-br from-grass to-forest text-primary-foreground shadow-[0_8px_20px_-8px_rgba(73,168,74,0.8)]",
          goalFull && "cursor-not-allowed opacity-50",
        )}
      >
        {isGoal ? <Check className="size-4" /> : <Target className="size-4" />}
        {isGoal ? "目標に設定中" : goalFull ? "目標は最大3つまで" : "この装備を目標に設定"}
      </button>

      {/* view switcher */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {(
          [
            { k: "info", label: "情報", icon: ClipboardList },
            { k: "tree", label: "取得ツリー", icon: ListTree },
            { k: "check", label: "チェック", icon: Check },
          ] as const
        ).map((t) => {
          const active = view === t.k
          const Icon = t.icon
          return (
            <button
              key={t.k}
              onClick={() => setView(t.k)}
              className={cn(
                "relative flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-colors",
                active ? "text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {active && (
                <motion.span layoutId="item-view-pill" className="absolute inset-0 rounded-lg bg-grass" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
              )}
              <span className="relative flex items-center gap-1">
                <Icon className="size-3.5" />
                {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {view === "info" && (
        <div className="flex flex-col gap-3">
          {item.recipe && (
            <Section title="レシピ">
              {(() => {
                const st = item.recipe?.stationId ? stationMap.get(item.recipe.stationId) : null
                if (!st) {
                  return (
                    <div className="mb-2 flex items-center gap-2 rounded-xl border border-dashed border-border bg-background/40 px-3 py-2.5">
                      <Hammer className="size-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">素手で合成（作業設備なし）</span>
                    </div>
                  )
                }
                return (
                  <button
                    type="button"
                    onClick={() => openEntity("station", st.id)}
                    className="mb-2 flex w-full items-center gap-3 rounded-xl border border-grass/25 bg-grass/10 px-3 py-2.5 text-left transition hover:bg-grass/15"
                  >
                    <GlyphTile glyph={st.glyph} color={st.color} image={iconSrc(st.id)} size={40} glow />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold tracking-wide text-grass">作業設備</div>
                      <div className="truncate text-sm font-bold text-foreground">{st.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">ここで合成します · タップで詳細</div>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-grass/80" />
                  </button>
                )
              })()}
              <div className="flex flex-col gap-1.5">
                {item.recipe.ingredients.map((ing) => {
                  const child = itemMap.get(ing.itemId)
                  if (!child) return null
                  return (
                    <button
                      key={ing.itemId}
                      type="button"
                      onClick={() => openItem(ing.itemId)}
                      className="flex items-center gap-2.5 rounded-lg bg-card/60 px-2 py-1.5 text-left"
                    >
                      <GlyphTile glyph={child.glyph} color={child.color} image={iconSrc(child.id)} size={30} />
                      <span className="flex-1 truncate text-sm">{child.name}</span>
                      <span className="rounded bg-grass/15 px-1.5 text-xs font-bold text-grass">×{ing.count}</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-1.5 flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
                <ArrowRight className="size-3.5 shrink-0" />
                <span>
                  材料を揃えて合成 → <span className="font-semibold text-foreground">{item.name}</span>
                </span>
              </div>
            </Section>
          )}

          {item.droppedBy && item.droppedBy.length > 0 && (
            <Section title="ドロップ元">
              <div className="flex flex-col gap-1.5">
                {item.droppedBy.map((d) => {
                  const src = resolveDropSource(d.sourceId)
                  const clickable = !!src.kind
                  return (
                    <button
                      key={d.sourceId}
                      type="button"
                      disabled={!clickable}
                      onClick={() => src.kind && openEntity(src.kind, src.id)}
                      className="flex items-center gap-2.5 rounded-lg bg-card/60 px-2 py-1.5 text-left disabled:cursor-default"
                    >
                      <GlyphTile glyph={src.glyph} color={src.color} image={iconSrc(src.id)} size={30} />
                      <span className="flex-1 truncate text-sm">{src.name}</span>
                      <span className="text-xs text-muted-foreground">{d.chance}</span>
                    </button>
                  )
                })}
              </div>
            </Section>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Stat label="売却額" value={formatCoins(item.sell)} />
            <Stat label="必要素材数" value={`${checklist.filter((c) => c.kind === "material").length} 種`} />
          </div>

          {item.related && item.related.length > 0 && (
            <Section title="関連アイテム">
              <div className="flex flex-wrap gap-2">
                {item.related.map((rid) => {
                  const r = itemMap.get(rid)
                  if (!r) return null
                  return (
                    <button key={rid} onClick={() => openItem(rid)} className="flex items-center gap-1.5 rounded-full bg-secondary px-2 py-1">
                      <GlyphTile glyph={r.glyph} color={r.color} image={iconSrc(r.id)} size={22} />
                      <span className="text-xs">{r.name}</span>
                    </button>
                  )
                })}
              </div>
            </Section>
          )}
        </div>
      )}

      {view === "tree" && tree && <DependencyTree tree={tree} />}

      {view === "check" && (
        checklist.length > 0 ? <GoalChecklist checklist={checklist} /> : <p className="py-6 text-center text-sm text-muted-foreground">このアイテムに前提条件はありません。</p>
      )}
    </div>
  )
}

function Tag({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground" style={style}>
      {children}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-foreground">{value}</div>
    </div>
  )
}
