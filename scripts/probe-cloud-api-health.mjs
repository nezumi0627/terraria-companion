/**
 * Probe cloud API /health (for Actions tunnel rotation loop).
 * Usage: node scripts/probe-cloud-api-health.mjs <base-url>
 */
const base = String(process.argv[2] || '').trim().replace(/\/+$/, '')
if (!base) {
  console.error('Usage: node scripts/probe-cloud-api-health.mjs <base-url>')
  process.exit(1)
}

try {
  const res = await fetch(`${base}/health`, {
    method: 'GET',
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) {
    console.error('Health failed:', res.status)
    process.exit(1)
  }
  const json = await res.json()
  if (!json?.ok) {
    console.error('Health body not ok')
    process.exit(1)
  }
  console.log('OK', base)
} catch (e) {
  console.error('Health error:', e instanceof Error ? e.message : e)
  process.exit(1)
}
