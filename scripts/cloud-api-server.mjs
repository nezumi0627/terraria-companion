/**
 * Node HTTP server mirroring workers/cloud-api (for Actions / local + cloudflared).
 * Env: GH_TOKEN (required), GITHUB_REPO, ALLOWED_ORIGINS, PORT
 */
import http from 'node:http'

const API = 'https://api.github.com'
const API_VER = '2022-11-28'
const PORT = Number(process.env.PORT || 8787)
const GITHUB_REPO = process.env.GITHUB_REPO || 'nezumi0627/terraria-companion'
const GH_TOKEN = process.env.GH_TOKEN || process.env.CLOUD_API_GITHUB_TOKEN || ''
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  'https://nezumi0627.github.io,http://localhost:3000,http://127.0.0.1:3000'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function assertValidUserId(id) {
  const t = String(id || '').trim()
  if (t.length < 3 || t.length > 24) return 'IDは3〜24文字にしてください'
  if (!/^[a-zA-Z0-9_-]+$/.test(t)) return 'IDは英数字・ハイフン・アンダースコアのみです'
  if (/^(con|prn|aux|nul|users|admin)$/i.test(t)) return 'そのIDは使えません'
  return null
}

function assertValidPinHash(pinHash) {
  if (!/^[a-f0-9]{64}$/i.test(String(pinHash || ''))) return '認証情報が不正です'
  return null
}

function userFilePath(userId) {
  return `users/${userId.trim().toLowerCase()}.json`
}

function corsHeaders(origin) {
  const ok =
    !origin ||
    ALLOWED_ORIGINS.includes(origin) ||
    ALLOWED_ORIGINS.includes('*') ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  const allow = ok ? origin || ALLOWED_ORIGINS[0] || '*' : ALLOWED_ORIGINS[0] || 'null'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function send(res, status, data, cors) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...cors,
  })
  res.end(body)
}

function encodeContent(obj) {
  return Buffer.from(JSON.stringify(obj, null, 2), 'utf8').toString('base64')
}

function decodeContent(b64) {
  return Buffer.from(String(b64).replace(/\n/g, ''), 'base64').toString('utf8')
}

function ghHeaders(extra = {}) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${GH_TOKEN}`,
    'X-GitHub-Api-Version': API_VER,
    'User-Agent': 'terraria-companion-api',
    ...extra,
  }
}

async function fetchUserFile(userId) {
  const path = userFilePath(userId)
  const res = await fetch(`${API}/repos/${GITHUB_REPO}/contents/${path}`, {
    headers: ghHeaders(),
  })
  if (res.status === 404) return null
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`読み込み失敗（${res.status}）${t ? `: ${t.slice(0, 100)}` : ''}`)
  }
  const body = await res.json()
  if (!body.content || !body.sha) throw new Error('ユーザーファイルの形式が不正です')
  return { file: JSON.parse(decodeContent(body.content)), sha: body.sha }
}

async function putUserFile(userFile, sha) {
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
  const res = await fetch(`${API}/repos/${GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: ghHeaders({ 'Content-Type': 'application/json' }),
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

const buckets = new Map()
function rateLimit(ip, key, limit, windowMs) {
  const now = Date.now()
  const k = `${key}:${ip}`
  let b = buckets.get(k)
  if (!b || now - b.start > windowMs) {
    b = { start: now, count: 0 }
    buckets.set(k, b)
  }
  b.count += 1
  return b.count <= limit
}

async function readJson(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return null
  return JSON.parse(raw)
}

const CATEGORY_LABEL = { bug: 'バグ報告', idea: 'アイデア', other: 'その他' }

async function handle(req, res) {
  const origin = req.headers.origin || ''
  const cors = corsHeaders(origin)
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    res.end()
    return
  }

  if (!GH_TOKEN) {
    send(res, 503, { ok: false, error: 'サーバ設定が未完了です（GH_TOKEN）' }, cors)
    return
  }

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const path = url.pathname.replace(/\/+$/, '') || '/'

    if (req.method === 'GET' && (path === '/' || path === '/health')) {
      send(res, 200, { ok: true, service: 'terraria-companion-api' }, cors)
      return
    }

    if (req.method === 'POST' && path === '/register') {
      if (!rateLimit(ip, 'reg', 10, 60_000)) {
        send(res, 429, { ok: false, error: 'リクエストが多すぎます。しばらく待ってください' }, cors)
        return
      }
      const body = await readJson(req)
      const idErr = assertValidUserId(body?.id)
      if (idErr) return send(res, 400, { ok: false, error: idErr }, cors)
      const pinErr = assertValidPinHash(body?.pinHash)
      if (pinErr) return send(res, 400, { ok: false, error: pinErr }, cors)
      if (!body.state || typeof body.state !== 'object') {
        return send(res, 400, { ok: false, error: '進行データが不正です' }, cors)
      }
      const userId = String(body.id).trim().toLowerCase()
      if (await fetchUserFile(userId)) {
        return send(res, 409, { ok: false, error: 'そのIDはすでに使われています' }, cors)
      }
      const file = {
        id: userId,
        pinHash: String(body.pinHash).toLowerCase(),
        updatedAt: Date.now(),
        state: body.state,
      }
      const { sha } = await putUserFile(file)
      return send(res, 200, { ok: true, userId, sha, updatedAt: file.updatedAt, state: file.state }, cors)
    }

    if (req.method === 'POST' && path === '/login') {
      if (!rateLimit(ip, 'login', 20, 60_000)) {
        return send(res, 429, { ok: false, error: 'リクエストが多すぎます。しばらく待ってください' }, cors)
      }
      const body = await readJson(req)
      const idErr = assertValidUserId(body?.id)
      if (idErr) return send(res, 400, { ok: false, error: idErr }, cors)
      const pinErr = assertValidPinHash(body?.pinHash)
      if (pinErr) return send(res, 400, { ok: false, error: pinErr }, cors)
      const userId = String(body.id).trim().toLowerCase()
      const got = await fetchUserFile(userId)
      if (!got) return send(res, 404, { ok: false, error: 'IDが見つかりません。新規登録してください' }, cors)
      await new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 200)))
      if (String(body.pinHash).toLowerCase() !== String(got.file.pinHash).toLowerCase()) {
        return send(res, 401, { ok: false, error: 'パスワード（4桁）が違います' }, cors)
      }
      return send(
        res,
        200,
        { ok: true, userId, sha: got.sha, updatedAt: got.file.updatedAt, state: got.file.state || {} },
        cors,
      )
    }

    if (req.method === 'PUT' && path === '/save') {
      if (!rateLimit(ip, 'save', 60, 60_000)) {
        return send(res, 429, { ok: false, error: 'リクエストが多すぎます。しばらく待ってください' }, cors)
      }
      const body = await readJson(req)
      const idErr = assertValidUserId(body?.id)
      if (idErr) return send(res, 400, { ok: false, error: idErr }, cors)
      const pinErr = assertValidPinHash(body?.pinHash)
      if (pinErr) return send(res, 400, { ok: false, error: pinErr }, cors)
      if (!body.state || typeof body.state !== 'object') {
        return send(res, 400, { ok: false, error: '進行データが不正です' }, cors)
      }
      const userId = String(body.id).trim().toLowerCase()
      const got = await fetchUserFile(userId)
      if (!got) return send(res, 404, { ok: false, error: 'ユーザーが見つかりません' }, cors)
      if (String(body.pinHash).toLowerCase() !== String(got.file.pinHash).toLowerCase()) {
        return send(res, 401, { ok: false, error: '認証に失敗しました' }, cors)
      }
      const file = {
        id: userId,
        pinHash: got.file.pinHash,
        updatedAt: Date.now(),
        state: body.state,
      }
      try {
        const { sha } = await putUserFile(file, body.sha || got.sha)
        return send(res, 200, { ok: true, sha, updatedAt: file.updatedAt }, cors)
      } catch (e) {
        const msg = e instanceof Error ? e.message : '保存に失敗しました'
        if (msg.includes('409') || msg.includes('422')) {
          const fresh = await fetchUserFile(userId)
          if (fresh) {
            const { sha } = await putUserFile(file, fresh.sha)
            return send(res, 200, { ok: true, sha, updatedAt: file.updatedAt }, cors)
          }
        }
        throw e
      }
    }

    if (req.method === 'POST' && path === '/feedback') {
      if (!rateLimit(ip, 'fb', 8, 60_000)) {
        return send(res, 429, { ok: false, error: 'リクエストが多すぎます。しばらく待ってください' }, cors)
      }
      const body = await readJson(req)
      if (body?.website) return send(res, 200, { ok: true, url: null }, cors)
      const category = ['bug', 'idea', 'other'].includes(body?.category) ? body.category : 'other'
      const title = String(body?.title || '').trim().slice(0, 120)
      const text = String(body?.body || '').trim()
      if (!title || text.length < 5) {
        return send(res, 400, { ok: false, error: 'タイトルと内容（5文字以上）を入力してください' }, cors)
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
      const ghRes = await fetch(`${API}/repos/${GITHUB_REPO}/issues`, {
        method: 'POST',
        headers: ghHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title: issueTitle, body: issueBody, labels: [...new Set(labels)] }),
      })
      if (!ghRes.ok) {
        const t = await ghRes.text().catch(() => '')
        return send(
          res,
          502,
          {
            ok: false,
            error: `Issue の作成に失敗しました（${ghRes.status}）${t ? `: ${t.slice(0, 120)}` : ''}`,
          },
          cors,
        )
      }
      const out = await ghRes.json()
      return send(res, 200, { ok: true, url: out.html_url || null }, cors)
    }

    send(res, 404, { ok: false, error: 'Not found' }, cors)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'サーバエラー'
    send(res, 500, { ok: false, error: msg }, cors)
  }
}

if (!GH_TOKEN) {
  console.error('GH_TOKEN is required')
  process.exit(1)
}

http.createServer((req, res) => {
  void handle(req, res)
}).listen(PORT, () => {
  console.log(`terraria-companion-api listening on :${PORT}`)
})
