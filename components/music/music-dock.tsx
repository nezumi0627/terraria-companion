'use client'

import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Music2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  FolderOpen,
  ExternalLink,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useMusic } from '@/lib/music-store'
import {
  MUSIC_TRACKS,
  MUSIC_LICENSE,
  OFFICIAL_LINKS,
  formatDuration,
  type MusicGroup,
  type MusicMood,
  type MusicTrack,
} from '@/lib/music-tracks'
import { useUi } from '@/lib/ui-store'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

const GROUP_FILTERS: { id: MusicGroup | 'all'; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'main', label: '通常' },
  { id: 'otherworld', label: 'Otherworld' },
  { id: 'ambience', label: '環境音' },
]

const MOOD_FILTERS: { id: MusicMood | 'all'; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'day', label: '昼' },
  { id: 'night', label: '夜' },
  { id: 'underground', label: '地下' },
  { id: 'boss', label: 'ボス' },
  { id: 'biome', label: 'バイオーム' },
  { id: 'event', label: 'イベント' },
  { id: 'town', label: '町' },
  { id: 'title', label: 'タイトル' },
]

export function MusicDock() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const expanded = useMusic((s) => s.expanded)
  const toggleExpanded = useMusic((s) => s.toggleExpanded)
  const setExpanded = useMusic((s) => s.setExpanded)
  const screensaver = useUi((s) => s.screensaver)
  const currentId = useMusic((s) => s.currentId)
  const playing = useMusic((s) => s.playing)
  const progress = useMusic((s) => s.progress)
  const duration = useMusic((s) => s.duration)
  const volume = useMusic((s) => s.volume)
  const muted = useMusic((s) => s.muted)
  const shuffle = useMusic((s) => s.shuffle)
  const repeat = useMusic((s) => s.repeat)
  const library = useMusic((s) => s.library)
  const custom = useMusic((s) => s.custom)
  const libraryReady = useMusic((s) => s.libraryReady)
  const filterGroup = useMusic((s) => s.filterGroup)
  const filterMood = useMusic((s) => s.filterMood)
  const resolveTrack = useMusic((s) => s.resolveTrack)

  const hydrateLibrary = useMusic((s) => s.hydrateLibrary)
  const importFiles = useMusic((s) => s.importFiles)
  const clearLibrary = useMusic((s) => s.clearLibrary)
  const play = useMusic((s) => s.play)
  const pause = useMusic((s) => s.pause)
  const toggle = useMusic((s) => s.toggle)
  const next = useMusic((s) => s.next)
  const prev = useMusic((s) => s.prev)
  const seek = useMusic((s) => s.seek)
  const setVolume = useMusic((s) => s.setVolume)
  const setMuted = useMusic((s) => s.setMuted)
  const setShuffle = useMusic((s) => s.setShuffle)
  const setRepeat = useMusic((s) => s.setRepeat)
  const setFilterGroup = useMusic((s) => s.setFilterGroup)
  const setFilterMood = useMusic((s) => s.setFilterMood)
  const playSuggested = useMusic((s) => s.playSuggested)
  const bindAudio = useMusic((s) => s._bindAudio)
  const onTimeUpdate = useMusic((s) => s._onTimeUpdate)
  const onEnded = useMusic((s) => s._onEnded)
  const onLoaded = useMusic((s) => s._onLoaded)

  useEffect(() => {
    void hydrateLibrary()
  }, [hydrateLibrary])

  useEffect(() => {
    if (screensaver) setExpanded(false)
  }, [screensaver, setExpanded])

  useEffect(() => {
    bindAudio(audioRef.current)
    return () => bindAudio(null)
  }, [bindAudio])

  const track = resolveTrack(currentId)
  const libCount = Object.keys(library).length
  const canPlay = MUSIC_TRACKS.some((t) => t.streamUrl) || libCount > 0

  const list = useMemo(() => {
    const catalog = MUSIC_TRACKS.filter((t) => {
      if (filterGroup !== 'all' && t.group !== filterGroup) return false
      if (filterMood !== 'all' && t.mood !== filterMood) return false
      return true
    })
    if (filterGroup !== 'all' || filterMood !== 'all') return catalog
    const extras: MusicTrack[] = Object.keys(custom)
      .filter((id) => library[id])
      .map((id) => resolveTrack(id))
      .filter((t): t is MusicTrack => !!t)
    return [...catalog, ...extras]
  }, [filterGroup, filterMood, custom, library, resolveTrack])

  const cycleRepeat = () => {
    haptic('selection')
    const order = ['off', 'all', 'one'] as const
    const i = order.indexOf(repeat)
    setRepeat(order[(i + 1) % order.length])
  }

  return (
    <>
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onLoadedMetadata={onLoaded}
        onPlay={() => useMusic.setState({ playing: true })}
        onPause={() => useMusic.setState({ playing: false })}
      />

      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.mp3,.ogg,.wav,.flac,.m4a"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          if (!files?.length) return
          void importFiles(files).then((r) => {
            haptic(r.added ? 'success' : 'warning')
            e.target.value = ''
          })
        }}
      />

      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-0 z-[45] mx-auto w-full max-w-md px-3 landscape:max-w-5xl',
          'transition-all duration-300',
          screensaver && 'translate-y-[120%] opacity-0',
        )}
      >
        <div
          className={cn(
            'pointer-events-auto mb-[calc(var(--chrome-nav)+env(safe-area-inset-bottom,0px))]',
            screensaver && 'pointer-events-none',
          )}
        >
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="sheet"
                initial={{ opacity: 0, y: 24, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 16, height: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className="mb-2 overflow-hidden"
              >
                <div className="glass max-h-[min(48dvh,360px)] overflow-hidden rounded-2xl border border-border shadow-[0_12px_40px_-12px_rgba(0,0,0,0.75)]">
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold">ゲーム内 BGM</div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {MUSIC_TRACKS.length} 曲 · Wiki Listen から再生
                        {libCount > 0 ? ` · ローカル ${libCount}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        haptic('light')
                        setExpanded(false)
                      }}
                      className="grid size-8 place-items-center rounded-lg bg-secondary text-muted-foreground"
                      aria-label="閉じる"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </div>

                  <div className="space-y-2 px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          haptic('medium')
                          fileRef.current?.click()
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold"
                      >
                        <FolderOpen className="size-3.5" />
                        OST上書き
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          haptic('light')
                          playSuggested()
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-grass px-2.5 py-1 text-[11px] font-bold text-primary-foreground"
                      >
                        <Sparkles className="size-3.5 text-gold" />
                        いまの時間帯
                      </button>
                      <a
                        href={OFFICIAL_LINKS.steam}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold"
                      >
                        Steam
                        <ExternalLink className="size-3" />
                      </a>
                      <a
                        href={OFFICIAL_LINKS.bandcamp}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold"
                      >
                        Bandcamp
                        <ExternalLink className="size-3" />
                      </a>
                      {libCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            haptic('warning')
                            void clearLibrary()
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2.5 py-1 text-[11px] font-semibold text-danger"
                        >
                          <Trash2 className="size-3.5" />
                          削除
                        </button>
                      )}
                    </div>

                    <div className="flex gap-1 overflow-x-auto no-scrollbar">
                      {GROUP_FILTERS.map((f) => (
                        <button
                          key={String(f.id)}
                          type="button"
                          onClick={() => {
                            haptic('selection')
                            setFilterGroup(f.id)
                          }}
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            filterGroup === f.id
                              ? 'bg-grass text-primary-foreground'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1 overflow-x-auto no-scrollbar">
                      {MOOD_FILTERS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            haptic('selection')
                            setFilterMood(f.id)
                          }}
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            filterMood === f.id
                              ? 'bg-gold/90 text-accent-foreground'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-[38dvh] overflow-y-auto overscroll-contain px-2 pb-2">
                    {!libraryReady ? (
                      <p className="px-2 py-6 text-center text-xs text-muted-foreground">読み込み中…</p>
                    ) : (
                      <>
                        <ul className="flex flex-col gap-0.5">
                          {list.map((t) => {
                            const local = !!library[t.id]
                            const ready = local || !!t.streamUrl
                            const active = currentId === t.id
                            return (
                              <li key={t.id}>
                                <button
                                  type="button"
                                  disabled={!ready}
                                  onClick={() => {
                                    haptic('medium')
                                    if (active && playing) pause()
                                    else void play(t.id)
                                  }}
                                  className={cn(
                                    'flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors',
                                    active ? 'bg-grass/20' : 'hover:bg-secondary/60',
                                    !ready && 'opacity-35',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-bold',
                                      active
                                        ? 'bg-grass text-primary-foreground'
                                        : 'bg-secondary text-muted-foreground',
                                    )}
                                  >
                                    {active && playing ? (
                                      <Pause className="size-3.5" />
                                    ) : (
                                      <Play className="size-3.5" />
                                    )}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-xs font-semibold">{t.titleJa}</span>
                                    <span className="block truncate text-[10px] text-muted-foreground">
                                      #{t.index} · {t.title}
                                      {t.group === 'otherworld' ? ' · OW' : ''}
                                      {local ? ' · ローカル' : ''}
                                      {t.credit ? ` · ${t.credit}` : ''}
                                    </span>
                                  </span>
                                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                    {t.duration ? formatDuration(t.duration) : '—'}
                                  </span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                        <div className="mx-1 mt-2 rounded-xl border border-border/60 bg-background/40 px-2.5 py-2 text-[9px] leading-relaxed text-muted-foreground">
                          <p className="font-semibold text-foreground/80">{MUSIC_LICENSE.title}</p>
                          <p>{MUSIC_LICENSE.rights}</p>
                          <p>{MUSIC_LICENSE.composers}</p>
                          <p>{MUSIC_LICENSE.extras}</p>
                          <p className="mt-1">{MUSIC_LICENSE.personalUse}</p>
                          <p className="mt-1">{MUSIC_LICENSE.purchase}</p>
                          <a
                            href={OFFICIAL_LINKS.wiki}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-0.5 text-grass underline-offset-2 hover:underline"
                          >
                            Wiki: Music（試聴元）
                            <ExternalLink className="size-2.5" />
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mini bar — sits above bottom nav without overlapping content */}
          <motion.div
            layout
            className="glass overflow-hidden rounded-2xl border border-border shadow-[0_8px_28px_-10px_rgba(0,0,0,0.7)]"
          >
            <button
              type="button"
              aria-label={expanded ? 'プレイヤーを閉じる' : 'プレイヤーを開く'}
              onClick={() => {
                haptic('light')
                toggleExpanded()
              }}
              className="flex w-full items-center justify-center pb-0.5 pt-1.5 text-muted-foreground"
            >
              <span className="h-1 w-8 rounded-full bg-muted-foreground/35" />
            </button>

            <div className="flex items-center gap-1 px-2 pb-1.5">
              <button
                type="button"
                onClick={() => {
                  haptic('selection')
                  toggleExpanded()
                }}
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-grass/20 text-grass"
                aria-label="ライブラリ"
              >
                <Music2 className="size-4" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold">
                  {track ? track.titleJa : '曲を選択 / いまの時間帯'}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {track
                    ? track.title
                    : libraryReady
                      ? `${MUSIC_TRACKS.length} 曲再生可能`
                      : '準備中'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  haptic('selection')
                  prev()
                }}
                className="grid size-8 place-items-center rounded-lg text-foreground disabled:opacity-30"
                disabled={!canPlay}
                aria-label="前の曲"
              >
                <SkipBack className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic('medium')
                  if (!currentId) playSuggested()
                  else toggle()
                }}
                className="grid size-10 place-items-center rounded-full bg-grass text-primary-foreground shadow-[0_0_18px_-6px] shadow-grass/50 disabled:opacity-40"
                disabled={!canPlay}
                aria-label={playing ? '一時停止' : '再生'}
              >
                {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-0.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic('selection')
                  next()
                }}
                className="grid size-8 place-items-center rounded-lg text-foreground disabled:opacity-30"
                disabled={!canPlay}
                aria-label="次の曲"
              >
                <SkipForward className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic('light')
                  toggleExpanded()
                }}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground"
                aria-label="詳細"
              >
                {expanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
              </button>
            </div>

            <div className="px-3 pb-1.5">
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={progress || 0}
                disabled={!currentId}
                onChange={(e) => seek(Number(e.target.value))}
                className="music-seek w-full accent-[var(--grass)] disabled:opacity-40"
                aria-label="再生位置"
              />
              <div className="mt-0.5 flex items-center justify-between text-[9px] tabular-nums text-muted-foreground">
                <span>{formatDuration((duration || 0) * (progress || 0))}</span>
                <span>{formatDuration(duration || track?.duration || 0)}</span>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 overflow-hidden border-t border-border/50 px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => {
                      haptic('selection')
                      setShuffle(!shuffle)
                    }}
                    className={cn('grid size-8 place-items-center rounded-lg', shuffle ? 'text-grass' : 'text-muted-foreground')}
                    aria-label="シャッフル"
                  >
                    <Shuffle className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={cycleRepeat}
                    className={cn(
                      'grid size-8 place-items-center rounded-lg',
                      repeat !== 'off' ? 'text-grass' : 'text-muted-foreground',
                    )}
                    aria-label="リピート"
                  >
                    {repeat === 'one' ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      haptic('selection')
                      setMuted(!muted)
                    }}
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground"
                    aria-label="ミュート"
                  >
                    {muted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={muted ? 0 : volume}
                    onChange={(e) => {
                      setMuted(false)
                      setVolume(Number(e.target.value))
                    }}
                    className="min-w-0 flex-1 accent-[var(--grass)]"
                    aria-label="音量"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </>
  )
}
