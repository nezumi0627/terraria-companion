'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

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

/**
 * Terraria-inspired living backdrop. Particle counts drop under reduced-motion
 * and on narrow viewports for smoother scrolling on mobile Safari.
 */
export function AmbientBackground({ immersive = false }: { immersive?: boolean }) {
  const [mode, setMode] = useState<{ reduced: boolean; compact: boolean }>({
    reduced: false,
    compact: true,
  })

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

  const { reduced, compact } = mode

  const stars = useMemo(() => {
    const n = reduced ? 0 : immersive ? (compact ? 22 : 36) : compact ? 14 : 24
    const rand = makeRng(91)
    return Array.from({ length: n }).map((_, i) => ({
      id: i,
      left: rand() * 100,
      top: rand() * 42,
      size: 1 + rand() * 2,
      delay: -rand() * 6,
      duration: 2.2 + rand() * 3.5,
      opacity: 0.35 + rand() * 0.55,
    }))
  }, [reduced, compact, immersive])

  const clouds = useMemo(() => {
    const n = reduced ? 2 : immersive ? (compact ? 4 : 6) : compact ? 3 : 5
    const rand = makeRng(404)
    return Array.from({ length: n }).map((_, i) => ({
      id: i,
      top: 6 + rand() * 28,
      width: 90 + rand() * 140,
      height: 22 + rand() * 28,
      delay: -rand() * 40,
      duration: 48 + rand() * 40,
      opacity: immersive ? 0.12 + rand() * 0.12 : 0.08 + rand() * 0.1,
      scale: 0.7 + rand() * 0.6,
    }))
  }, [reduced, compact, immersive])

  const motes = useMemo(() => {
    const n = reduced ? 0 : immersive ? (compact ? 12 : 18) : compact ? 8 : 14
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
        gold: rand() > 0.45,
      }
    })
  }, [reduced, compact, immersive])

  const blades = useMemo(() => {
    const n = reduced ? 12 : immersive ? (compact ? 28 : 36) : compact ? 20 : 28
    const rand = makeRng(4242)
    return Array.from({ length: n }).map((_, i) => ({
      id: i,
      left: (i / n) * 100 + (rand() * 1.6 - 0.8),
      height: 22 + rand() * 38,
      delay: -rand() * 4,
      duration: 3.2 + rand() * 2.8,
    }))
  }, [reduced, compact, immersive])

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-0 -z-10 overflow-hidden contain-strict transition-opacity duration-500',
        immersive && 'ambient-immersive',
      )}
    >
      <div className="absolute inset-0 terraria-sky" />
      <div className="absolute left-[18%] top-[8%] h-28 w-28 rounded-full blur-2xl terraria-sun" />

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
          className="absolute rounded-[40%] bg-[#dfe8d8] blur-[1px]"
          style={{
            top: `${c.top}%`,
            width: c.width,
            height: c.height,
            opacity: c.opacity,
            transform: `scale(${c.scale})`,
            animation: reduced ? undefined : `cloud-drift ${c.duration}s linear ${c.delay}s infinite`,
          }}
        />
      ))}

      <div
        className="absolute bottom-[9%] left-[-5%] right-[-5%] h-[18%] opacity-35"
        style={{
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

      <div className={cn('absolute bottom-0 left-0 right-0', immersive ? 'h-[14%]' : 'h-[11%]')}>
        <div
          className="absolute inset-x-0 bottom-0 h-full"
          style={{
            background: 'linear-gradient(to top, #3a2a1a 0%, #4a3520 35%, #2f6b3d 78%, transparent 100%)',
            imageRendering: 'pixelated',
          }}
        />
      </div>

      <div
        className={cn(
          'absolute left-0 right-0 flex items-end justify-between px-0.5',
          immersive ? 'bottom-[11%] opacity-75' : 'bottom-[8%] opacity-55',
        )}
      >
        {blades.map((b) => (
          <span
            key={b.id}
            className="block w-[3px] origin-bottom rounded-t-sm"
            style={{
              height: b.height,
              background: 'linear-gradient(to top, #2f6b3d, #5ec45a)',
              animation: reduced ? undefined : `grass-sway ${b.duration}s ease-in-out ${b.delay}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
