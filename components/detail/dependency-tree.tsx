"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronRight, Package, Skull, User, Sparkles, Map, Hammer, Pickaxe } from "lucide-react"
import type { TreeNode } from "@/lib/data"
import { itemMap, stationMap } from "@/lib/data"
import { GlyphTile } from "@/components/common/glyph-tile"
import { useUi } from "@/lib/ui-store"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<TreeNode["kind"], string> = {
  item: "アイテム",
  boss: "ボス",
  npc: "NPC",
  event: "イベント",
  biome: "バイオーム",
  station: "設備",
}

const KIND_ICON: Record<TreeNode["kind"], typeof Package> = {
  item: Package,
  boss: Skull,
  npc: User,
  event: Sparkles,
  biome: Map,
  station: Hammer,
}

/** Short "how to obtain" tag for a node, used to clarify the relationship. */
function obtainTag(node: TreeNode): { label: string; icon: typeof Package } {
  if (node.kind === "boss") return { label: "討伐", icon: Skull }
  if (node.kind === "event") return { label: "発生", icon: Sparkles }
  if (node.kind === "biome") return { label: "到達", icon: Map }
  if (node.kind === "npc") return { label: "解放", icon: User }
  if (node.kind === "station") return { label: "設置", icon: Hammer }
  // item: crafted when it has children, otherwise a raw material to gather
  if (node.children.length > 0) return { label: "作る", icon: Hammer }
  return { label: "集める", icon: Pickaxe }
}

function Node({ node, depth, isRoot }: { node: TreeNode; depth: number; isRoot?: boolean }) {
  const hasChildren = node.children.length > 0
  const [open, setOpen] = useState(depth < 1)
  const openItem = useUi((s) => s.openItem)
  const openEntity = useUi((s) => s.openEntity)

  const onOpenDetail = () => {
    // Root is already the open detail — re-opening just stacked identical sheets.
    if (isRoot) return
    if (node.kind === "item") openItem(node.id)
    else openEntity(node.kind as "boss" | "npc" | "biome" | "event" | "station", node.id)
  }

  const tag = obtainTag(node)
  const TagIcon = tag.icon
  const stationId = node.kind === "item" ? itemMap.get(node.id)?.recipe?.stationId : undefined
  const stationName = stationId ? stationMap.get(stationId)?.name : undefined

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl py-1" style={{ paddingLeft: depth > 0 ? 4 : 0 }}>
        {hasChildren ? (
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "折りたたむ" : "展開する"}
            className="grid size-6 shrink-0 place-items-center rounded-md bg-secondary/60 text-muted-foreground"
          >
            <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}>
              <ChevronRight className="size-4" />
            </motion.span>
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}

        <button
          onClick={onOpenDetail}
          disabled={isRoot}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 text-left",
            isRoot && "bg-secondary/40",
            isRoot && "cursor-default",
          )}
        >
          <GlyphTile glyph={node.glyph} color={node.color} image={node.image} size={34} glow={isRoot} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-foreground">{node.name}</span>
              {node.count ? (
                <span className="shrink-0 rounded-md bg-grass/15 px-1.5 text-[11px] font-bold text-grass" title="必要な個数">
                  ×{node.count}
                </span>
              ) : null}
              {isRoot ? (
                <span className="shrink-0 rounded-md bg-gold/20 px-1.5 text-[10px] font-bold text-gold">目標</span>
              ) : null}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1 py-px">
                <TagIcon className="size-2.5" />
                {tag.label}
              </span>
              <span className="rounded bg-muted/60 px-1 py-px text-[10px]">{KIND_LABEL[node.kind]}</span>
            </span>
          </span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* relationship label: what the children combine into */}
            <div className="ml-8 mt-0.5 flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70">
              <span className="h-px w-3 bg-border" />
              {node.kind === "item"
                ? stationName
                  ? `${stationName}で合成する材料`
                  : "必要な材料"
                : "前提条件"}
            </div>
            <div className="ml-3 border-l border-dashed border-border pl-2" style={{ marginLeft: 11 }}>
              {node.children.map((c, i) => (
                <Node key={`${c.kind}-${c.id}-${i}`} node={c} depth={depth + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function DependencyTree({ tree }: { tree: TreeNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-3">
      {/* legend explaining the relationships */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted/50 px-2.5 py-1.5 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Hammer className="size-3" />
          作る
        </span>
        <span className="inline-flex items-center gap-1">
          <Pickaxe className="size-3" />
          集める
        </span>
        <span className="inline-flex items-center gap-1">
          <Skull className="size-3" />
          討伐
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="rounded bg-grass/15 px-1 font-bold text-grass">×n</span>
          必要数
        </span>
      </div>
      <Node node={tree} depth={0} isRoot />
    </div>
  )
}
