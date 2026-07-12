"use client"

import { useMemo } from "react"
import { Trash2, ListTree } from "lucide-react"
import { itemMap, buildTree, rarityColor } from "@/lib/data"
import { GlyphTile } from "@/components/common/glyph-tile"
import { ProgressRing } from "@/components/common/progress-ring"
import { GoalChecklist } from "./goal-checklist"
import { DependencyTree } from "./dependency-tree"
import { useStore, goalProgress } from "@/lib/store"
import { useUi } from "@/lib/ui-store"
import { useDataStatus } from "@/lib/data-status"

export function GoalDetail({ id }: { id: string }) {
  const dataVersion = useDataStatus((s) => s.version)
  const item = itemMap.get(id)
  const store = useStore()
  const removeGoal = useStore((s) => s.removeGoal)
  const back = useUi((s) => s.back)
  const openItem = useUi((s) => s.openItem)

  const gp = useMemo(() => goalProgress(store, id), [store, id, dataVersion])
  const tree = useMemo(() => buildTree(id), [id, dataVersion])

  if (!item) return <p className="py-10 text-center text-muted-foreground">目標が見つかりません。</p>

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-background/40 py-4">
        <ProgressRing value={gp.percent} label={item.name} sublabel={`${gp.done}/${gp.total} 完了`} />
        <div className="flex gap-2 text-center text-xs text-muted-foreground">
          <span className="rounded-md bg-muted px-2 py-1">残ボス {gp.remainingBosses}</span>
          <span className="rounded-md bg-muted px-2 py-1">残素材 {gp.remainingMaterials}</span>
        </div>
      </div>

      {gp.nextTask && (
        <div className="rounded-xl border border-grass/40 bg-grass/10 px-3 py-2.5">
          <div className="text-[11px] font-bold text-grass">次にやること</div>
          <div className="mt-1 flex items-center gap-2">
            <GlyphTile glyph={gp.nextTask.glyph} color={gp.nextTask.color} image={gp.nextTask.image} size={30} />
            <span className="text-sm font-semibold">{gp.nextTask.name}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => openItem(id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground"
        >
          <ListTree className="size-4" />
          詳細を見る
        </button>
        <button
          onClick={() => {
            removeGoal(id)
            back()
          }}
          aria-label="目標を削除"
          className="grid size-10 place-items-center rounded-xl bg-danger/15 text-danger"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div>
        <h3 className="mb-2 font-display text-sm" style={{ color: rarityColor[item.rarity] }}>
          達成チェックリスト
        </h3>
        <GoalChecklist checklist={gp.checklist} />
      </div>

      {tree && (
        <div>
          <h3 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground">取得ツリー</h3>
          <DependencyTree tree={tree} />
        </div>
      )}
    </div>
  )
}
