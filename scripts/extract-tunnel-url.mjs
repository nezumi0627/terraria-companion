/**
 * Extract trycloudflare.com URL from cloudflared quick-tunnel log.
 * Skips documentation URLs (github.com, developers.cloudflare.com).
 *
 * Usage: node scripts/extract-tunnel-url.mjs /tmp/cloudflared.log
 */
import { readFileSync } from 'node:fs'

const logPath = process.argv[2]
if (!logPath) {
  console.error('Usage: node scripts/extract-tunnel-url.mjs <log-file>')
  process.exit(1)
}

const log = readFileSync(logPath, 'utf8')
const lines = log.split(/\r?\n/)

const DOC_HOST =
  /(?:github\.com|developers\.cloudflare\.com|cloudflare\.com\/docs|pkg\.go\.dev)/i

function isTunnelHost(hostname) {
  return hostname.endsWith('.trycloudflare.com')
}

function pickUrl(raw) {
  try {
    const u = new URL(raw)
    if (DOC_HOST.test(u.hostname) || DOC_HOST.test(u.href)) return null
    if (isTunnelHost(u.hostname)) return u.origin
    return null
  } catch {
    return null
  }
}

// Prefer lines after "Visit it at" / quick tunnel banner
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  if (/Visit it at|quick Tunnel has been created|trycloudflare\.com/i.test(line)) {
    const onLine = line.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g) || []
    for (const raw of onLine) {
      const url = pickUrl(raw)
      if (url) {
        console.log(url)
        process.exit(0)
      }
    }
    const next = lines[i + 1] || ''
    const nextMatch = next.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/)
    if (nextMatch) {
      const url = pickUrl(nextMatch[0])
      if (url) {
        console.log(url)
        process.exit(0)
      }
    }
  }
}

// Fallback: any trycloudflare URL in log
const all = log.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g) || []
for (const raw of all) {
  const url = pickUrl(raw)
  if (url) {
    console.log(url)
    process.exit(0)
  }
}

console.error('No tunnel URL found in log')
process.exit(1)
