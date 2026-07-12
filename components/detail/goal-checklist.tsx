"use client"

import { motion } from "framer-motion"
import { Check, Minus, Plus } from "lucide-react"
import type { ChecklistEntry } from "@/lib/data"
import { GlyphTile } from "@/components/common/glyph-tile"
import { useStore, isEntryDone, type AppState } from "@/lib/store"
import { useUi } from "@/lib/ui-store"
import { cn } from "@/lib/utils"

const KIND_META: Record<ChecklistEntry["kind"], { label: string; verb: string }> = {
  boss: { label: "ボス討伐", verb: "討伐した" },
  event: { label: "イベント", verb: "発生させた" },
  biome: { label: "バイオーム到達", verb: "到達した" },
  material: { label: "素材集め", verb: "集めた" },
  craft: { label: "クラフト", verb: "作成した" },
  station: { label: "作業設備", verb: "設置した" },
  npc: { label: "NPC解放", verb: "解放した" },
}

const ORDER: ChecklistEntry["kind"][] = ["boss", "event", "biome", "material", "craft", "station", "npc"]

function toggleFor(s: AppState, e: ChecklistEntry) {
  switch (e.kind) {
    case "boss":
      return () => s.toggleBoss(e.refId)
    case "npc":
      return () => s.toggleNpc(e.refId)
    case "event":
      return () => s.toggleEvent(e.refId)
    case "biome":
      return () => s.toggleBiome(e.refId)
    case "station":
      return () => s.toggleStation(e.refId)
    case "craft":
      return () => s.toggleCrafted(e.refId)
    case "material":
      return () => {
        const need = e.count ?? 1
        const cur = s.owned[e.refId] ?? 0
        s.setOwned(e.refId, cur >= need ? 0 : need)
      }
  }
}

function MaterialStepper({ entry }: { entry: ChecklistEntry }) {
  const owned = useStore((s) => s.owned[entry.refId] ?? 0)
  const setOwned = useStore((s) => s.setOwned)
  const need = entry.count ?? 1
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setOwned(entry.refId, owned - 1)}
        className="grid size-6 place-items-center rounded-md bg-secondary text-secondary-foreground disabled:opacity-40"
        disabled={owned <= 0}
        aria-label="減らす"
      >
        <Minus className="size-3.5" />
      </button>
      <span className={cn("min-w-[3.2rem] text-center text-xs font-bold tabular-nums", owned >= need ? "text-success" : "text-foreground")}>
        {owned}/{need}
      </span>
      <button
        onClick={() => setOwned(entry.refId, owned + 1)}
        className="grid size-6 place-items-center rounded-md bg-secondary text-secondary-foreground"
        aria-label="増やす"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}

function Row({ entry }: { entry: ChecklistEntry }) {
  const store = useStore()
  const done = isEntryDone(store, entry)
  const openItem = useUi((s) => s.openItem)
  const openEntity = useUi((s) => s.openEntity)
  const toggle = toggleFor(store, entry)

  const openDetail = () => {
    if (entry.kind === "material" || entry.kind === "craft") openItem(entry.refId)
    else openEntity(entry.kind as "boss" | "npc" | "biome" | "event" | "station", entry.refId)
  }

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-2.5 py-2 transition-colors", done && "opacity-65")}>
      <button
        onClick={toggle}
        aria-pressed={done}
        aria-label={done ? "未完了に戻す" : "完了にする"}
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-md border-2 transition-colors",
          done ? "border-success bg-success text-primary-foreground" : "border-border bg-transparent text-transparent",
        )}
      >
        {done && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <Check className="size-4" strokeWidth={3} />
          </motion.span>
        )}
      </button>

      <button onClick={openDetail} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <GlyphTile glyph={entry.glyph} color={entry.color} image={entry.image} size={32} dim={done} />
        <span className="min-w-0">
          <span className={cn("block truncate text-sm font-semibold", done && "line-through")}>{entry.name}</span>
          <span className="text-[11px] text-muted-foreground">{KIND_META[entry.kind].label}</span>
        </span>
      </button>

      {entry.kind === "material" ? <MaterialStepper entry={entry} /> : null}
    </div>
  )
}

export function GoalChecklist({ checklist }: { checklist: ChecklistEntry[] }) {
  const groups = ORDER.map((kind) => ({
    kind,
    entries: checklist.filter((e) => e.kind === kind),
  })).filter((g) => g.entries.length > 0)

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.kind}>
          <div className="mb-1.5 flex items-center gap-2">
            <h4 className="text-xs font-bold tracking-wide text-muted-foreground">{KIND_META[g.kind].label}</h4>
            <span className="text-[11px] text-muted-foreground/60">{g.entries.length}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {g.entries.map((e) => (
              <Row key={e.key} entry={e} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
