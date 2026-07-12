/**
 * Sprite URL helpers. The id → wiki basename map lives in
 * `public/data/sprites.json` and is loaded at runtime (see `loadExtendedData`).
 */

import { publicUrl } from '@/lib/public-url'

/**
 * Local public path for a mirrored sprite. Prefer `localSpriteUrl(id)`.
 * Kept for the download script / debugging against wiki basenames.
 */
export function wikiSpriteUrl(name: string): string {
  const source = `terraria.wiki.gg/wiki/Special:FilePath/${encodeURIComponent(name)}.png`
  return `https://images.weserv.nl/?url=${encodeURIComponent(source)}&output=png&n=-1`
}

/** Local sprite path served from /public/sprites. */
export function localSpriteUrl(id: string): string {
  return publicUrl(`/sprites/${id}.png`)
}
