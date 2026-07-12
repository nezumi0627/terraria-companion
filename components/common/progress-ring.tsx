'use client'

import { motion } from 'framer-motion'
import { tokenColor } from './glyph-tile'
import { cn } from '@/lib/utils'

interface RingProps {
  value: number // 0-100
  size?: number
  stroke?: number
  color?: string
  label?: string
  sublabel?: string
  className?: string
}

export function ProgressRing({
  value,
  size = 132,
  stroke = 10,
  color = 'grass',
  label,
  sublabel,
  className,
}: RingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, value))
  const offset = c - (clamped / 100) * c
  const col = tokenColor(color)

  return (
    <div className={cn('relative grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px color-mix(in oklab, ${col} 60%, transparent))` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-2xl leading-none" style={{ color: col }}>
            {clamped}
            <span className="text-sm">%</span>
          </div>
          {label && <div className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</div>}
          {sublabel && <div className="text-[10px] text-muted-foreground/70">{sublabel}</div>}
        </div>
      </div>
    </div>
  )
}

interface BarProps {
  value: number
  max?: number
  color?: string
  className?: string
  height?: number
}

export function ProgressBar({ value, max = 100, color = 'grass', className, height = 8 }: BarProps) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  const col = tokenColor(color)
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-muted', className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: col, boxShadow: `0 0 10px color-mix(in oklab, ${col} 55%, transparent)` }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  )
}
