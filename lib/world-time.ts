/** Shared Terraria-world time phases for UI + ambient backdrop. */

export type WorldPhase = 'dawn' | 'day' | 'dusk' | 'night'

export function worldPhase(hour = new Date().getHours()): WorldPhase {
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'dusk'
  return 'night'
}

export function worldPhaseLabel(phase: WorldPhase): string {
  switch (phase) {
    case 'dawn':
      return '明け方の世界'
    case 'day':
      return '昼の世界'
    case 'dusk':
      return '夕暮れの世界'
    case 'night':
      return '夜の世界'
  }
}

export function worldPhaseFromDate(d = new Date()): WorldPhase {
  return worldPhase(d.getHours())
}
