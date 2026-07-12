/**
 * Client for the cloud API.
 * Base URL: NEXT_PUBLIC_CLOUD_API_URL, or public/cloud-api-url.json (tunnel).
 * GitHub token never ships in the static bundle.
 */
import { publicUrl } from '@/lib/public-url'

let cachedBase: string | undefined
let discovery: Promise<string | undefined> | null = null

export function cloudApiBaseSync(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_CLOUD_API_URL?.trim()
  if (raw) return raw.replace(/\/+$/, '')
  return cachedBase
}

export async function resolveCloudApiBase(): Promise<string | undefined> {
  const fromEnv = process.env.NEXT_PUBLIC_CLOUD_API_URL?.trim()
  if (fromEnv) {
    cachedBase = fromEnv.replace(/\/+$/, '')
    return cachedBase
  }
  if (cachedBase) return cachedBase
  if (typeof window === 'undefined') return undefined

  if (!discovery) {
    discovery = (async () => {
      try {
        const res = await fetch(publicUrl('/cloud-api-url.json'), { cache: 'no-store' })
        if (!res.ok) return undefined
        const json = (await res.json()) as { url?: string }
        if (!json.url) return undefined
        cachedBase = String(json.url).replace(/\/+$/, '')
        return cachedBase
      } catch {
        return undefined
      } finally {
        /* keep discovery promise for coalescing; allow retry by clearing on miss */
      }
    })()
  }

  const base = await discovery
  if (!base) discovery = null
  return base
}

export function cloudApiConfigured(): boolean {
  return !!cloudApiBaseSync()
}

export async function cloudApiReady(): Promise<boolean> {
  return !!(await resolveCloudApiBase())
}

export async function cloudFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const base = await resolveCloudApiBase()
  if (!base) throw new Error('クラウド API が設定されていません')

  const { json: body, headers, ...rest } = init
  const res = await fetch(`${base}${path.startsWith('/') ? path : `/${path}`}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : rest.body,
  })

  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string }
  if (!res.ok || (data && typeof data === 'object' && 'ok' in data && data.ok === false)) {
    const err =
      data && typeof data === 'object' && 'error' in data && data.error
        ? String(data.error)
        : `API エラー（${res.status}）`
    throw new Error(err)
  }
  return data
}
