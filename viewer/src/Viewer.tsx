import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createClient, type RealtimeChannel } from '@supabase/supabase-js'
import { CheckCircle2, Eye, Lock, Maximize, MessageSquare, Minus, Plus, TriangleAlert } from 'lucide-react'
import type { Card, ShareComment } from '@shared/types'
import { SHARE_PUBLISHABLE_KEY, SHARE_SUPABASE_URL } from '@shared/share-config'
import { CardContent } from '@/board/CardContent'
import ConnectionsLayer from '@/board/ConnectionsLayer'
import { colorHex, isAutoHeight, timeAgo } from '@/lib/util'
import { unionRects } from '@/lib/geometry'
import { Logo } from '@/components/ui'
import { CardFeedbackSummary, summarize } from '@/store/feedback'
import { fetchComments, fetchShare, localApi, SharedBoard, token } from './api'
import FeedbackSheet from './FeedbackSheet'

type Status = 'loading' | 'ready' | 'missing' | 'error'

export default function Viewer() {
  const [board, setBoard] = useState<SharedBoard | null>(null)
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'missing')
  const [live, setLive] = useState(false)
  const [changed, setChanged] = useState<Set<string>>(new Set())
  const [comments, setComments] = useState<ShareComment[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [, tick] = useState(0)
  const prev = useRef<Map<string, string>>(new Map())
  const versionRef = useRef(-1)
  const inFlight = useRef(false)

  const load = useCallback(async () => {
    if (!token || inFlight.current) return
    inFlight.current = true
    try {
      const b = await fetchShare()
      if (!b) {
        setStatus('missing')
        setBoard(null)
        return
      }
      if (b.version !== versionRef.current) {
        // Highlight cards that changed since the last version the viewer saw.
        const next = new Map(b.data.cards.map((c) => [c.id, JSON.stringify([c.x, c.y, c.w, c.data, c.color])]))
        if (versionRef.current >= 0) {
          const diff = new Set<string>()
          for (const [id, sig] of next) if (prev.current.get(id) !== sig) diff.add(id)
          setChanged(diff)
          setTimeout(() => setChanged(new Set()), 1900)
        }
        prev.current = next
        versionRef.current = b.version
        setBoard(b)
        document.title = `${b.title} — ${b.projectTitle} · OSAMA WORKSPACE`
      }
      setStatus('ready')
    } catch {
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'))
    } finally {
      inFlight.current = false
    }
  }, [])

  const loadComments = useCallback(async () => {
    try {
      setComments(await fetchComments())
    } catch {
      /* keep what we have */
    }
  }, [])

  // Initial load, live channel, and a slow safety poll.
  useEffect(() => {
    if (!token) return
    load()
    loadComments()
    let channel: RealtimeChannel | null = null
    let poll: ReturnType<typeof setInterval>
    if (localApi) {
      setLive(true)
      poll = setInterval(() => {
        load()
        loadComments()
      }, 1000)
    } else {
      const sb = createClient(SHARE_SUPABASE_URL, SHARE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
      channel = sb
        .channel(`share:${token}`)
        .on('broadcast', { event: 'update' }, () => load())
        .on('broadcast', { event: 'comment' }, () => loadComments())
        .on('broadcast', { event: 'revoked' }, () => {
          setStatus('missing')
          setBoard(null)
        })
        .subscribe((s) => setLive(s === 'SUBSCRIBED'))
      poll = setInterval(() => {
        load()
        loadComments()
      }, 15000)
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        load()
        loadComments()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    const t = setInterval(() => tick((x) => x + 1), 20000)
    return () => {
      clearInterval(poll)
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
      channel?.unsubscribe()
    }
  }, [load, loadComments])

  const cardMap = useMemo(() => Object.fromEntries((board?.data.cards ?? []).map((c) => [c.id, c])), [board])
  const summary = useMemo(() => summarize(comments), [comments])
  const openCount = comments.filter((c) => !c.isOwner && !c.resolved).length
  const selectCard = (id: string | null) => {
    setSelected(id)
    if (id) setSheetOpen(true)
  }
  // Drop the selection if the card disappears from the board.
  useEffect(() => {
    if (selected && board && !cardMap[selected]) setSelected(null)
  }, [board, cardMap, selected])

  if (status === 'missing' || status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-ink-950 px-6 text-center">
        <Logo size={36} />
        <div className="text-[17px] font-semibold text-ink-100">{status === 'missing' ? 'This link is not available' : 'Could not load this board'}</div>
        <div className="max-w-sm text-[13.5px] leading-relaxed text-ink-400">
          {status === 'missing'
            ? 'The owner may have stopped sharing this board, or the link is incomplete.'
            : 'Check your internet connection and try again.'}
        </div>
        {status === 'error' && (
          <button className="btn btn-outline" onClick={() => load()}>
            Try again
          </button>
        )}
        <div className="mt-6 text-[10.5px] font-semibold tracking-[0.16em] text-ink-600">OSAMA WORKSPACE</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-ink-950 text-ink-100">
      <header className="flex h-12 flex-none items-center gap-3 border-b border-ink-800 px-3 sm:px-4">
        <Logo size={22} />
        <span className="hidden text-[11.5px] font-semibold tracking-[0.14em] text-ink-300 md:inline">OSAMA WORKSPACE</span>
        <span className="hidden h-4 w-px bg-ink-800 md:inline-block" />
        {board ? (
          <div className="flex min-w-0 items-center gap-2 text-[13px]">
            <span className="text-[14px]">{board.projectIcon}</span>
            <span className="hidden max-w-[260px] truncate text-ink-400 sm:inline" dir="auto">
              {board.projectTitle}
            </span>
            <span className="hidden text-ink-600 sm:inline">/</span>
            <span className="truncate font-medium text-ink-100" dir="auto" data-testid="viewer-title">
              {board.title}
            </span>
          </div>
        ) : (
          <div className="h-4 w-40 animate-pulse rounded bg-ink-800" />
        )}
        <div className="flex-1" />
        {board && <span className="hidden text-[11.5px] text-ink-500 sm:inline">Updated {timeAgo(new Date(board.updatedAt).getTime())}</span>}
        <span
          data-testid="viewer-live"
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] ${live ? 'border-[#6cc28a55] text-[#8fd6a8]' : 'border-ink-700 text-ink-400'}`}
          title={live ? 'Changes appear here as soon as they are made' : 'Reconnecting — the board still refreshes automatically'}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${live ? 'live-dot bg-[#6cc28a]' : 'bg-ink-500'}`} />
          {live ? 'Live' : 'Connecting'}
        </span>
        <span className="hidden items-center gap-1 rounded-full border border-ink-700 px-2.5 py-1 text-[11.5px] text-ink-400 lg:flex" title="You can’t edit this board, but you can leave feedback">
          <Lock size={11} /> View only
        </span>
        <button
          data-testid="viewer-feedback-button"
          className={`btn h-8 ${sheetOpen ? 'bg-ink-800 text-ink-100' : 'btn-outline'}`}
          onClick={() => {
            if (sheetOpen) setSheetOpen(false)
            else {
              setSelected(null)
              setSheetOpen(true)
            }
          }}
        >
          <MessageSquare size={14} /> <span className="hidden sm:inline">Feedback</span>
          {openCount > 0 && <span className="rounded-full bg-ink-750 px-1.5 text-[11px]">{openCount}</span>}
        </button>
      </header>
      <div className="relative min-h-0 flex-1">
        {board ? (
          <ViewCanvas board={board} changed={changed} selected={sheetOpen ? selected : null} summary={summary} onSelect={selectCard} />
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-ink-500">Loading board…</div>
        )}
        {board && sheetOpen && (
          <FeedbackSheet
            card={selected ? cardMap[selected] ?? null : null}
            cards={cardMap}
            comments={comments}
            onClose={() => {
              setSheetOpen(false)
              setSelected(null)
            }}
            onSent={(c) => setComments((list) => (list.some((x) => x.id === c.id) ? list : [...list, c]))}
            onPickCard={(id) => setSelected(id)}
          />
        )}
        {board && !sheetOpen && board.data.cards.length > 0 && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-ink-800 bg-ink-900/90 px-3 py-1.5 text-[11.5px] text-ink-400 shadow-pop backdrop-blur">
            Tap a card to comment or approve
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------- Read-only canvas ----------------

const noop = () => {}

function ViewCard({ card, changed, selected, fb }: { card: Card; changed: boolean; selected: boolean; fb?: CardFeedbackSummary }) {
  const tint = colorHex(card.color)
  return (
    <div
      className={`ws-card cursor-pointer ${changed ? 'changed' : ''} ${selected ? 'selected' : ''}`}
      data-card-id={card.id}
      data-tint={tint && card.type !== 'heading' && card.type !== 'divider' && card.type !== 'group' ? '' : undefined}
      style={{
        left: card.x,
        top: card.y,
        width: card.w,
        height: isAutoHeight(card.type) ? undefined : card.h,
        ...(tint ? ({ '--tint': tint } as React.CSSProperties) : {})
      }}
    >
      <CardContent card={card} editing={false} readOnly onData={noop} onExitEdit={noop} />
      {fb && fb.open > 0 && (
        <span
          data-testid="viewer-card-badge"
          className="pointer-events-none absolute -right-2.5 -top-2.5 z-20 flex h-6 min-w-[24px] items-center justify-center gap-1 rounded-full px-1.5 text-[11px] font-semibold text-white shadow-md"
          style={{ background: fb.status === 'approved' ? '#3fa267' : fb.status === 'changes' ? '#d98a2b' : '#6f7cf2' }}
        >
          {fb.status === 'approved' ? <CheckCircle2 size={12} /> : fb.status === 'changes' ? <TriangleAlert size={12} /> : <MessageSquare size={12} />}
          {fb.open}
        </span>
      )}
    </div>
  )
}

function ViewCanvas({
  board,
  changed,
  selected,
  summary,
  onSelect
}: {
  board: SharedBoard
  changed: Set<string>
  selected: string | null
  summary: Record<string, CardFeedbackSummary>
  onSelect: (id: string | null) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const tap = useRef<{ x: number; y: number; moved: boolean; multi: boolean } | null>(null)
  const [vp, setVp] = useState({ x: 0, y: 0, zoom: 1 })
  const vpRef = useRef(vp)
  vpRef.current = vp
  const fitted = useRef(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ x: number; y: number; vx: number; vy: number; dist?: number; zoom?: number; cx?: number; cy?: number } | null>(null)

  const cards = board.data.cards
  const cardMap = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards])
  const sorted = useMemo(() => [...cards].sort((a, b) => (a.type === 'group' ? 0 : 1) - (b.type === 'group' ? 0 : 1) || a.z - b.z), [cards])

  const fit = useCallback(() => {
    const el = ref.current
    const bb = unionRects(cards)
    if (!el || !bb) return
    const w = el.clientWidth,
      h = el.clientHeight
    const pad = w < 640 ? 24 : 80
    const zoom = Math.min(1.2, Math.max(0.08, Math.min((w - pad * 2) / bb.w, (h - pad * 2) / bb.h)))
    setVp({ x: w / 2 - (bb.x + bb.w / 2) * zoom, y: h / 2 - (bb.y + bb.h / 2) * zoom, zoom })
  }, [cards])

  useLayoutEffect(() => {
    if (!fitted.current && cards.length) {
      fitted.current = true
      fit()
    }
  }, [cards, fit])

  const zoomAt = (factor: number, cx: number, cy: number) =>
    setVp((v) => {
      const z = Math.min(3, Math.max(0.08, v.zoom * factor))
      const wx = (cx - v.x) / v.zoom,
        wy = (cy - v.y) / v.zoom
      return { x: cx - wx * z, y: cy - wy * z, zoom: z }
    })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top)
      else setVp((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('a, [data-ui]')) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) tap.current = { x: e.clientX, y: e.clientY, moved: false, multi: false }
    else if (tap.current) tap.current.multi = true
    startGesture()
  }
  const startGesture = () => {
    const pts = [...pointers.current.values()]
    if (!pts.length) return (gesture.current = null)
    const r = ref.current!.getBoundingClientRect()
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length - r.left
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length - r.top
    const v = vpRef.current
    gesture.current = {
      x: cx,
      y: cy,
      vx: v.x,
      vy: v.y,
      zoom: v.zoom,
      dist: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : undefined,
      cx,
      cy
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (tap.current && Math.hypot(e.clientX - tap.current.x, e.clientY - tap.current.y) > 5) tap.current.moved = true
    const g = gesture.current
    const pts = [...pointers.current.values()]
    const r = ref.current!.getBoundingClientRect()
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length - r.left
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length - r.top
    if (pts.length > 1 && g.dist) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const z = Math.min(3, Math.max(0.08, g.zoom! * (d / g.dist)))
      const wx = (g.cx! - g.vx) / g.zoom!,
        wy = (g.cy! - g.vy) / g.zoom!
      setVp({ x: cx - wx * z, y: cy - wy * z, zoom: z })
    } else {
      setVp({ ...vpRef.current, x: g.vx + (cx - g.x), y: g.vy + (cy - g.y) })
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    const t = tap.current
    if (t && !pointers.current.size) {
      tap.current = null
      if (!t.moved && !t.multi && e.type === 'pointerup') {
        // A tap (not a drag) selects the card under the pointer for feedback.
        const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-card-id]') as HTMLElement | null
        onSelect(el?.dataset.cardId ?? null)
      }
    }
    startGesture()
  }

  const grid = 24 * vp.zoom
  return (
    <div
      ref={ref}
      data-testid="viewer-canvas"
      className="relative h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
      style={{
        background: 'var(--canvas)',
        backgroundImage: vp.zoom > 0.25 ? `radial-gradient(var(--grid) ${Math.max(1, vp.zoom * 1.1)}px, transparent 0)` : undefined,
        backgroundSize: `${grid}px ${grid}px`,
        backgroundPosition: `${vp.x}px ${vp.y}px`,
        touchAction: 'none'
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('a, [data-ui], [data-card-id], [data-viewer-panel]')) return
        const r = ref.current!.getBoundingClientRect()
        zoomAt(1.6, e.clientX - r.left, e.clientY - r.top)
      }}
    >
      <div className="absolute left-0 top-0" style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`, transformOrigin: '0 0', width: 0, height: 0 }}>
        {sorted
          .filter((c) => c.type === 'group')
          .map((c) => (
            <ViewCard key={c.id} card={c} changed={changed.has(c.id)} selected={selected === c.id} fb={summary[c.id]} />
          ))}
        <ConnectionsLayer cards={cardMap} connections={board.data.connections} interactive={false} />
        {sorted
          .filter((c) => c.type !== 'group')
          .map((c) => (
            <ViewCard key={c.id} card={c} changed={changed.has(c.id)} selected={selected === c.id} fb={summary[c.id]} />
          ))}
      </div>

      {!cards.length && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-ink-500">
          <Eye size={20} />
          <div className="text-[13.5px]">Nothing on this board yet — new cards will appear here live.</div>
        </div>
      )}

      <div data-ui className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-lg border border-ink-800 bg-ink-900/95 p-1 shadow-pop backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
        <button className="icon-btn h-8 w-8" title="Zoom out" onClick={() => zoomAt(1 / 1.25, ref.current!.clientWidth / 2, ref.current!.clientHeight / 2)}>
          <Minus size={14} />
        </button>
        <span className="min-w-[48px] text-center text-[12px] text-ink-300">{Math.round(vp.zoom * 100)}%</span>
        <button className="icon-btn h-8 w-8" title="Zoom in" onClick={() => zoomAt(1.25, ref.current!.clientWidth / 2, ref.current!.clientHeight / 2)}>
          <Plus size={14} />
        </button>
        <div className="mx-0.5 h-4 w-px bg-ink-800" />
        <button className="icon-btn h-8 w-8" title="Fit to screen" onClick={fit}>
          <Maximize size={14} />
        </button>
      </div>
    </div>
  )
}
