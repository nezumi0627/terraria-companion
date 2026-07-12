"use client"

import { SheetOverlay } from "@/components/common/sheet-overlay"
import { ItemDetail } from "./item-detail"
import { EntityDetail } from "./entity-detail"
import { GoalDetail } from "./goal-detail"
import { useUi } from "@/lib/ui-store"

export function OverlayHost() {
  const stack = useUi((s) => s.stack)
  const back = useUi((s) => s.back)
  const top = stack[stack.length - 1]

  return (
    <SheetOverlay open={!!top} onClose={back} title={<TitleFor />}>
      {top?.type === "item" && <ItemDetail key={`item-${top.id}`} id={top.id} />}
      {top?.type === "entity" && (
        <EntityDetail key={`entity-${top.kind}-${top.id}`} kind={top.kind} id={top.id} />
      )}
      {top?.type === "goal" && <GoalDetail key={`goal-${top.id}`} id={top.id} />}
    </SheetOverlay>
  )
}

function TitleFor() {
  const stack = useUi((s) => s.stack)
  const top = stack[stack.length - 1]
  const label =
    top?.type === "item" ? "アイテム詳細"
    : top?.type === "goal" ? "目標の進捗"
    : top?.type === "entity"
      ? { boss: "ボス詳細", npc: "NPC詳細", enemy: "敵詳細", biome: "バイオーム詳細", event: "イベント詳細", station: "設備詳細" }[top.kind]
      : ""
  return (
    <div className="flex items-center gap-2">
      {stack.length > 1 && <span className="text-xs text-muted-foreground">{stack.length}階層</span>}
      <span className="font-display text-sm text-foreground">{label}</span>
    </div>
  )
}
