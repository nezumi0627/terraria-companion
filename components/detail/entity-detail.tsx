"use client"

import { useEffect } from "react"
import { Star, Check, Swords, Shield } from "lucide-react"
import {
  bossMap,
  npcMap,
  biomeMap,
  eventMap,
  stationMap,
  enemyMap,
  itemMap,
  iconSrc,
  progressionLabel,
} from "@/lib/data"
import { GlyphTile } from "@/components/common/glyph-tile"
import { useStore } from "@/lib/store"
import { useUi } from "@/lib/ui-store"
import { cn } from "@/lib/utils"
import { sanitizeDescription } from "@/lib/sanitize-text"

type Kind = "boss" | "npc" | "biome" | "event" | "station" | "enemy"

export function EntityDetail({ kind, id }: { kind: Kind; id: string }) {
  const addRecentView = useStore((s) => s.addRecentView)
  const openItem = useUi((s) => s.openItem)

  const defeated = useStore((s) => s.defeatedBosses)
  const npcsUnlocked = useStore((s) => s.unlockedNpcs)
  const events = useStore((s) => s.completedEvents)
  const biomes = useStore((s) => s.visitedBiomes)
  const stationsBuilt = useStore((s) => s.builtStations)
  const isFav = useStore((s) => !!s.favorites[`${kind}:${id}`])
  const toggleFav = useStore((s) => s.toggleFavorite)
  const toggleBoss = useStore((s) => s.toggleBoss)
  const toggleNpc = useStore((s) => s.toggleNpc)
  const toggleEvent = useStore((s) => s.toggleEvent)
  const toggleBiome = useStore((s) => s.toggleBiome)
  const toggleStation = useStore((s) => s.toggleStation)

  useEffect(() => {
    addRecentView(kind, id)
  }, [kind, id, addRecentView])

  const entity =
    kind === "boss" ? bossMap.get(id)
    : kind === "npc" ? npcMap.get(id)
    : kind === "biome" ? biomeMap.get(id)
    : kind === "event" ? eventMap.get(id)
    : kind === "enemy" ? enemyMap.get(id)
    : stationMap.get(id)

  if (!entity) return <p className="py-10 text-center text-muted-foreground">見つかりませんでした。</p>

  const trackable = kind !== "enemy"

  const done =
    kind === "boss" ? !!defeated[id]
    : kind === "npc" ? !!npcsUnlocked[id]
    : kind === "event" ? !!events[id]
    : kind === "biome" ? !!biomes[id]
    : kind === "station" ? !!stationsBuilt[id]
    : false

  const toggle = () => {
    if (kind === "boss") toggleBoss(id)
    else if (kind === "npc") toggleNpc(id)
    else if (kind === "event") toggleEvent(id)
    else if (kind === "biome") toggleBiome(id)
    else if (kind === "station") toggleStation(id)
  }

  const kindLabel: Record<Kind, string> = { boss: "ボス", npc: "NPC", biome: "バイオーム", event: "イベント", station: "作業設備", enemy: "敵" }
  const actionLabel: Record<Kind, string> = { boss: "討伐済みにする", npc: "解放済みにする", event: "発生済みにする", biome: "到達済みにする", station: "設置済みにする", enemy: "" }
  const doneLabel: Record<Kind, string> = { boss: "討伐済み", npc: "解放済み", event: "発生済み", biome: "到達済み", station: "設置済み", enemy: "" }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-start gap-3">
        <GlyphTile glyph={entity.glyph} color={entity.color} image={iconSrc(id)} size={64} glow />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg leading-tight text-balance">{entity.name}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{kindLabel[kind]}</span>
            {"progression" in entity && (entity as { progression?: string }).progression ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {progressionLabel[(entity as { progression: keyof typeof progressionLabel }).progression]}
              </span>
            ) : null}
            {(kind === "boss" || kind === "enemy") && (entity as { hardmode?: boolean }).hardmode ? (
              <span className="rounded-md bg-danger/20 px-1.5 py-0.5 text-[11px] font-semibold text-danger">ハードモード</span>
            ) : null}
          </div>
        </div>
        <button
          onClick={() => toggleFav(kind, id)}
          aria-label="お気に入り"
          className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-secondary", isFav ? "text-gold" : "text-muted-foreground")}
        >
          <Star className={cn("size-5", isFav && "fill-current")} />
        </button>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {"description" in entity
          ? sanitizeDescription((entity as { description?: string }).description, entity.name)
          : ""}
        {kind === "npc" ? (entity as { role: string }).role : ""}
      </p>

      {trackable && (
        <button
          onClick={toggle}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all",
            done ? "bg-secondary text-secondary-foreground" : "bg-gradient-to-br from-grass to-forest text-primary-foreground",
          )}
        >
          {done ? <Check className="size-4" /> : <Shield className="size-4" />}
          {done ? doneLabel[kind] : actionLabel[kind]}
        </button>
      )}

      {/* kind-specific details */}
      {kind === "boss" && (
        <BossDetails
          entity={entity as import("@/lib/data").Boss}
          onItem={openItem}
        />
      )}
      {kind === "npc" && <NpcDetails entity={entity as import("@/lib/data").Npc} />}
      {kind === "biome" && (
        <Field label="出現する層" value={(entity as import("@/lib/data").Biome).layer} />
      )}
      {kind === "event" && (
        <Field label="発生条件" value={(entity as import("@/lib/data").GameEvent).trigger} />
      )}
      {kind === "station" && (
        <Field label="入手・作成方法" value={(entity as import("@/lib/data").Station).howTo} />
      )}
      {kind === "enemy" && (
        <EnemyDetails entity={entity as import("@/lib/data").Enemy} onItem={openItem} />
      )}
    </div>
  )
}

function EnemyDetails({ entity, onItem }: { entity: import("@/lib/data").Enemy; onItem: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="出現場所" value={entity.biome} />
        {entity.hp ? <Field label="HP（クラシック）" value={entity.hp} /> : null}
      </div>
      {entity.damage ? <Field label="接触ダメージ" value={entity.damage} /> : null}
      {entity.drops && entity.drops.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground">主なドロップ</h3>
          <div className="flex flex-col gap-1.5">
            {entity.drops.map((did) => {
              const it = itemMap.get(did)
              if (!it) return null
              return (
                <button key={did} onClick={() => onItem(did)} className="flex items-center gap-2.5 rounded-lg bg-card/60 px-2 py-1.5 text-left">
                  <GlyphTile glyph={it.glyph} color={it.color} image={iconSrc(it.id)} size={30} />
                  <span className="flex-1 truncate text-sm">{it.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function BossDetails({ entity, onItem }: { entity: import("@/lib/data").Boss; onItem: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="召喚方法" value={entity.summon} icon={<Swords className="size-3.5" />} />
      <Field label="推奨アリーナ" value={entity.arena} />
      {entity.drops.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground">主なドロップ</h3>
          <div className="flex flex-col gap-1.5">
            {entity.drops.map((did) => {
              const it = itemMap.get(did)
              if (!it) return null
              return (
                <button key={did} onClick={() => onItem(did)} className="flex items-center gap-2.5 rounded-lg bg-card/60 px-2 py-1.5 text-left">
                  <GlyphTile glyph={it.glyph} color={it.color} image={iconSrc(it.id)} size={30} />
                  <span className="flex-1 truncate text-sm">{it.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function NpcDetails({ entity }: { entity: import("@/lib/data").Npc }) {
  return (
    <div className="flex flex-col gap-2">
      <Field label="解放条件" value={entity.unlock} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="好む環境" value={entity.likedBiome} />
        <Field label="好む隣人" value={entity.likedNpc} />
      </div>
      {entity.dislikedBiome ? <Field label="嫌う環境" value={entity.dislikedBiome} /> : null}
    </div>
  )
}

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm leading-relaxed text-foreground">{value}</div>
    </div>
  )
}
