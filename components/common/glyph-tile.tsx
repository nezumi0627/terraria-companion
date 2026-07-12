'use client'

import { memo, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function tokenColor(name: string): string {
  return `var(--color-${name})`
}

interface GlyphTileProps {
  glyph: string
  color: string
  image?: string
  size?: number
  className?: string
  dim?: boolean
  glow?: boolean
}

export const GlyphTile = memo(function GlyphTile({
  glyph,
  color,
  image,
  size = 44,
  className,
  dim,
  glow,
}: GlyphTileProps) {
  const c = tokenColor(color)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    setBroken(false)
  }, [image])

  const showSprite = !!image && !broken

  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-xl font-display leading-none select-none',
        dim && 'opacity-40 grayscale',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * (glyph.length > 1 ? 0.34 : 0.5),
        color: '#0f130d',
        background: `linear-gradient(135deg, color-mix(in oklab, ${c} 92%, white 8%), color-mix(in oklab, ${c} 78%, black 22%))`,
        boxShadow: glow
          ? `inset 0 1px 0 color-mix(in oklab, ${c} 40%, white), 0 0 18px color-mix(in oklab, ${c} 55%, transparent)`
          : `inset 0 1px 0 color-mix(in oklab, ${c} 40%, white), inset 0 -2px 0 color-mix(in oklab, ${c} 60%, black)`,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in oklab, #000 12%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, #000 12%, transparent) 1px, transparent 1px)',
          backgroundSize: '6px 6px',
          mixBlendMode: 'overlay',
        }}
      />
      {showSprite ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          aria-hidden
          draggable={false}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="relative object-contain"
          style={{
            width: '78%',
            height: '78%',
            imageRendering: 'pixelated',
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.45))',
          }}
        />
      ) : (
        <span className="relative font-bold drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]">
          {glyph}
        </span>
      )}
    </span>
  )
})
