/**
 * Publish public/cloud-api-url.json via GitHub Contents API (no git push conflicts).
 *
 * Env: API_URL (required), API_SOURCE (workers-dev | actions-tunnel),
 *      GH_TOKEN or CLOUD_API_GITHUB_TOKEN, GITHUB_REPO
 */
const repo = process.env.GITHUB_REPO || 'nezumi0627/terraria-companion'
const token = process.env.GH_TOKEN || process.env.CLOUD_API_GITHUB_TOKEN || ''
const url = String(process.env.API_URL || '').trim().replace(/\/+$/, '')
const source = process.env.API_SOURCE || 'actions-tunnel'
const path = 'public/cloud-api-url.json'

if (!token) {
  console.error('GH_TOKEN is required')
  process.exit(1)
}
if (!url) {
  console.error('API_URL is required')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'terraria-companion-publish-url',
}

const payload = {
  url,
  updatedAt: Date.now(),
  source,
}

const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers })
let sha
if (getRes.ok) {
  const existing = await getRes.json()
  sha = existing.sha
  try {
    const prev = JSON.parse(Buffer.from(existing.content, 'base64').toString('utf8'))
    if (prev.url === url && prev.source === source) {
      console.log('URL unchanged:', url)
      process.exit(0)
    }
  } catch {
    /* overwrite corrupt file */
  }
}

const body = {
  message: `chore(cloud): refresh API URL (${source})`,
  content: Buffer.from(JSON.stringify(payload, null, 2) + '\n', 'utf8').toString('base64'),
  committer: {
    name: 'github-actions[bot]',
    email: '41898282+github-actions[bot]@users.noreply.github.com',
  },
}
if (sha) body.sha = sha

const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
  method: 'PUT',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

if (!putRes.ok) {
  const t = await putRes.text()
  console.error('PUT failed', putRes.status, t.slice(0, 300))
  process.exit(1)
}

console.log('Published', url, 'source=', source)
