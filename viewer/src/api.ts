import type { Card, Connection, FeedbackKind, ShareComment } from '@shared/types'
import { SHARE_ASSET_BASE, SHARE_PUBLISHABLE_KEY, SHARE_SUPABASE_URL } from '@shared/share-config'
import { setAssetResolver } from '@/lib/util'

export interface SharedBoard {
  token: string
  title: string
  projectTitle: string
  projectIcon: string
  data: { cards: Card[]; connections: Connection[] }
  version: number
  updatedAt: string
}

const params = new URLSearchParams(location.search)
export const token = (location.pathname.match(/\/b\/([A-Za-z0-9_-]{20,64})/)?.[1] ?? params.get('b') ?? '').trim()
// A local test backend may be used only when the viewer itself runs on localhost.
export const localApi = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? params.get('api') : null

setAssetResolver((id) => (localApi ? `${localApi}/assets/${token}/${id}` : `${SHARE_ASSET_BASE}/${token}/${id}`))

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SHARE_SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SHARE_PUBLISHABLE_KEY },
    body: JSON.stringify(args)
  })
  const data = await r.json().catch(() => null)
  if (!r.ok) throw new Error((data && (data.message || data.error)) || `Request failed (${r.status})`)
  return data as T
}

export async function fetchShare(): Promise<SharedBoard | null> {
  if (localApi) {
    const r = await fetch(`${localApi}/share/${token}`)
    if (r.status === 404) return null
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  }
  return rpc<SharedBoard | null>('get_share', { p_token: token })
}

export async function fetchComments(): Promise<ShareComment[]> {
  if (localApi) {
    const r = await fetch(`${localApi}/comments/${token}`)
    return r.ok ? r.json() : []
  }
  return (await rpc<ShareComment[] | null>('get_comments', { p_token: token })) ?? []
}

export async function addComment(cardId: string | null, author: string, body: string, kind: FeedbackKind): Promise<ShareComment> {
  if (localApi) {
    const r = await fetch(`${localApi}/comments/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, author, body, kind })
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || 'Could not send')
    return data
  }
  return rpc<ShareComment>('add_comment', { p_token: token, p_card_id: cardId, p_author: author, p_body: body, p_kind: kind })
}
