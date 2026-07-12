/**
 * Fast Japan Wiki wikitext fetcher.
 * Uses action=query batch revisions (50 titles/request) + limited concurrency.
 */
import { matchRedirectTarget } from './wiki-parse.mjs'

const JP = 'https://terraria.arcenserv.info/w/api.php'
const UA = 'TerrariaCompanionLocal/1.0 (batch wikitext fetch)'
const BATCH_SIZE = Number(process.env.WIKI_BATCH_SIZE || 50)
const CONCURRENCY = Number(process.env.WIKI_FETCH_CONCURRENCY || 8)
const MAX_REDIRECT_DEPTH = Number(process.env.WIKI_REDIRECT_DEPTH || 3)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function wikitextFromPage(page) {
  if (!page || page.missing != null) return ''
  const rev = page.revisions?.[0]
  return rev?.slots?.main?.['*'] || rev?.['*'] || ''
}

async function mwGet(params, attempt = 0) {
  const url = new URL(JP)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  url.searchParams.set('format', 'json')
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if ((res.status === 429 || res.status === 503) && attempt < 6) {
    await sleep(400 * (attempt + 1))
    return mwGet(params, attempt + 1)
  }
  if (!res.ok) throw new Error(`JP wiki ${res.status}`)
  return res.json()
}

/** Fetch wikitext for up to 50 titles in one API call. */
export async function fetchWikitextBatch(titles) {
  if (!titles.length) return new Map()
  const json = await mwGet({
    action: 'query',
    prop: 'revisions',
    rvslots: 'main',
    rvprop: 'content',
    titles: titles.join('|'),
  })
  const out = new Map()
  for (const page of Object.values(json.query?.pages || {})) {
    if (page?.title) out.set(page.title, wikitextFromPage(page))
  }
  return out
}

async function runPool(tasks, concurrency) {
  const results = new Array(tasks.length)
  let next = 0
  async function worker() {
    while (next < tasks.length) {
      const i = next++
      results[i] = await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker))
  return results
}

/**
 * Fetch wikitext for many titles with redirect resolution.
 * Returns Map<requestedTitle, { wt, redirectChain }>.
 */
export async function fetchWikitextResolved(titles, options = {}) {
  const batchSize = options.batchSize || BATCH_SIZE
  const concurrency = options.concurrency || CONCURRENCY
  const maxDepth = options.maxRedirectDepth ?? MAX_REDIRECT_DEPTH

  const unique = [...new Set(titles.filter(Boolean))]
  /** @type {Map<string, string>} */
  const cache = new Map()

  async function loadTitles(list) {
    const missing = [...new Set(list.filter((t) => t && !cache.has(t)))]
    if (!missing.length) return
    const batches = chunk(missing, batchSize)
    const tasks = batches.map(
      (batch) => () =>
        fetchWikitextBatch(batch).then((m) => {
          for (const [k, v] of m) cache.set(k, v)
        }),
    )
    await runPool(tasks, concurrency)
  }

  await loadTitles(unique)

  for (let depth = 0; depth < maxDepth; depth++) {
    const targets = new Set()
    for (const title of cache.keys()) {
      const redir = matchRedirectTarget(cache.get(title))
      if (redir && !cache.has(redir)) targets.add(redir)
    }
    if (!targets.size) break
    await loadTitles([...targets])
  }

  function resolveOne(title, depth = 0, chain = []) {
    const raw = cache.get(title) || ''
    const redir = matchRedirectTarget(raw)
    if (redir && depth < maxDepth) {
      if (chain.includes(redir)) return { wt: raw, redirectChain: chain }
      return resolveOne(redir, depth + 1, [...chain, redir])
    }
    return { wt: redir ? cache.get(redir) || raw : raw, redirectChain: chain }
  }

  const out = new Map()
  for (const title of unique) out.set(title, resolveOne(title))
  return out
}

/** Single title helper (uses batch internally). */
export async function fetchWikitextOne(title) {
  const m = await fetchWikitextResolved([title])
  return m.get(title) || { wt: '', redirectChain: [] }
}

/** Category member listing (paginated). */
export async function fetchCategoryMembers(cmtitle) {
  const titles = []
  let cmcontinue
  for (let guard = 0; guard < 40; guard++) {
    const params = {
      action: 'query',
      list: 'categorymembers',
      cmtitle,
      cmlimit: 500,
      cmtype: 'page',
    }
    if (cmcontinue) params.cmcontinue = cmcontinue
    const json = await mwGet(params)
    for (const m of json.query?.categorymembers || []) {
      if (m?.title) titles.push(m.title)
    }
    cmcontinue = json.continue?.cmcontinue
    if (!cmcontinue) break
  }
  return titles
}

/** Parse API for hub pages that need outbound links. */
export async function fetchParseLinks(title) {
  const json = await mwGet({ action: 'parse', page: title, prop: 'links|wikitext' })
  if (json.error) return { links: [], wt: '' }
  const wt = json.parse?.wikitext?.['*'] || ''
  const links = (json.parse?.links || []).map((l) => l['*']).filter(Boolean)
  return { links, wt }
}
