/**
 * User ID / PIN validation + cloud user file types.
 * GitHub Contents writes go through the Worker (`lib/cloud-api.ts`), not the browser.
 */
import { cloudApiConfigured, cloudFetch } from '@/lib/cloud-api'

export const GITHUB_REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO || 'nezumi0627/terraria-companion'

export function assertValidUserId(id: string): string | null {
  const t = id.trim()
  if (t.length < 3 || t.length > 24) return 'IDは3〜24文字にしてください'
  if (!/^[a-zA-Z0-9_-]+$/.test(t)) return 'IDは英数字・ハイフン・アンダースコアのみです'
  if (/^(con|prn|aux|nul|users|admin)$/i.test(t)) return 'そのIDは使えません'
  return null
}

export function assertValidPin(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return 'パスワードは数字4桁にしてください'
  return null
}

export async function hashPin(userId: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${userId.trim().toLowerCase()}:${pin}:tc-v1`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function userFilePath(userId: string): string {
  return `users/${userId.trim().toLowerCase()}.json`
}

export interface UserFile {
  id: string
  /** SHA-256 hex of id:pin:salt — never store raw PIN */
  pinHash: string
  updatedAt: number
  /** Progress / settings snapshot */
  state: Record<string, unknown>
}

export interface CloudAuthResult {
  ok: true
  userId: string
  sha: string
  updatedAt: number
  state: Record<string, unknown>
}

export interface CloudSaveResult {
  ok: true
  sha: string
  updatedAt: number
}

/** @deprecated Prefer cloudApiConfigured — kept for older call sites */
export function githubDataToken(): string | undefined {
  return cloudApiConfigured() ? 'cloud-api' : undefined
}

export async function registerCloudUser(
  userId: string,
  pinHash: string,
  state: Record<string, unknown>,
): Promise<CloudAuthResult> {
  return cloudFetch<CloudAuthResult>('/register', {
    method: 'POST',
    json: { id: userId, pinHash, state },
  })
}

export async function loginCloudUser(userId: string, pinHash: string): Promise<CloudAuthResult> {
  return cloudFetch<CloudAuthResult>('/login', {
    method: 'POST',
    json: { id: userId, pinHash },
  })
}

export async function saveCloudUser(
  userId: string,
  pinHash: string,
  state: Record<string, unknown>,
  sha?: string,
): Promise<CloudSaveResult> {
  return cloudFetch<CloudSaveResult>('/save', {
    method: 'PUT',
    json: { id: userId, pinHash, state, sha },
  })
}
