"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Search, X, Sparkles, ArrowRight } from "lucide-react"
import {
  search,
  items,
  itemMap,
  bossMap,
  npcMap,
  biomeMap,
  stationMap,
  eventMap,
  enemyMap,
  iconSrc,
  type SearchResult,
} from "@/lib/data"
import { GlyphTile } from "@/components/common/glyph-tile"
import { useStore } from "@/lib/store"
import { useUi } from "@/lib/ui-store"
import { useDataStatus } from "@/lib/data-status"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  item: "アイテム",
  boss: "ボス",
  npc: "NPC",
  enemy: "敵",
  biome: "バイオーム",
  station: "設備",
  event: "イベント",
}

// A few marquee end-game goals to feature.
const FEATURED = ["zenith", "terra-blade", "meowmere", "star-wrath", "influx-waver", "seedler"]

export function AcquireScreen() {
  const [q, setQ] = useState("")
  const dataVersion = useDataStatus((s) => s.version)
  const results = useMemo(() => search(q, 20), [q, dataVersion])
  const recentSearches = useStore((s) => s.recentSearches)
  const addRecentSearch = useStore((s) => s.addRecentSearch)
  const recentViews = useStore((s) => s.recentViews)
  const openItem = useUi((s) => s.openItem)
  const openEntity = useUi((s) => s.openEntity)

  const open = (r: SearchResult) => {
    addRecentSearch(r.name)
    if (r.kind === "item") openItem(r.id)
    else openEntity(r.kind, r.id)
  }

  const featured = useMemo(
    () => FEATURED.map((id) => items.find((i) => i.id === id)).filter(Boolean),
    [dataVersion],
  )

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <h1 className="font-display text-2xl text-balance">なにを作りたい？</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          欲しい装備を選ぶと、必要な素材・ボス・設備・バイオームを自動でリスト化します。
        </p>
      </header>

      {/* search box */}
      <div className="sticky top-2 z-10">
        <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2.5 ring-1 ring-border">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="アイテム・ボス・NPCを検索"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            autoComplete="off"
            aria-label="検索"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="クリア" className="text-muted-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {q ? (
        <div className="flex flex-col gap-1.5">
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">「{q}」に一致する結果がありません。</p>
          ) : (
            results.map((r, i) => (
              <motion.button
                key={`${r.kind}-${r.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                onClick={() => open(r)}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-left"
              >
                <GlyphTile glyph={r.glyph} color={r.color} image={r.image} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.name}</span>
                  <span className="text-[11px] text-muted-foreground">{KIND_LABEL[r.kind]} ・ {r.sub}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </motion.button>
            ))
          )}
        </div>
      ) : (
        <>
          {/* featured goals */}
          <section>
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="size-4 text-gold" />
              <h2 className="text-sm font-bold">人気の最終目標</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {featured.map((it) => (
                <button
                  key={it!.id}
                  onClick={() => openItem(it!.id)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card/60 p-2 text-left"
                >
                  <GlyphTile glyph={it!.glyph} color={it!.color} image={iconSrc(it!.id)} size={40} glow />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold">{it!.name}</span>
                    <span className="text-[10px] text-muted-foreground">目標に設定</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {recentSearches.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold">最近の検索</h2>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQ(s)}
                    className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>
          )}

          {recentViews.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold">最近見た項目</h2>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {recentViews.slice(0, 12).map((rv) => (
                  <RecentChip key={`${rv.kind}-${rv.id}`} kind={rv.kind} id={rv.id} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function resolveMeta(kind: SearchResult["kind"], id: string): { name: string; glyph: string; color: string } | null {
  const m =
    kind === "item" ? itemMap.get(id)
    : kind === "boss" ? bossMap.get(id)
    : kind === "npc" ? npcMap.get(id)
    : kind === "biome" ? biomeMap.get(id)
    : kind === "station" ? stationMap.get(id)
    : kind === "enemy" ? enemyMap.get(id)
    : eventMap.get(id)
  if (!m) return null
  return { name: m.name, glyph: m.glyph, color: m.color }
}

function RecentChip({ kind, id }: { kind: SearchResult["kind"]; id: string }) {
  const openItem = useUi((s) => s.openItem)
  const openEntity = useUi((s) => s.openEntity)
  const meta = resolveMeta(kind, id)
  if (!meta) return null
  return (
    <button
      onClick={() => (kind === "item" ? openItem(id) : openEntity(kind, id))}
      className={cn("flex w-20 shrink-0 flex-col items-center gap-1 rounded-xl border border-border bg-card/60 p-2")}
    >
      <GlyphTile glyph={meta.glyph} color={meta.color} image={iconSrc(id)} size={36} />
      <span className="line-clamp-2 text-center text-[10px] leading-tight text-muted-foreground">{meta.name}</span>
    </button>
  )
}
