'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { worldPhase, type WorldPhase } from '@/lib/world-time'

function makeRng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SKY: Record<WorldPhase, string> = {
  dawn:
    'radial-gradient(110% 65% at 50% -8%, #ffb07a 0%, transparent 50%), linear-gradient(180deg, #5a6a9a 0%, #e8a078 38%, #c47858 62%, #3a4a2e 88%, #2a3220 100%)',
  day:
    'radial-gradient(120% 70% at 50% -5%, #7eb6d9 0%, transparent 55%), linear-gradient(180deg, #5a9fc4 0%, #6eb0c8 28%, #7a9a6a 58%, #3a5a38 82%, #2a3a28 100%)',
  dusk:
    'radial-gradient(100% 55% at 78% 12%, #ff8a4a 0%, transparent 45%), linear-gradient(180deg, #2a2450 0%, #c45a6a 32%, #e87840 55%, #5a4030 78%, #2a2818 100%)',
  night:
    'radial-gradient(120% 70% at 50% -5%, #1a2848 0%, transparent 55%), linear-gradient(180deg, #0a1020 0%, #121c30 42%, #1a2218 78%, #0e120c 100%)',
}

/**
 * Terraria-inspired living backdrop. Sky shifts with real time of day;
 * particle counts drop under reduced-motion / narrow viewports.
 */
export function AmbientBackground({ immersive = false }: { immersive?: boolean }) {
  const [mode, setMode] = useState<{ reduced: boolean; compact: boolean }>({
    reduced: false,
    compact: true,
  })
  const [phase, setPhase] = useState<WorldPhase>(() => worldPhase())

  useEffect(() => {
    const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const compactMq = window.matchMedia('(max-width: 480px)')
    const sync = () =>
      setMode({
        reduced: reducedMq.matches,
        compact: compactMq.matches,
      })
    sync()
    reducedMq.addEventListener('change', sync)
    compactMq.addEventListener('change', sync)
    return () => {
      reducedMq.removeEventListener('change', sync)
      compactMq.removeEventListener('change', sync)
    }
  }, [])

  useEffect(() => {
    const tick = () => setPhase(worldPhase())
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.worldPhase = phase
  }, [phase])

  const { reduced, compact } = mode
  const isNight = phase === 'night'
  const isDawn = phase === 'dawn'
  const isDusk = phase === 'dusk'

  const stars = useMemo(() => {
    const base = isNight ? (immersive ? 40 : 28) : isDusk || isDawn ? 8 : 0
    const n = reduced ? 0 : compact ? Math.ceil(base * 0.7) : base
    const rand = makeRng(91)
    return Array.from({ length: n }).map((_, i) => ({
      id: i,
      left: rand() * 100,
      top: rand() * 48,
      size: 1 + rand() * 2.2,
      delay: -rand() * 6,
      duration: 2.2 + rand() * 3.5,
      opacity: (isNight ? 0.45 : 0.25) + rand() * 0.5,
    }))
  }, [reduced, compact, immersive, isNight, isDawn, isDusk])

  const clouds = useMemo(() => {
    const n = reduced ? 2 : immersive ? (compact ? 4 : 6) : compact ? 3 : 5
    const rand = makeRng(404)
    const tint =
      phase === 'night'
        ? 'rgba(160,180,200,'
        : phase === 'dusk'
          ? 'rgba(255,180,140,'
          : phase === 'dawn'
            ? 'rgba(255,210,190,'
            : 'rgba(223,232,216,'
    return Array.from({ length: n }).map((_, i) => ({
      id: i,
      top: 6 + rand() * 28,
      width: 90 + rand() * 140,
      height: 22 + rand() * 28,
      delay: -rand() * 40,
      duration: 48 + rand() * 40,
      opacity: immersive ? 0.14 + rand() * 0.12 : 0.1 + rand() * 0.1,
      scale: 0.7 + rand() * 0.6,
      color: `${tint}${0.55 + rand() * 0.35})`,
    }))
  }, [reduced, compact, immersive, phase])

  const motes = useMemo(() => {
    const n = reduced ? 0 : isNight ? 0 : immersive ? (compact ? 12 : 18) : compact ? 8 : 14
    const rand = makeRng(1337)
    return Array.from({ length: n }).map((_, i) => {
      const size = 2 + rand() * 4
      return {
        id: i,
        left: rand() * 100,
        size,
        delay: -rand() * 22,
        duration: 14 + rand() * 18,
        opacity: 0.3 + rand() * 0.45,
        gold: rand() > 0.45 || isDawn || isDusk,
      }
    })
  }, [reduced, compact, immersive, isNight, isDawn, isDusk])

  const blades = useMemo(() => {
    const n = reduced ? 14 : immersive ? (compact ? 30 : 40) : compact ? 22 : 30
    const rand = makeRng(4242)
    return Array.from({ length: n }).map((_, i) => ({
      id: i,
      left: (i / n) * 100 + (rand() * 1.6 - 0.8),
      height: 26 + rand() * 42,
      delay: -rand() * 4,
      duration: 3.2 + rand() * 2.8,
    }))
  }, [reduced, compact, immersive])

  // Ground raised: dirt ~18–22% of viewport, grass sits on top of it
  const dirtH = immersive ? '22%' : '18%'
  const grassBottom = immersive ? '18%' : '15%'
  const hillBottom = immersive ? '16%' : '13%'

  const sunStyle =
    phase === 'dawn'
      ? { left: '22%', top: '28%', opacity: 0.85 }
      : phase === 'day'
        ? { left: '18%', top: '8%', opacity: 0.9 }
        : phase === 'dusk'
          ? { left: '72%', top: '22%', opacity: 0.95 }
          : { left: '70%', top: '10%', opacity: 0 }

  const moonVisible = isNight || isDusk

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-0 z-0 overflow-hidden contain-strict transition-[filter] duration-700',
        immersive && 'ambient-immersive',
        `ambient-phase-${phase}`,
      )}
    >
      <div
        className="absolute inset-0 transition-[background] duration-1000"
        style={{ background: SKY[phase] }}
      />

      {/* Sun */}
      <div
        className="absolute h-32 w-32 rounded-full blur-2xl transition-all duration-1000"
        style={{
          left: sunStyle.left,
          top: sunStyle.top,
          opacity: sunStyle.opacity,
          background:
            phase === 'dusk' || phase === 'dawn'
              ? 'radial-gradient(circle, color-mix(in oklab, #ff9a4a 70%, transparent), transparent 70%)'
              : 'radial-gradient(circle, color-mix(in oklab, #f2c94c 55%, transparent), transparent 70%)',
        }}
      />

      {/* Moon */}
      {moonVisible && (
        <div
          className="absolute h-16 w-16 rounded-full transition-opacity duration-1000"
          style={{
            right: '14%',
            top: isNight ? '10%' : '8%',
            opacity: isNight ? 0.85 : 0.35,
            background:
              'radial-gradient(circle at 35% 35%, #eef3ea 0%, #c8d4e0 45%, transparent 70%)',
            boxShadow: isNight ? '0 0 40px 8px rgba(180,200,230,0.25)' : undefined,
          }}
        />
      )}

      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full bg-[#eef3ea]"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animation: reduced ? undefined : `star-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      {clouds.map((c) => (
        <span
          key={c.id}
          className="absolute rounded-[40%] blur-[1px]"
          style={{
            top: `${c.top}%`,
            width: c.width,
            height: c.height,
            opacity: c.opacity,
            background: c.color,
            transform: `scale(${c.scale})`,
            animation: reduced ? undefined : `cloud-drift ${c.duration}s linear ${c.delay}s infinite`,
          }}
        />
      ))}

      <div
        className="absolute left-[-5%] right-[-5%] h-[22%] opacity-40"
        style={{
          bottom: hillBottom,
          background:
            'radial-gradient(120% 100% at 20% 100%, #1a2a18 0%, transparent 55%), radial-gradient(100% 100% at 70% 100%, #243222 0%, transparent 50%), radial-gradient(80% 100% at 95% 100%, #1c281a 0%, transparent 45%)',
        }}
      />

      {motes.map((m) => (
        <span
          key={m.id}
          className="absolute bottom-0 rounded-full"
          style={{
            left: `${m.left}%`,
            width: m.size,
            height: m.size,
            // @ts-expect-error custom prop
            '--p-opacity': m.opacity,
            background: m.gold
              ? 'radial-gradient(circle, #f2c94c, transparent 70%)'
              : 'radial-gradient(circle, #9be07a, transparent 70%)',
            animation: reduced ? undefined : `float-up ${m.duration}s linear ${m.delay}s infinite`,
          }}
        />
      ))}

      {/* Dirt / soil — raised */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: dirtH }}>
        <div
          className="absolute inset-x-0 bottom-0 h-full"
          style={{
            background:
              phase === 'night'
                ? 'linear-gradient(to top, #1a120c 0%, #2a1e14 35%, #1e3a24 72%, transparent 100%)'
                : phase === 'dusk'
                  ? 'linear-gradient(to top, #3a2210 0%, #4a3020 35%, #3a5a30 72%, transparent 100%)'
                  : 'linear-gradient(to top, #3a2a1a 0%, #4a3520 35%, #2f6b3d 72%, transparent 100%)',
            imageRendering: 'pixelated',
          }}
        />
      </div>

      <div
        className={cn(
          'absolute left-0 right-0 flex items-end justify-between px-0.5',
          immersive ? 'opacity-80' : 'opacity-60',
        )}
        style={{ bottom: grassBottom }}
      >
        {blades.map((b) => (
          <span
            key={b.id}
            className="block w-[3px] origin-bottom rounded-t-sm"
            style={{
              height: b.height,
              background:
                phase === 'night'
                  ? 'linear-gradient(to top, #1a3a22, #3a7040)'
                  : 'linear-gradient(to top, #2f6b3d, #5ec45a)',
              animation: reduced ? undefined : `grass-sway ${b.duration}s ease-in-out ${b.delay}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
