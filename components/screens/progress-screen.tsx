"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Check, Crown } from "lucide-react"
import { bosses, npcs, biomes, stations, events, iconSrc } from "@/lib/data"
import { GlyphTile } from "@/components/common/glyph-tile"
import { ProgressRing } from "@/components/common/progress-ring"
import { useStore } from "@/lib/store"
import { useUi } from "@/lib/ui-store"
import { useDataStatus } from "@/lib/data-status"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"

/** Canonical progression bosses only (exclude wiki-supplemental noise). */
function timelineBosses() {
  return bosses
    .filter((b) => b.order > 0 && b.order < 100)
    .slice()
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "ja"))
}

export function ProgressScreen() {
  const defeated = useStore((s) => s.defeatedBosses)
  const unlockedNpcs = useStore((s) => s.unlockedNpcs)
  const visitedBiomes = useStore((s) => s.visitedBiomes)
  const builtStations = useStore((s) => s.builtStations)
  const completedEvents = useStore((s) => s.completedEvents)
  const toggleBoss = useStore((s) => s.toggleBoss)
  const openEntity = useUi((s) => s.openEntity)
  const dataVersion = useDataStatus((s) => s.version)

  const timeline = useMemo(() => timelineBosses(), [dataVersion])
  const preHard = useMemo(() => timeline.filter((b) => !b.hardmode), [timeline])
  const hard = useMemo(() => timeline.filter((b) => b.hardmode), [timeline])
  const bossCount = timeline.filter((b) => defeated[b.id]).length

  const collections = [
    { label: "ボス", done: bossCount, total: timeline.length, color: "danger" },
    { label: "NPC", done: count(unlockedNpcs), total: npcs.length, color: "gold" },
    { label: "バイオーム", done: count(visitedBiomes), total: biomes.length, color: "grass" },
    { label: "設備", done: count(builtStations), total: stations.length, color: "wood" },
    { label: "イベント", done: count(completedEvents), total: events.length, color: "magic" },
  ]

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <h1 className="font-display text-2xl">攻略の進行</h1>
        <p className="mt-1 text-sm text-muted-foreground">ボス討伐の順序と、各コレクションの達成状況。</p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {collections.slice(0, 3).map((c) => (
          <RingCard key={c.label} {...c} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {collections.slice(3).map((c) => (
          <RingCard key={c.label} {...c} />
        ))}
      </div>

      <section className="flex flex-col gap-5">
        <div className="flex items-center gap-1.5">
          <Crown className="size-4 text-gold" />
          <h2 className="text-sm font-bold">ボス進行タイムライン</h2>
        </div>

        <BossSection
          title="ハードモード前"
          subtitle="ウォール・オブ・フレッシュまで"
          bosses={preHard}
          allTimeline={timeline}
          defeated={defeated}
          toggleBoss={toggleBoss}
          openEntity={openEntity}
        />

        <BossSection
          title="ハードモード"
          subtitle="メカニカルボス〜ムーンロード"
          bosses={hard}
          allTimeline={timeline}
          defeated={defeated}
          toggleBoss={toggleBoss}
          openEntity={openEntity}
          accent="hard"
        />
      </section>
    </div>
  )
}

function BossSection({
  title,
  subtitle,
  bosses: list,
  allTimeline,
  defeated,
  toggleBoss,
  openEntity,
  accent,
}: {
  title: string
  subtitle: string
  bosses: ReturnType<typeof timelineBosses>
  allTimeline: ReturnType<typeof timelineBosses>
  defeated: Record<string, boolean>
  toggleBoss: (id: string) => void
  openEntity: (kind: "boss", id: string) => void
  accent?: "hard"
}) {
  const doneCount = list.filter((b) => defeated[b.id]).length

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <h3
            className={cn(
              "text-sm font-bold",
              accent === "hard" ? "text-danger" : "text-grass",
            )}
          >
            {title}
          </h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {doneCount}/{list.length}
        </span>
      </div>

      <div className="relative pl-4">
        <div
          className={cn(
            "absolute bottom-2 left-[7px] top-2 w-0.5",
            accent === "hard" ? "bg-danger/35" : "bg-grass/35",
          )}
        />
        <div className="flex flex-col gap-2.5">
          {list.map((b) => {
            const done = !!defeated[b.id]
            const globalIndex = allTimeline.findIndex((x) => x.id === b.id)
            const isNext =
              !done && allTimeline.slice(0, globalIndex).every((x) => defeated[x.id])
            return (
              <div key={b.id} className="relative flex items-center gap-3">
                <span
                  className={cn(
                    "absolute -left-4 z-10 grid size-4 place-items-center rounded-full ring-2 ring-background",
                    done ? "bg-grass" : isNext ? "bg-gold" : "bg-muted",
                  )}
                >
                  {done && <Check className="size-2.5 text-primary-foreground" strokeWidth={4} />}
                </span>
                <motion.div
                  layout
                  className={cn(
                    "flex flex-1 items-center gap-3 rounded-xl border px-2.5 py-2",
                    done
                      ? "border-border bg-card/40 opacity-70"
                      : isNext
                        ? "border-gold/50 bg-gold/10"
                        : "border-border bg-card/60",
                  )}
                >
                  <button
                    onClick={() => openEntity("boss", b.id)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <GlyphTile glyph={b.glyph} color={b.color} image={iconSrc(b.id)} size={38} dim={done} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{b.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {isNext ? "次の目標" : done ? "討伐済み" : "未討伐"}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      haptic(done ? "light" : "success")
                      toggleBoss(b.id)
                    }}
                    aria-label={done ? "討伐を取り消す" : "討伐済みにする"}
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-md border-2 transition-transform active:scale-90",
                      done ? "border-grass bg-grass text-primary-foreground" : "border-border",
                    )}
                  >
                    {done && <Check className="size-4" strokeWidth={3} />}
                  </button>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RingCard({ label, done, total, color }: { label: string; done: number; total: number; color: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card/60 py-3">
      <ProgressRing value={pct} size={78} stroke={7} color={color} />
      <div className="text-xs font-semibold">{label}</div>
      <div className="text-[11px] text-muted-foreground">
        {done}/{total}
      </div>
    </div>
  )
}

function count(rec: Record<string, boolean>): number {
  return Object.values(rec).filter(Boolean).length
}
