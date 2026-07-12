/**
 * Download wiki sprites into public/sprites/{id}.png
 * so the app never hotlinks external CDNs at runtime.
 *
 * Usage:
 *   node scripts/download-sprites.mjs
 *   node scripts/download-sprites.mjs --force
 *   node scripts/download-sprites.mjs --retry-failed
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'sprites')
const MANIFEST = join(ROOT, 'public', 'sprites', 'manifest.json')
const SPRITES_JSON = join(ROOT, 'public', 'data', 'sprites.json')
const CONCURRENCY = 3
const UA = 'TerrariaCompanionLocal/1.0 (local asset mirror; personal offline app)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function parseSpriteNames() {
  const raw = JSON.parse(await readFile(SPRITES_JSON, 'utf8'))
  if (!raw || typeof raw !== 'object') throw new Error('sprites.json is empty')
  return raw
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function fetchPng(url, retries = 6) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'image/png,*/*' },
        redirect: 'follow',
      })
      if (res.status === 429 || res.status === 503) {
        await sleep(2000 * (attempt + 1) + Math.random() * 800)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 50 || buf[0] !== 0x89) {
        throw new Error(`not a png (${buf.length} bytes)`)
      }
      return buf
    } catch (e) {
      if (attempt === retries - 1) throw e
      await sleep(800 * (attempt + 1))
    }
  }
  throw new Error('rate limited')
}

async function downloadOne(id, wikiName, force = false) {
  const dest = join(OUT_DIR, `${id}.png`)
  if (!force && (await exists(dest))) {
    return { id, status: 'skip' }
  }

  const filePathUrl = `https://terraria.wiki.gg/wiki/Special:FilePath/${encodeURIComponent(wikiName)}.png`
  const buf = await fetchPng(filePathUrl)
  await writeFile(dest, buf)
  await sleep(350)
  return { id, status: 'ok', bytes: buf.length }
}

async function mapPool(items, limit, fn) {
  const results = []
  let i = 0
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const idx = i++
        results[idx] = await fn(items[idx], idx)
      }
    }),
  )
  return results
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const names = await parseSpriteNames()
  let entries = Object.entries(names)
  const force = process.argv.includes('--force')
  const retryFailed = process.argv.includes('--retry-failed')

  if (retryFailed) {
    const missing = []
    for (const [id, wikiName] of entries) {
      if (!(await exists(join(OUT_DIR, `${id}.png`)))) missing.push([id, wikiName])
    }
    entries = missing
    console.log(`Retrying ${entries.length} missing sprites…`)
  } else {
    console.log(`Downloading ${entries.length} sprites -> ${OUT_DIR}`)
  }

  let ok = 0
  let skip = 0
  let fail = 0
  const failures = []

  await mapPool(entries, CONCURRENCY, async ([id, wikiName]) => {
    try {
      const r = await downloadOne(id, wikiName, force)
      if (r.status === 'skip') {
        skip++
        process.stdout.write('.')
      } else {
        ok++
        process.stdout.write('+')
      }
      return r
    } catch (e) {
      fail++
      failures.push({ id, wikiName, error: String(e.message || e) })
      process.stdout.write('x')
      return { id, status: 'fail' }
    }
  })

  // Re-scan disk for final counts
  const allIds = Object.keys(names)
  let onDisk = 0
  for (const id of allIds) {
    if (await exists(join(OUT_DIR, `${id}.png`))) onDisk++
  }
  const stillMissing = []
  for (const [id, wikiName] of Object.entries(names)) {
    if (!(await exists(join(OUT_DIR, `${id}.png`)))) {
      stillMissing.push({ id, wikiName, error: failures.find((f) => f.id === id)?.error || 'missing' })
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    count: allIds.length,
    onDisk,
    ok,
    skip,
    fail,
    failures: stillMissing,
    ids: allIds.sort(),
  }
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2))

  // Keep a fast runtime allow-list of sprites that actually exist on disk.
  const available = []
  for (const id of allIds) {
    if (await exists(join(OUT_DIR, `${id}.png`))) available.push(id)
  }
  // Also include any extra pngs not in the map (defensive).
  try {
    const { readdir } = await import('node:fs/promises')
    for (const f of await readdir(OUT_DIR)) {
      if (!f.endsWith('.png')) continue
      const id = f.slice(0, -4)
      if (!available.includes(id)) available.push(id)
    }
  } catch {}
  await mkdir(join(ROOT, 'public', 'data'), { recursive: true })
  await writeFile(join(ROOT, 'public', 'data', 'sprite-available.json'), JSON.stringify(available))

  console.log(`\nDone. ok=${ok} skip=${skip} fail=${fail} onDisk=${onDisk}/${allIds.length} available=${available.length}`)
  if (stillMissing.length) {
    console.log(`Still missing ${stillMissing.length}. Re-run: node scripts/download-sprites.mjs --retry-failed`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
