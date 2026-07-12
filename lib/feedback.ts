import { publicUrl } from '@/lib/public-url'
import { cloudApiReady, cloudFetch } from '@/lib/cloud-api'

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
 * Send feedback as a GitHub Issue via cloud Worker when configured.
 * Falls back to opening a pre-filled New Issue page (no token in the browser).
 */
export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackResult> {
  if (payload.website) {
    return { ok: true, mode: 'api' }
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

  if (await cloudApiReady()) {
    try {
      const data = await cloudFetch<{ ok: boolean; url?: string | null }>('/feedback', {
        method: 'POST',
        json: {
          category: payload.category,
          title,
          body: bodyText,
          website: payload.website || '',
          page: typeof location !== 'undefined' ? location.href : '',
          ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        },
      })
      markCooldown()
      return { ok: true, mode: 'api', url: data.url || undefined }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '送信に失敗しました'
      // Fall through to redirect so users can still report
      if (!msg.includes('多すぎ')) {
        /* continue to redirect */
      } else {
        return { ok: false, mode: 'api', error: msg }
      }
    }
  }

  const url = prefilledIssueUrl(issueTitle, issueBody, payload.category)
  markCooldown()
  return { ok: true, mode: 'redirect', url }
}

export function feedbackHelpUrl(): string {
  return publicUrl('/')
}
