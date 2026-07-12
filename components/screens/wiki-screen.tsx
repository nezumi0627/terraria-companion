"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  items,
  bosses,
  npcs,
  biomes,
  stations,
  events,
  enemies,
  categoryLabel,
  progressionLabel,
  iconSrc,
  normalizeSearch,
} from "@/lib/data"
import { GlyphTile } from "@/components/common/glyph-tile"
import { useUi } from "@/lib/ui-store"
import { useDataStatus } from "@/lib/data-status"
import { cn } from "@/lib/utils"
import { sanitizeName } from "@/lib/sanitize-text"

const PAGE_SIZE = 60

type WikiTab = "items" | "enemies" | "bosses" | "npcs" | "biomes" | "stations" | "events"

const TABS: { key: WikiTab; label: string }[] = [
  { key: "items", label: "アイテム" },
  { key: "enemies", label: "敵" },
  { key: "bosses", label: "ボス" },
  { key: "npcs", label: "NPC" },
  { key: "biomes", label: "バイオーム" },
  { key: "stations", label: "設備" },
  { key: "events", label: "イベント" },
]

const ITEM_CATS = Object.keys(categoryLabel) as (keyof typeof categoryLabel)[]
const PROG_FILTERS = Object.keys(progressionLabel) as (keyof typeof progressionLabel)[]

function matchesQuery(
  q: string,
  name: string,
  readings?: string[],
  extra?: string,
) {
  if (!q) return true
  const hay = normalizeSearch(`${name} ${(readings || []).join(" ")} ${extra || ""}`)
  return hay.includes(q)
}

export function WikiScreen() {
  const [tab, setTab] = useState<WikiTab>("items")
  const [cat, setCat] = useState<string>("all")
  const [enemyProg, setEnemyProg] = useState<string>("all")
  const [query, setQuery] = useState("")
  const [visible, setVisible] = useState(PAGE_SIZE)
  const openItem = useUi((s) => s.openItem)
  const openEntity = useUi((s) => s.openEntity)
  const dataVersion = useDataStatus((s) => s.version)
  const dataLoading = useDataStatus((s) => s.loading)
  const dataError = useDataStatus((s) => s.error)
  const ensureData = useDataStatus((s) => s.ensure)
  const q = normalizeSearch(query)

  const filteredItems = useMemo(
    () =>
      items.filter((i) => {
        if (cat !== "all" && i.category !== cat) return false
        return matchesQuery(q, i.name, i.readings, i.description)
      }),
    [cat, q, dataVersion],
  )

  const filteredEnemies = useMemo(
    () =>
      enemies.filter((e) => {
        if (enemyProg !== "all" && e.progression !== enemyProg) return false
        return matchesQuery(q, e.name, e.readings, `${e.biome} ${e.description}`)
      }),
    [enemyProg, q, dataVersion],
  )

  const filteredBosses = useMemo(
    () => bosses.filter((b) => matchesQuery(q, b.name, b.readings, b.description)),
    [q, dataVersion],
  )

  return (
    <div className="flex flex-col gap-4">
      <header className="pt-2">
        <h1 className="font-display text-2xl">図鑑 / Wiki</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ローカルに保存したデータから検索・閲覧できます（{items.length}アイテム / {enemies.length}敵）
          {dataLoading ? " · 追記データ読込中…" : ""}。
        </p>
        {dataError && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs">
            <span className="min-w-0 text-danger">追記データの読込に失敗しました。キュレート分のみ表示中です。</span>
            <button
              type="button"
              onClick={() => void ensureData()}
              disabled={dataLoading}
              className="shrink-0 rounded-lg bg-secondary px-2 py-1 font-semibold text-secondary-foreground"
            >
              再試行
            </button>
          </div>
        )}
      </header>

      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setVisible(PAGE_SIZE)
        }}
        placeholder="名前・読み・英語名で検索…"
        className="w-full rounded-xl border border-border bg-card/70 px-3 py-2.5 text-sm outline-none ring-grass focus:ring-2"
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key)
                setVisible(PAGE_SIZE)
              }}
              className={cn(
                "relative shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                active ? "text-primary-foreground" : "bg-secondary text-secondary-foreground",
              )}
            >
              {active && (
                <motion.span layoutId="wiki-tab" className="absolute inset-0 rounded-full bg-grass" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
              )}
              <span className="relative">{t.label}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "items" && (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <CatChip active={cat === "all"} onClick={() => setCat("all")}>すべて</CatChip>
                {ITEM_CATS.map((c) => (
                  <CatChip key={c} active={cat === c} onClick={() => setCat(c)}>
                    {categoryLabel[c]}
                  </CatChip>
                ))}
              </div>
              <p className="mb-2 text-[11px] text-muted-foreground">{filteredItems.length} 件</p>
              <Grid>
                {filteredItems.slice(0, visible).map((i) => (
                  <Tile key={i.id} glyph={i.glyph} color={i.color} image={iconSrc(i.id)} name={i.name} sub={categoryLabel[i.category]} onClick={() => openItem(i.id)} />
                ))}
              </Grid>
              <MoreButton shown={visible} total={filteredItems.length} onMore={() => setVisible((n) => n + PAGE_SIZE)} />
            </>
          )}

          {tab === "enemies" && (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <CatChip active={enemyProg === "all"} onClick={() => { setEnemyProg("all"); setVisible(PAGE_SIZE) }}>すべて</CatChip>
                {PROG_FILTERS.map((p) => (
                  <CatChip key={p} active={enemyProg === p} onClick={() => { setEnemyProg(p); setVisible(PAGE_SIZE) }}>
                    {progressionLabel[p]}
                  </CatChip>
                ))}
              </div>
              <p className="mb-2 text-[11px] text-muted-foreground">{filteredEnemies.length} 件</p>
              <Grid>
                {filteredEnemies.slice(0, visible).map((e) => (
                  <Tile key={e.id} glyph={e.glyph} color={e.color} image={iconSrc(e.id)} name={e.name} sub={e.biome} onClick={() => openEntity("enemy", e.id)} />
                ))}
              </Grid>
              <MoreButton shown={visible} total={filteredEnemies.length} onMore={() => setVisible((n) => n + PAGE_SIZE)} />
            </>
          )}

          {tab === "bosses" && (
            <>
              <p className="mb-2 text-[11px] text-muted-foreground">{filteredBosses.length} 件</p>
              <Grid>
                {filteredBosses.slice(0, visible).map((b) => (
                  <Tile key={b.id} glyph={b.glyph} color={b.color} image={iconSrc(b.id)} name={b.name} sub={progressionLabel[b.progression]} onClick={() => openEntity("boss", b.id)} />
                ))}
              </Grid>
              <MoreButton shown={visible} total={filteredBosses.length} onMore={() => setVisible((n) => n + PAGE_SIZE)} />
            </>
          )}

          {tab === "npcs" && (
            <Grid>
              {npcs.filter((n) => matchesQuery(q, n.name, n.readings)).map((n) => (
                <Tile key={n.id} glyph={n.glyph} color={n.color} image={iconSrc(n.id)} name={n.name} sub="NPC" onClick={() => openEntity("npc", n.id)} />
              ))}
            </Grid>
          )}

          {tab === "biomes" && (
            <Grid>
              {biomes.filter((b) => matchesQuery(q, b.name, b.readings)).map((b) => (
                <Tile key={b.id} glyph={b.glyph} color={b.color} image={iconSrc(b.id)} name={b.name} sub={b.layer} onClick={() => openEntity("biome", b.id)} />
              ))}
            </Grid>
          )}

          {tab === "stations" && (
            <Grid>
              {stations.filter((s) => matchesQuery(q, s.name, s.readings)).map((s) => (
                <Tile key={s.id} glyph={s.glyph} color={s.color} image={iconSrc(s.id)} name={s.name} sub={progressionLabel[s.progression]} onClick={() => openEntity("station", s.id)} />
              ))}
            </Grid>
          )}

          {tab === "events" && (
            <Grid>
              {events.filter((e) => matchesQuery(q, e.name, e.readings)).map((e) => (
                <Tile key={e.id} glyph={e.glyph} color={e.color} image={iconSrc(e.id)} name={e.name} sub={progressionLabel[e.progression]} onClick={() => openEntity("event", e.id)} />
              ))}
            </Grid>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-2">{children}</div>
}

function Tile({ glyph, color, image, name, sub, onClick }: { glyph: string; color: string; image?: string; name: string; sub: string; onClick: () => void }) {
  const label = sanitizeName(name, name)
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card/60 p-2.5 text-center">
      <GlyphTile glyph={glyph} color={color} image={image} size={44} />
      <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{label}</span>
      <span className="line-clamp-1 text-[9px] text-muted-foreground">{sub}</span>
    </button>
  )
}

function CatChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
        active ? "bg-grass text-primary-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </button>
  )
}

function MoreButton({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (shown >= total) return null
  return (
    <button
      onClick={onMore}
      className="mt-3 w-full rounded-xl border border-border bg-secondary/50 py-2.5 text-xs font-semibold text-muted-foreground"
    >
      さらに表示（残り {total - shown} 件）
    </button>
  )
}
