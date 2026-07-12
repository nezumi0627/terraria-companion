/** Light tactile feedback for supported devices (Android / some iOS PWAs). */
export type HapticKind = 'light' | 'medium' | 'success' | 'warning' | 'selection'

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 8,
  medium: 16,
  selection: 6,
  success: [10, 40, 14],
  warning: [20, 30, 20],
}

export function haptic(kind: HapticKind = 'light') {
  try {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    navigator.vibrate(PATTERNS[kind])
  } catch {
    /* ignore */
  }
}
