/**
 * Terraria Companion cloud API
 * Holds GH_TOKEN (GitHub PAT) server-side; static Pages never see it.
 *
 * POST /register  { id, pinHash, state }
 * POST /login     { id, pinHash }
 * PUT  /save      { id, pinHash, state, sha? }
 * POST /feedback  { category, title, body, website?, page?, ua? }
 * GET  /health
 */

const API = 'https://api.github.com'
const API_VER = '2022-11-28'

/** @param {string} id */
function assertValidUserId(id) {
  const t = String(id || '').trim()
  if (t.length < 3 || t.length > 24) return 'IDは3〜24文字にしてください'
  if (!/^[a-zA-Z0-9_-]+$/.test(t)) return 'IDは英数字・ハイフン・アンダースコアのみです'
  if (/^(con|prn|aux|nul|users|admin)$/i.test(t)) return 'そのIDは使えません'
  return null
}

/** @param {string} pinHash */
function assertValidPinHash(pinHash) {
  if (!/^[a-f0-9]{64}$/i.test(String(pinHash || ''))) return '認証情報が不正です'
  return null
}

function userFilePath(userId) {
  return `users/${userId.trim().toLowerCase()}.json`
}

function corsHeaders(origin, allowed) {
  const list = String(allowed || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const ok =
    !origin ||
    list.length === 0 ||
    list.includes(origin) ||
    list.includes('*') ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  const allow = ok ? origin || list[0] || '*' : list[0] || 'null'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  })
}

function encodeContent(obj) {
  const jsonStr = JSON.stringify(obj, null, 2)
  const bytes = new TextEncoder().encode(jsonStr)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function decodeContent(b64) {
  const bin = atob(b64.replace(/\n/g, ''))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

async function ghHeaders(token, extra = {}) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': API_VER,
    'User-Agent': 'terraria-companion-api',
    ...extra,
  }
}

async function fetchUserFile(env, userId) {
  const path = userFilePath(userId)
  const res = await fetch(`${API}/repos/${env.GITHUB_REPO}/contents/${path}`, {
    headers: await ghHeaders(env.GH_TOKEN),
  })
  if (res.status === 404) return null
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`読み込み失敗（${res.status}）${t ? `: ${t.slice(0, 100)}` : ''}`)
  }
  const body = await res.json()
  if (!body.content || !body.sha) throw new Error('ユーザーファイルの形式が不正です')
  const file = JSON.parse(decodeContent(body.content))
  return { file, sha: body.sha }
}

async function putUserFile(env, userFile, sha) {
  const path = userFilePath(userFile.id)
  const body = {
    message: `chore(users): sync ${userFile.id}`,
    content: encodeContent(userFile),
    committer: {
      name: 'terraria-companion',
      email: '41898282+github-actions[bot]@users.noreply.github.com',
    },
  }
  if (sha) body.sha = sha

  const res = await fetch(`${API}/repos/${env.GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: await ghHeaders(env.GH_TOKEN, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`保存失敗（${res.status}）${t ? `: ${t.slice(0, 120)}` : ''}`)
  }
  const out = await res.json()
  const nextSha = out.content?.sha
  if (!nextSha) throw new Error('保存後の sha が取得できませんでした')
  return { sha: nextSha }
}

/** Simple IP rate limit via Cache API (best-effort per colo) */
async function rateLimit(request, keyPrefix, limit, windowSec) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const bucket = Math.floor(Date.now() / (windowSec * 1000))
  const key = new Request(`https://rl.internal/${keyPrefix}/${ip}/${bucket}`)
  const cache = caches.default
  const hit = await cache.match(key)
  let count = hit ? Number(await hit.text()) : 0
  if (count >= limit) return false
  count += 1
  await cache.put(
    key,
    new Response(String(count), {
      headers: { 'Cache-Control': `max-age=${windowSec}`, 'Content-Type': 'text/plain' },
    }),
  )
  return true
}

async function handleRegister(request, env, cors) {
  if (!(await rateLimit(request, 'reg', 10, 60))) {
    return json({ ok: false, error: 'リクエストが多すぎます。しばらく待ってください' }, 429, cors)
  }
  const body = await request.json().catch(() => null)
  if (!body) return json({ ok: false, error: '不正なリクエストです' }, 400, cors)

  const idErr = assertValidUserId(body.id)
  if (idErr) return json({ ok: false, error: idErr }, 400, cors)
  const pinErr = assertValidPinHash(body.pinHash)
  if (pinErr) return json({ ok: false, error: pinErr }, 400, cors)
  if (!body.state || typeof body.state !== 'object') {
    return json({ ok: false, error: '進行データが不正です' }, 400, cors)
  }

  const userId = String(body.id).trim().toLowerCase()
  const existing = await fetchUserFile(env, userId)
  if (existing) return json({ ok: false, error: 'そのIDはすでに使われています' }, 409, cors)

  const file = {
    id: userId,
    pinHash: String(body.pinHash).toLowerCase(),
    updatedAt: Date.now(),
    state: body.state,
  }
  const { sha } = await putUserFile(env, file)
  return json({ ok: true, userId, sha, updatedAt: file.updatedAt, state: file.state }, 200, cors)
}

async function handleLogin(request, env, cors) {
  if (!(await rateLimit(request, 'login', 20, 60))) {
    return json({ ok: false, error: 'リクエストが多すぎます。しばらく待ってください' }, 429, cors)
  }
  const body = await request.json().catch(() => null)
  if (!body) return json({ ok: false, error: '不正なリクエストです' }, 400, cors)

  const idErr = assertValidUserId(body.id)
  if (idErr) return json({ ok: false, error: idErr }, 400, cors)
  const pinErr = assertValidPinHash(body.pinHash)
  if (pinErr) return json({ ok: false, error: pinErr }, 400, cors)

  const userId = String(body.id).trim().toLowerCase()
  const got = await fetchUserFile(env, userId)
  if (!got) return json({ ok: false, error: 'IDが見つかりません。新規登録してください' }, 404, cors)

  // Constant-ish delay to slow PIN brute force
  await new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 200)))

  if (String(body.pinHash).toLowerCase() !== String(got.file.pinHash).toLowerCase()) {
    return json({ ok: false, error: 'パスワード（4桁）が違います' }, 401, cors)
  }

  return json(
    {
      ok: true,
      userId,
      sha: got.sha,
      updatedAt: got.file.updatedAt,
      state: got.file.state || {},
    },
    200,
    cors,
  )
}

async function handleSave(request, env, cors) {
  if (!(await rateLimit(request, 'save', 60, 60))) {
    return json({ ok: false, error: 'リクエストが多すぎます。しばらく待ってください' }, 429, cors)
  }
  const body = await request.json().catch(() => null)
  if (!body) return json({ ok: false, error: '不正なリクエストです' }, 400, cors)

  const idErr = assertValidUserId(body.id)
  if (idErr) return json({ ok: false, error: idErr }, 400, cors)
  const pinErr = assertValidPinHash(body.pinHash)
  if (pinErr) return json({ ok: false, error: pinErr }, 400, cors)
  if (!body.state || typeof body.state !== 'object') {
    return json({ ok: false, error: '進行データが不正です' }, 400, cors)
  }

  const userId = String(body.id).trim().toLowerCase()
  const got = await fetchUserFile(env, userId)
  if (!got) return json({ ok: false, error: 'ユーザーが見つかりません' }, 404, cors)
  if (String(body.pinHash).toLowerCase() !== String(got.file.pinHash).toLowerCase()) {
    return json({ ok: false, error: '認証に失敗しました' }, 401, cors)
  }

  const file = {
    id: userId,
    pinHash: got.file.pinHash,
    updatedAt: Date.now(),
    state: body.state,
  }

  try {
    const { sha } = await putUserFile(env, file, body.sha || got.sha)
    return json({ ok: true, sha, updatedAt: file.updatedAt }, 200, cors)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存に失敗しました'
    if (msg.includes('409') || msg.includes('422')) {
      const fresh = await fetchUserFile(env, userId)
      if (fresh) {
        const { sha } = await putUserFile(env, file, fresh.sha)
        return json({ ok: true, sha, updatedAt: file.updatedAt }, 200, cors)
      }
    }
    throw e
  }
}

const CATEGORY_LABEL = { bug: 'バグ報告', idea: 'アイデア', other: 'その他' }

async function handleFeedback(request, env, cors) {
  if (!(await rateLimit(request, 'fb', 8, 60))) {
    return json({ ok: false, error: 'リクエストが多すぎます。しばらく待ってください' }, 429, cors)
  }
  const body = await request.json().catch(() => null)
  if (!body) return json({ ok: false, error: '不正なリクエストです' }, 400, cors)

  // honeypot
  if (body.website) return json({ ok: true, url: null }, 200, cors)

  const category = ['bug', 'idea', 'other'].includes(body.category) ? body.category : 'other'
  const title = String(body.title || '').trim().slice(0, 120)
  const text = String(body.body || '').trim()
  if (!title || text.length < 5) {
    return json({ ok: false, error: 'タイトルと内容（5文字以上）を入力してください' }, 400, cors)
  }

  const issueTitle = `[フィードバック/${CATEGORY_LABEL[category]}] ${title}`
  const issueBody = [
    `### 種別`,
    CATEGORY_LABEL[category],
    '',
    `### 内容`,
    text,
    '',
    `---`,
    `- 送信元: アプリ内フィードバック（cloud-api）`,
    `- URL: ${body.page || ''}`,
    `- UA: ${body.ua || ''}`,
  ].join('\n')

  const labels = [
    'feedback',
    category === 'bug' ? 'bug' : category === 'idea' ? 'enhancement' : 'feedback',
  ]

  const res = await fetch(`${API}/repos/${env.GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: await ghHeaders(env.GH_TOKEN, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ title: issueTitle, body: issueBody, labels: [...new Set(labels)] }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    return json(
      {
        ok: false,
        error: `Issue の作成に失敗しました（${res.status}）${t ? `: ${t.slice(0, 120)}` : ''}`,
      },
      502,
      cors,
    )
  }
  const out = await res.json()
  return json({ ok: true, url: out.html_url || null }, 200, cors)
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    if (!env.GH_TOKEN) {
      return json({ ok: false, error: 'サーバ設定が未完了です（GH_TOKEN）' }, 503, cors)
    }

    try {
      const url = new URL(request.url)
      const path = url.pathname.replace(/\/+$/, '') || '/'

      if (request.method === 'GET' && (path === '/' || path === '/health')) {
        return json({ ok: true, service: 'terraria-companion-api' }, 200, cors)
      }
      if (request.method === 'POST' && path === '/register') return handleRegister(request, env, cors)
      if (request.method === 'POST' && path === '/login') return handleLogin(request, env, cors)
      if (request.method === 'PUT' && path === '/save') return handleSave(request, env, cors)
      if (request.method === 'POST' && path === '/feedback') return handleFeedback(request, env, cors)

      return json({ ok: false, error: 'Not found' }, 404, cors)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'サーバエラー'
      return json({ ok: false, error: msg }, 500, cors)
    }
  },
}
