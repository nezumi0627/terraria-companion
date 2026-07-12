"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AmbientBackground } from "@/components/common/ambient-background"
import { BottomNav } from "@/components/common/bottom-nav"
import { OverlayHost } from "@/components/detail/overlay-host"
import { MusicDock } from "@/components/music/music-dock"
import { HomeScreen } from "@/components/screens/home-screen"
import { AcquireScreen } from "@/components/screens/acquire-screen"
import { WikiScreen } from "@/components/screens/wiki-screen"
import { ProgressScreen } from "@/components/screens/progress-screen"
import { SettingsScreen } from "@/components/screens/settings-screen"
import { useUi } from "@/lib/ui-store"
import { useStore } from "@/lib/store"
import { useDataStatus } from "@/lib/data-status"
import { useMusic } from "@/lib/music-store"
import { CloudSyncHost } from "@/components/cloud-sync-host"
import { cn } from "@/lib/utils"

export function AppShell() {
  const tab = useUi((s) => s.tab)
  const back = useUi((s) => s.back)
  const stackLen = useUi((s) => s.stack.length)
  const screensaver = useUi((s) => s.screensaver)
  const hydrated = useStore((s) => s.hydrated)
  const ensureData = useDataStatus((s) => s.ensure)
  const dataError = useDataStatus((s) => s.error)
  const dataLoading = useDataStatus((s) => s.loading)
  // re-render overlays/screens when wiki JSON merges
  useDataStatus((s) => s.version)

  // hardware back button / ESC closes the top overlay or music dock / exits screensaver
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (stackLen > 0) {
        back()
        return
      }
      if (useMusic.getState().expanded) {
        useMusic.getState().setExpanded(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [stackLen, back])

  // curated data paints first; wiki/sprites JSON merges in the background
  useEffect(() => {
    void ensureData()
  }, [ensureData])

  // register service worker for PWA/offline
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const sw = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/sw.js`
      navigator.serviceWorker.register(sw).catch(() => {})
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.screensaver = screensaver ? "1" : "0"
    return () => {
      delete document.documentElement.dataset.screensaver
    }
  }, [screensaver])

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col landscape:max-w-5xl">
      <AmbientBackground immersive={screensaver} />
      <main
        className={cn(
          "relative z-10 flex-1 px-4 pt-[max(env(safe-area-inset-top),8px)] transition-[padding] duration-300",
          screensaver
            ? "pb-0"
            : "pb-[calc(var(--chrome-stack)+env(safe-area-inset-bottom,0px))]",
        )}
      >
        {!hydrated ? (
          <LoadingState />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {tab === "home" && <HomeScreen />}
              {tab === "acquire" && <AcquireScreen />}
              {tab === "wiki" && <WikiScreen />}
              {tab === "progress" && <ProgressScreen />}
              {tab === "settings" && <SettingsScreen />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {dataError && hydrated && !screensaver && (
        <div className="pointer-events-none fixed inset-x-0 bottom-40 z-40 mx-auto flex w-full max-w-md justify-center px-4 landscape:max-w-5xl">
          <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-2 text-[11px] shadow-lg backdrop-blur">
            <span className="min-w-0 truncate text-muted-foreground">Wiki追記の読込に失敗</span>
            <button
              type="button"
              disabled={dataLoading}
              onClick={() => void ensureData()}
              className="shrink-0 rounded-full bg-grass px-2.5 py-1 font-bold text-primary-foreground disabled:opacity-60"
            >
              {dataLoading ? "読込中…" : "再試行"}
            </button>
          </div>
        </div>
      )}

      <OverlayHost />
      <MusicDock />
      <BottomNav />
      <CloudSyncHost />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <div className="size-10 animate-spin rounded-full border-2 border-muted border-t-grass" />
      <p className="font-display text-sm text-muted-foreground">冒険の記録を読み込み中…</p>
    </div>
  )
}
