"use client"

import { useRef, useState } from "react"
import { Download, Upload, Trash2, Moon, Sun, Bell, Share2, Info, Plus, Pencil, RotateCcw, ListChecks, ExternalLink } from "lucide-react"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { AuthPanel } from "@/components/screens/auth-panel"
import { FeedbackForm } from "@/components/screens/feedback-form"
import { FEEDBACK_REPO } from "@/lib/feedback"

export function SettingsScreen() {
  const store = useStore()
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const notifications = useStore((s) => s.notifications)
  const setNotifications = useStore((s) => s.setNotifications)
  const resetProgress = useStore((s) => s.resetProgress)
  const importState = useStore((s) => s.importState)
  const dailyTasks = useStore((s) => s.dailyTasks)
  const addDailyTask = useStore((s) => s.addDailyTask)
  const updateDailyTask = useStore((s) => s.updateDailyTask)
  const removeDailyTask = useStore((s) => s.removeDailyTask)
  const resetDailyTasks = useStore((s) => s.resetDailyTasks)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [newQuest, setNewQuest] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState("")

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 2200)
  }

  const doExport = () => {
    const data = {
      owned: store.owned,
      defeatedBosses: store.defeatedBosses,
      unlockedNpcs: store.unlockedNpcs,
      completedEvents: store.completedEvents,
      visitedBiomes: store.visitedBiomes,
      builtStations: store.builtStations,
      craftedItems: store.craftedItems,
      collected: store.collected,
      goals: store.goals,
      favorites: store.favorites,
      dailyTasks: store.dailyTasks,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `terraria-companion-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    flash("進行データを書き出しました")
  }

  const doImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (!importState(data)) {
          flash("有効な進行データが見つかりませんでした")
          return
        }
        flash("進行データを読み込みました")
      } catch {
        flash("ファイルの読み込みに失敗しました")
      }
    }
    reader.readAsText(file)
  }

  const share = async () => {
    const text = "テラリア コンパニオン - Terrariaの進行管理アプリ"
    try {
      if (navigator.share) await navigator.share({ title: text, text, url: location.href })
      else {
        await navigator.clipboard.writeText(location.href)
        flash("リンクをコピーしました")
      }
    } catch {
      /* cancelled */
    }
  }

  const requestNotif = async (v: boolean) => {
    if (v && "Notification" in window && Notification.permission !== "granted") {
      const p = await Notification.requestPermission()
      setNotifications(p === "granted")
      flash(p === "granted" ? "通知を有効にしました" : "通知が許可されませんでした")
    } else {
      setNotifications(v)
    }
  }

  const submitNewQuest = () => {
    const t = newQuest.trim()
    if (!t) return
    addDailyTask(t)
    setNewQuest("")
    flash("クエストを追加しました")
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <h1 className="font-display text-2xl">設定</h1>
        <p className="mt-1 text-sm text-muted-foreground">表示やデータの管理を行います。</p>
      </header>

      <Group title="今日のクエスト">
        <div className="rounded-xl border border-border bg-card/60 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="size-4 text-gold" />
            自分用のチェックリスト
          </div>
          <p className="mb-3 text-[11px] text-muted-foreground">
            ホームの「今日のクエスト」に表示されます。内容は自由に変更できます（最大20件）。
          </p>
          <div className="flex flex-col gap-2">
            {dailyTasks.map((t) => (
              <div key={t.id} className="flex items-start gap-2">
                {editingId === t.id ? (
                  <>
                    <input
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none ring-grass focus:ring-2"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateDailyTask(t.id, editingLabel)
                          setEditingId(null)
                        }
                        if (e.key === "Escape") setEditingId(null)
                      }}
                    />
                    <button
                      onClick={() => {
                        updateDailyTask(t.id, editingLabel)
                        setEditingId(null)
                      }}
                      className="rounded-lg bg-grass px-2 py-1.5 text-[11px] font-bold text-primary-foreground"
                    >
                      保存
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 rounded-lg bg-secondary/40 px-2 py-1.5 text-sm">{t.label}</span>
                    <button
                      onClick={() => {
                        setEditingId(t.id)
                        setEditingLabel(t.label)
                      }}
                      aria-label="編集"
                      className="grid size-8 place-items-center rounded-lg bg-secondary text-muted-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => removeDailyTask(t.id)}
                      aria-label="削除"
                      className="grid size-8 place-items-center rounded-lg bg-danger/10 text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={newQuest}
              onChange={(e) => setNewQuest(e.target.value)}
              placeholder="新しいクエストを入力…"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none ring-grass focus:ring-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNewQuest()
              }}
            />
            <button
              onClick={submitNewQuest}
              className="inline-flex items-center gap-1 rounded-lg bg-grass px-3 py-2 text-xs font-bold text-primary-foreground"
            >
              <Plus className="size-3.5" />
              追加
            </button>
          </div>
          <button
            onClick={() => {
              resetDailyTasks()
              flash("クエストを初期状態に戻しました")
            }}
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
          >
            <RotateCcw className="size-3" />
            初期の5件に戻す
          </button>
        </div>
      </Group>

      <Group title="表示">
        <Row
          icon={theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          label="テーマ"
          desc={theme === "dark" ? "ダーク（洞窟）" : "ライト（羊皮紙）"}
        >
          <Toggle on={theme === "dark"} onChange={(v) => setTheme(v ? "dark" : "light")} />
        </Row>
        <Row icon={<Bell className="size-4" />} label="ボス挑戦リマインダー" desc="対応ブラウザで通知を受け取る">
          <Toggle on={notifications} onChange={requestNotif} />
        </Row>
      </Group>

      <Group title="データ">
        <ActionRow icon={<Download className="size-4" />} label="進行データを書き出す" desc="JSONファイルとして保存" onClick={doExport} />
        <ActionRow icon={<Upload className="size-4" />} label="進行データを読み込む" desc="バックアップから復元" onClick={() => fileRef.current?.click()} />
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) doImport(f)
            e.target.value = ""
          }}
        />
        <ActionRow icon={<Share2 className="size-4" />} label="アプリを共有" desc="友だちにおすすめ" onClick={share} />
      </Group>

      <Group title="危険な操作">
        {!confirmReset ? (
          <ActionRow
            icon={<Trash2 className="size-4" />}
            label="進行データをリセット"
            desc="すべての記録を削除します"
            danger
            onClick={() => setConfirmReset(true)}
          />
        ) : (
          <div className="rounded-xl border border-danger/40 bg-danger/10 p-3">
            <p className="text-sm font-semibold text-danger">本当にすべての進行を削除しますか？</p>
            <p className="mt-1 text-xs text-muted-foreground">この操作は取り消せません（クエスト設定は残ります）。</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  resetProgress()
                  setConfirmReset(false)
                  flash("進行データをリセットしました")
                }}
                className="flex-1 rounded-lg bg-danger py-2 text-sm font-bold text-primary-foreground"
              >
                削除する
              </button>
              <button onClick={() => setConfirmReset(false)} className="flex-1 rounded-lg bg-secondary py-2 text-sm font-semibold text-secondary-foreground">
                キャンセル
              </button>
            </div>
          </div>
        )}
      </Group>

      <Group title="アカウント">
        <AuthPanel onFlash={flash} />
      </Group>

      <Group title="フィードバック">
        <FeedbackForm onFlash={flash} />
      </Group>

      <Group title="このアプリについて">
        <div className="rounded-xl border border-border bg-card/60 p-3 text-sm">
          <div className="font-semibold">テラリア コンパニオン</div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            非公式の Terraria 進行管理 PWA。MIT License。
          </p>
          <div className="mt-3 flex flex-col gap-1.5 text-[12px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">製作者</span>
              <a
                href="https://github.com/nezumi0627"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-grass underline-offset-2 hover:underline"
              >
                nezumi0627
                <ExternalLink className="size-3.5" />
              </a>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">リポジトリ</span>
              <a
                href={`https://github.com/${FEEDBACK_REPO}`}
                target="_blank"
                rel="noreferrer"
                className="truncate font-semibold text-grass underline-offset-2 hover:underline"
              >
                {FEEDBACK_REPO}
              </a>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">ライセンス</span>
              <a
                href={`https://github.com/${FEEDBACK_REPO}/blob/main/LICENSE`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-grass underline-offset-2 hover:underline"
              >
                MIT
              </a>
            </div>
          </div>
        </div>
      </Group>

      <div className="flex items-start gap-2 rounded-xl border border-border bg-card/40 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          進行データは端末内（IndexedDB）に保存されます。図鑑の説明・画像は
          <code className="mx-0.5 rounded bg-muted px-1">public/data</code>
          と
          <code className="mx-0.5 rounded bg-muted px-1">public/sprites</code>
          にローカル保存され、実行時に外部Wikiへ取りに行きません。
          このアプリは非公式のファンメイド攻略ツールです。Terraria および関連商標は権利者に帰属します。
        </p>
      </div>

      {msg && (
        <div className="fixed inset-x-0 bottom-28 z-50 mx-auto w-fit rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-lg">
          {msg}
        </div>
      )}
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground">{title}</h2>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  )
}

function Row({ icon, label, desc, children }: { icon: React.ReactNode; label: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{label}</div>
        {desc && <div className="text-[11px] text-muted-foreground">{desc}</div>}
      </div>
      {children}
    </div>
  )
}

function ActionRow({ icon, label, desc, onClick, danger }: { icon: React.ReactNode; label: string; desc?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5 text-left">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", danger ? "bg-danger/15 text-danger" : "bg-secondary text-secondary-foreground")}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn("text-sm font-semibold", danger && "text-danger")}>{label}</div>
        {desc && <div className="text-[11px] text-muted-foreground">{desc}</div>}
      </div>
    </button>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-grass" : "bg-muted")}
    >
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-background transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  )
}
