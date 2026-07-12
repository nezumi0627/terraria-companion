/**
 * GitHub Contents API helpers for per-user save files under users/{id}.json
 */
export const GITHUB_REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO || 'nezumi0627/terraria-companion'

/** Contents: Write（users/ 配下の読み書き用）。未設定時は FEEDBACK トークンにフォールバック */
export function githubDataToken(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_GITHUB_DATA_TOKEN ||
    process.env.NEXT_PUBLIC_FEEDBACK_GITHUB_TOKEN ||
    undefined
  )
}

const API = 'https://api.github.com'
const API_VER = '2022-11-28'

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

export interface GhFileResult {
  file: UserFile
  sha: string
}

function authHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': API_VER,
  }
}

function encodeContent(obj: unknown): string {
  const json = JSON.stringify(obj, null, 2)
  // btoa needs binary string; handle unicode
  return btoa(unescape(encodeURIComponent(json)))
}

function decodeContent(b64: string): string {
  return decodeURIComponent(escape(atob(b64)))
}

export async function fetchUserFile(userId: string): Promise<GhFileResult | null> {
  const path = userFilePath(userId)
  const token = githubDataToken()
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VER,
  }
  if (token) Object.assign(headers, { Authorization: `Bearer ${token}` })

  const res = await fetch(`${API}/repos/${GITHUB_REPO}/contents/${path}`, { headers })
  if (res.status === 404) return null
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`読み込み失敗（${res.status}）${t ? `: ${t.slice(0, 100)}` : ''}`)
  }
  const json = (await res.json()) as { content?: string; sha?: string; encoding?: string }
  if (!json.content || !json.sha) throw new Error('ユーザーファイルの形式が不正です')
  const raw = decodeContent(json.content.replace(/\n/g, ''))
  const file = JSON.parse(raw) as UserFile
  return { file, sha: json.sha }
}

export async function putUserFile(
  userFile: UserFile,
  sha?: string,
): Promise<{ sha: string }> {
  const token = githubDataToken()
  if (!token) throw new Error('GitHub データ用トークンが設定されていません')

  const path = userFilePath(userFile.id)
  const body: Record<string, unknown> = {
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
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`保存失敗（${res.status}）${t ? `: ${t.slice(0, 120)}` : ''}`)
  }
  const json = (await res.json()) as { content?: { sha?: string } }
  const nextSha = json.content?.sha
  if (!nextSha) throw new Error('保存後の sha が取得できませんでした')
  return { sha: nextSha }
}
