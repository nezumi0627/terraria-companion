/**
 * Client for the cloud API.
 * Prefer NEXT_PUBLIC_CLOUD_API_URL only when it is a durable Worker URL.
 * Otherwise discover via public/cloud-api-url.json (tunnel) and re-fetch on failure.
 * GitHub token never ships in the static bundle.
 */
import { publicUrl } from '@/lib/public-url'

let cachedBase: string | undefined
let discovery: Promise<string | undefined> | null = null
let lastDiscoveryAt = 0

const DISCOVERY_TTL_MS = 2 * 60 * 1000

function normalizeBase(raw: string): string {
  return raw.trim().replace(/\/+$/, '')
}

/** Tunnel hostnames expire ~5h — never treat them as a permanent bake-in. */
export function isEphemeralApiUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host.endsWith('.trycloudflare.com')
  } catch {
    return true
  }
}

function bakedEnvBase(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_CLOUD_API_URL?.trim()
  if (!raw) return undefined
  const base = normalizeBase(raw)
  // Stale tunnel URLs baked into Pages builds break login/feedback after rotate
  if (isEphemeralApiUrl(base)) return undefined
  return base
}

export function cloudApiBaseSync(): string | undefined {
  return bakedEnvBase() || cachedBase
}

function clearDiscovery() {
  cachedBase = undefined
  discovery = null
  lastDiscoveryAt = 0
}

async function fetchUrlJson(): Promise<string | undefined> {
  if (typeof window === 'undefined') return undefined
  try {
    const res = await fetch(publicUrl('/cloud-api-url.json'), { cache: 'no-store' })
    if (!res.ok) return undefined
    const json = (await res.json()) as { url?: string }
    if (!json.url) return undefined
    return normalizeBase(String(json.url))
  } catch {
    return undefined
  }
}

async function probeHealth(base: string): Promise<boolean> {
  try {
    const res = await fetch(`${base}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function resolveCloudApiBase(opts?: { force?: boolean }): Promise<string | undefined> {
  const fromEnv = bakedEnvBase()
  if (fromEnv) {
    cachedBase = fromEnv
    return cachedBase
  }

  const force = opts?.force === true
  const fresh = Date.now() - lastDiscoveryAt < DISCOVERY_TTL_MS
  if (!force && cachedBase && fresh) {
    return cachedBase
  }

  if (!force && discovery) return discovery

  discovery = (async () => {
    const url = await fetchUrlJson()
    if (!url) {
      clearDiscovery()
      return undefined
    }
    const ok = await probeHealth(url)
    if (!ok) {
      clearDiscovery()
      return undefined
    }
    cachedBase = url
    lastDiscoveryAt = Date.now()
    return cachedBase
  })()

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

/** Drop cached tunnel URL (e.g. after failed request) and rediscover. */
export async function refreshCloudApiBase(): Promise<string | undefined> {
  clearDiscovery()
  return resolveCloudApiBase({ force: true })
}

export async function cloudFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const run = async (base: string) => {
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

  let base = await resolveCloudApiBase()
  if (!base) throw new Error('クラウド API が設定されていません')

  try {
    return await run(base)
  } catch (first) {
    // Tunnel may have rotated — rediscover once
    const next = await refreshCloudApiBase()
    if (!next || next === base) throw first
    return await run(next)
  }
}
