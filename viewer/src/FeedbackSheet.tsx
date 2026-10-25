import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, MessageSquare, Send, TriangleAlert, X } from 'lucide-react'
import type { Card, FeedbackKind, ShareComment } from '@shared/types'
import { cardTitle, timeAgo } from '@/lib/util'
import { addComment } from './api'

const KIND = {
  approve: { label: 'Approved', color: '#3fa267', Icon: CheckCircle2 },
  changes: { label: 'Changes requested', color: '#d98a2b', Icon: TriangleAlert },
  comment: { label: 'Comment', color: '#8a8a94', Icon: MessageSquare }
} as const

const NAME_KEY = 'ows-viewer-name'
const loadName = () => {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

export default function FeedbackSheet({
  card,
  comments,
  onClose,
  onSent,
  onPickCard,
  cards
}: {
  card: Card | null
  comments: ShareComment[]
  cards: Record<string, Card>
  onClose: () => void
  onSent: (c: ShareComment) => void
  onPickCard: (id: string | null) => void
}) {
  const [name, setName] = useState(loadName)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<FeedbackKind | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<FeedbackKind | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const thread = useMemo(() => comments.filter((c) => (card ? c.cardId === card.id : true)), [comments, card])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [thread.length, card?.id])
  useEffect(() => {
    setError(null)
    setSent(null)
  }, [card?.id])

  const send = async (kind: FeedbackKind) => {
    const author = name.trim()
    const body = text.trim()
    if (!author) return setError('Please add your name first.')
    if (kind === 'comment' && !body) return setError('Write a comment first.')
    setBusy(kind)
    setError(null)
    try {
      try {
        localStorage.setItem(NAME_KEY, author)
      } catch {
        /* private mode */
      }
      const c = await addComment(card ? card.id : null, author, body, kind)
      onSent(c)
      setText('')
      setSent(kind)
      setTimeout(() => setSent(null), 2500)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <aside
      data-testid="viewer-feedback"
      className="pop-in absolute inset-x-0 bottom-0 z-30 flex max-h-[78%] flex-col rounded-t-2xl border border-ink-700 bg-ink-850 shadow-pop md:inset-x-auto md:bottom-3 md:right-3 md:top-3 md:max-h-none md:w-[370px] md:rounded-2xl"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3 border-b border-ink-750 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">{card ? 'Feedback on' : 'Feedback on the whole board'}</div>
          {card && (
            <div className="mt-0.5 truncate text-[14px] font-semibold text-ink-100" dir="auto" data-testid="viewer-feedback-title">
              {cardTitle(card)}
            </div>
          )}
        </div>
        <button className="icon-btn h-7 w-7 flex-none" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
      </div>

      <div ref={listRef} className="scroll-thin min-h-[60px] flex-1 overflow-y-auto px-4 py-3">
        {!thread.length && (
          <div className="py-6 text-center text-[12.5px] leading-relaxed text-ink-500">
            {card ? 'No feedback on this card yet. Approve it, ask for changes, or leave a comment below.' : 'No feedback yet. Tap any card to comment on it, or write general feedback below.'}
          </div>
        )}
        {thread.map((c) => {
          const k = KIND[c.kind]
          const onCard = !card && c.cardId ? cards[c.cardId] : null
          return (
            <div key={c.id} data-testid="viewer-comment" className={`mb-3 ${c.resolved ? 'opacity-55' : ''}`}>
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{ background: c.isOwner ? 'rgb(var(--ink-100))' : `${k.color}2a`, color: c.isOwner ? 'rgb(var(--ink-950))' : k.color }}
                >
                  {c.author.trim().charAt(0).toUpperCase()}
                </span>
                <span className="truncate text-[12.5px] font-medium text-ink-100" dir="auto">
                  {c.author}
                  {c.isOwner && <span className="ml-1 rounded bg-ink-750 px-1 py-px text-[10px] font-normal text-ink-400">Owner</span>}
                </span>
                <span className="ml-auto flex-none text-[10.5px] text-ink-500">{c.resolved ? 'Resolved' : timeAgo(new Date(c.createdAt).getTime())}</span>
              </div>
              {!c.isOwner && c.kind !== 'comment' && (
                <div className="ml-8 mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: `${k.color}22`, color: k.color }}>
                  <k.Icon size={11} /> {k.label}
                </div>
              )}
              {c.body && (
                <div className="ml-8 mt-1 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-ink-300" dir="auto">
                  {c.body}
                </div>
              )}
              {onCard && (
                <button className="ml-8 mt-1 text-[11px] text-ink-500 underline-offset-2 hover:text-ink-200 hover:underline" onClick={() => onPickCard(onCard.id)}>
                  on “{cardTitle(onCard)}”
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t border-ink-750 px-4 pb-4 pt-3">
        {!loadName() || !name ? (
          <input
            data-testid="viewer-name"
            className="field mb-2 h-9"
            placeholder="Your name"
            value={name}
            maxLength={60}
            dir="auto"
            onChange={(e) => setName(e.target.value)}
          />
        ) : (
          <div className="mb-2 flex items-center justify-between text-[11.5px] text-ink-500">
            <span>
              Commenting as <span className="text-ink-300">{name}</span>
            </span>
            <button
              className="hover:text-ink-200"
              onClick={() => {
                try {
                  localStorage.removeItem(NAME_KEY)
                } catch {
                  /* ignore */
                }
                setName('')
              }}
            >
              Change
            </button>
          </div>
        )}
        <textarea
          data-testid="viewer-comment-input"
          className="field min-h-[70px] resize-none text-[13px]"
          placeholder={card ? 'What do you think of this?' : 'General feedback on the board'}
          value={text}
          maxLength={2000}
          dir="auto"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && send('comment')}
        />
        {error && <div className="mt-1.5 text-[12px] text-[#e5646e]">{error}</div>}
        {sent && (
          <div className="mt-1.5 text-[12px]" style={{ color: KIND[sent].color }}>
            {sent === 'approve' ? 'Approved — thank you!' : sent === 'changes' ? 'Change request sent.' : 'Comment sent.'}
          </div>
        )}
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <button
            data-testid="viewer-approve"
            className="btn h-9 justify-center text-[12px] text-white disabled:opacity-60"
            style={{ background: KIND.approve.color }}
            disabled={!!busy}
            onClick={() => send('approve')}
          >
            <CheckCircle2 size={14} /> Approve
          </button>
          <button
            data-testid="viewer-changes"
            className="btn h-9 justify-center text-[12px] text-white disabled:opacity-60"
            style={{ background: KIND.changes.color }}
            disabled={!!busy}
            onClick={() => send('changes')}
          >
            <TriangleAlert size={14} /> Changes
          </button>
          <button data-testid="viewer-send" className="btn btn-primary h-9 justify-center text-[12px]" disabled={!!busy} onClick={() => send('comment')}>
            <Send size={13} /> Comment
          </button>
        </div>
      </div>
    </aside>
  )
}
