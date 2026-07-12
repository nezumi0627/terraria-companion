import { publicUrl } from '@/lib/public-url'

export const FEEDBACK_REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO || 'nezumi0627/terraria-companion'

export type FeedbackCategory = 'bug' | 'idea' | 'other'

export interface FeedbackPayload {
  category: FeedbackCategory
  title: string
  body: string
  /** Honeypot — must stay empty */
  website?: string
}

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  bug: 'バグ報告',
  idea: 'アイデア',
  other: 'その他',
}

function buildIssueBody(payload: FeedbackPayload): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
  const page = typeof location !== 'undefined' ? location.href : ''
  return [
    `### 種別`,
    CATEGORY_LABEL[payload.category],
    '',
    `### 内容`,
    payload.body.trim(),
    '',
    `---`,
    `- 送信元: アプリ内フィードバック`,
    `- URL: ${page}`,
    `- UA: ${ua}`,
  ].join('\n')
}

function prefilledIssueUrl(title: string, body: string, category: FeedbackCategory): string {
  const labels = ['feedback', category === 'bug' ? 'bug' : category === 'idea' ? 'enhancement' : 'feedback']
  const params = new URLSearchParams({
    title,
    body,
    labels: [...new Set(labels)].join(','),
  })
  return `https://github.com/${FEEDBACK_REPO}/issues/new?${params.toString()}`
}

export interface FeedbackResult {
  ok: boolean
  mode: 'api' | 'redirect'
  url?: string
  error?: string
}

const COOLDOWN_MS = 60_000
const COOLDOWN_KEY = 'tc-feedback-at'

function assertCooldown(): string | null {
  try {
    const prev = Number(localStorage.getItem(COOLDOWN_KEY) || 0)
    const left = COOLDOWN_MS - (Date.now() - prev)
    if (left > 0) return `連続送信を防ぐため、${Math.ceil(left / 1000)}秒後に再試行してください`
  } catch {
    /* ignore */
  }
  return null
}

function markCooldown() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

/**
 * Send feedback as a GitHub Issue (fully automatic when a token is configured).
 *
 * Build-time env:
 * - NEXT_PUBLIC_FEEDBACK_GITHUB_TOKEN — fine-grained PAT with Issues: Write only
 * - NEXT_PUBLIC_FEEDBACK_DISPATCH_TOKEN — optional PAT that can fire repository_dispatch
 * - NEXT_PUBLIC_GITHUB_REPO — owner/name
 */
export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackResult> {
  if (payload.website) {
    return { ok: true, mode: 'api' } // honeypot — pretend success
  }

  const title = payload.title.trim().slice(0, 120)
  const bodyText = payload.body.trim()
  if (!title || bodyText.length < 5) {
    return { ok: false, mode: 'api', error: 'タイトルと内容（5文字以上）を入力してください' }
  }

  const cooled = assertCooldown()
  if (cooled) return { ok: false, mode: 'api', error: cooled }

  const issueTitle = `[フィードバック/${CATEGORY_LABEL[payload.category]}] ${title}`
  const issueBody = buildIssueBody(payload)
  const token = process.env.NEXT_PUBLIC_FEEDBACK_GITHUB_TOKEN
  const dispatchToken = process.env.NEXT_PUBLIC_FEEDBACK_DISPATCH_TOKEN

  if (token) {
    try {
      const res = await fetch(`https://api.github.com/repos/${FEEDBACK_REPO}/issues`, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: [
            'feedback',
            payload.category === 'bug' ? 'bug' : payload.category === 'idea' ? 'enhancement' : 'feedback',
          ],
        }),
      })
      if (res.ok) {
        const json = (await res.json()) as { html_url?: string }
        markCooldown()
        return { ok: true, mode: 'api', url: json.html_url }
      }
      if (res.status !== 401 && res.status !== 403) {
        const detail = await res.text().catch(() => '')
        return {
          ok: false,
          mode: 'api',
          error: `Issue の作成に失敗しました（${res.status}）${detail ? `: ${detail.slice(0, 120)}` : ''}`,
        }
      }
    } catch {
      /* fall through */
    }
  }

  // Secondary: repository_dispatch → Actions creates the issue with GITHUB_TOKEN
  if (dispatchToken) {
    try {
      const res = await fetch(`https://api.github.com/repos/${FEEDBACK_REPO}/dispatches`, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${dispatchToken}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          event_type: 'app-feedback',
          client_payload: {
            title: issueTitle,
            body: issueBody,
            category: payload.category,
          },
        }),
      })
      if (res.status === 204 || res.ok) {
        markCooldown()
        return {
          ok: true,
          mode: 'api',
          url: `https://github.com/${FEEDBACK_REPO}/issues`,
        }
      }
    } catch {
      /* fall through */
    }
  }

  const url = prefilledIssueUrl(issueTitle, issueBody, payload.category)
  markCooldown()
  return { ok: true, mode: 'redirect', url }
}

export function feedbackHelpUrl(): string {
  return publicUrl('/')
}
