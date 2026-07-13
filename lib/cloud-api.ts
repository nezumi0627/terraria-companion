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

const DISCOVERY_TTL_MS = 45 * 1000
const DISCOVERY_TTL_NEAR_EXPIRY_MS = 15 * 1000
const DISCOVERY_TTL_DURABLE_MS = 30 * 60 * 1000
const EXPIRY_BUFFER_MS = 5 * 60 * 1000

type UrlMeta = {
  url?: string
  source?: string
  expiresAt?: number
  updatedAt?: number
  rotationLoop?: boolean
}

let lastMeta: UrlMeta | null = null

function discoveryTtl(base: string): number {
  if (isDurableApiUrl(base)) return DISCOVERY_TTL_DURABLE_MS
  const exp = lastMeta?.expiresAt
  if (exp && Date.now() > exp - EXPIRY_BUFFER_MS) return DISCOVERY_TTL_NEAR_EXPIRY_MS
  return DISCOVERY_TTL_MS
}

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

/** workers.dev / custom domain — safe to cache and bake into Pages builds. */
export function isDurableApiUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    if (host.endsWith('.workers.dev')) return true
    if (host.endsWith('.nezumi0627.github.io')) return false
    if (isEphemeralApiUrl(url)) return false
    return host.includes('.') && !host.endsWith('github.io')
  } catch {
    return false
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
  lastMeta = null
}

async function fetchUrlJson(): Promise<UrlMeta | null> {
  if (typeof window === 'undefined') return null

  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO?.trim() || 'nezumi0627/terraria-companion'
  const bust = Date.now()
  const candidates = [
    `https://raw.githubusercontent.com/${repo}/main/public/cloud-api-url.json?t=${bust}`,
    `${publicUrl('/cloud-api-url.json')}?t=${bust}`,
  ]

  for (const src of candidates) {
    try {
      const res = await fetch(src, { cache: 'no-store' })
      if (!res.ok) continue
      const json = (await res.json()) as UrlMeta
      if (!json.url) continue
      return json
    } catch {
      /* try next */
    }
  }
  return null
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
  const ttl = cachedBase ? discoveryTtl(cachedBase) : DISCOVERY_TTL_MS
  const fresh = Date.now() - lastDiscoveryAt < ttl
  if (!force && cachedBase && fresh) {
    return cachedBase
  }

  if (!force && discovery) return discovery

  discovery = (async () => {
    const meta = await fetchUrlJson()
    lastMeta = meta
    const url = meta?.url ? normalizeBase(String(meta.url)) : undefined
    if (!url) {
      clearDiscovery()
      return undefined
    }
    if (meta?.expiresAt && Date.now() > meta.expiresAt) {
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
