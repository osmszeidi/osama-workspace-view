import { create } from 'zustand'
import type { ShareComment, ShareCommentsUpdate } from '@shared/types'

interface FeedbackState {
  byBoard: Record<string, { comments: ShareComment[]; unread: number }>
  panelOpen: boolean
  focusCardId: string | null
  apply(u: ShareCommentsUpdate): void
  openPanel(cardId?: string | null): void
  closePanel(): void
}

export const useFeedback = create<FeedbackState>((set, get) => ({
  byBoard: {},
  panelOpen: false,
  focusCardId: null,
  apply(u) {
    set({ byBoard: { ...get().byBoard, [u.boardId]: { comments: u.comments, unread: u.unread } } })
  },
  openPanel(cardId = null) {
    set({ panelOpen: true, focusCardId: cardId })
  },
  closePanel() {
    set({ panelOpen: false, focusCardId: null })
  }
}))

export interface CardFeedbackSummary {
  open: number
  status: 'approved' | 'changes' | 'comment' | null
}

/** Per-card summary: open (unresolved) client items and the latest verdict. */
export function summarize(comments: ShareComment[]): Record<string, CardFeedbackSummary> {
  const out: Record<string, CardFeedbackSummary> = {}
  for (const c of comments) {
    if (!c.cardId) continue
    const s = (out[c.cardId] ??= { open: 0, status: null })
    if (!c.isOwner && !c.resolved) s.open++
    if (!c.isOwner && !c.resolved) s.status = c.kind === 'approve' ? 'approved' : c.kind === 'changes' ? 'changes' : s.status ?? 'comment'
  }
  return out
}

let wired = false
export function wireFeedback() {
  if (wired) return
  wired = true
  window.api.share.onComments((u) => useFeedback.getState().apply(u))
}
