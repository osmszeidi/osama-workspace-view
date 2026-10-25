import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Calendar, Check, ExternalLink, FileText, FolderOpen, Globe, ImageOff, Plus, Trash2, User, X } from 'lucide-react'
import type { Card, CardData, ChecklistItem, ShotRow, TaskStatus } from '@shared/types'
import { assetUrl, formatBytes, formatDue, hostOf, NOTE_LABELS, normalizeUrl, sanitizeHtml, STATUS_META, uid, fileExt } from '../lib/util'

export interface CardContentProps {
  card: Card
  editing: boolean
  readOnly?: boolean
  onData: (patch: Partial<CardData>, history?: boolean) => void
  onExitEdit: () => void
}

export function AutoTextarea({
  value,
  onChange,
  className = '',
  placeholder,
  autoFocus,
  onKeyDown,
  style
}: {
  value: string
  onChange: (v: string) => void
  className?: string
  placeholder?: string
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus()
      const n = ref.current.value.length
      ref.current.setSelectionRange(n, n)
    }
  }, [autoFocus])
  return (
    <textarea
      ref={ref}
      dir="auto"
      rows={1}
      className={`ws-input block resize-none overflow-hidden ${className}`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      style={style}
    />
  )
}

function Tags({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null
  return (
    <div className="mt-2.5 flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className="rounded-full border px-2 py-[1px] text-[11px]" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-2)' }}>
          #{t}
        </span>
      ))}
    </div>
  )
}

function Label({ text }: { text?: string }) {
  if (!text) return null
  return (
    <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--tint, var(--muted))' }}>
      {text}
    </div>
  )
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation()

// ---------------- Note ----------------

function NoteEditor({ card, onData }: CardContentProps) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = sanitizeHtml(card.data.html || '')
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div
      ref={ref}
      data-note-editor
      dir="auto"
      className="note-html min-h-[1.55em]"
      contentEditable
      suppressContentEditableWarning
      data-placeholder="Type something…"
      onInput={(e) => onData({ html: (e.target as HTMLDivElement).innerHTML })}
      onPaste={(e) => {
        const text = e.clipboardData.getData('text/plain')
        if (!text) return
        e.preventDefault()
        document.execCommand('insertText', false, text)
      }}
    />
  )
}

function NoteCard(p: CardContentProps) {
  const { card, editing, onData } = p
  const [customLabel, setCustomLabel] = useState(false)
  return (
    <div className="surface px-4 py-3.5">
      {editing ? (
        <div className="mb-2 flex items-center gap-1.5" onPointerDown={stop}>
          {customLabel ? (
            <input
              autoFocus
              className="ws-field h-6 py-0 text-[11px]"
              placeholder="Custom label"
              value={card.data.label || ''}
              onChange={(e) => onData({ label: e.target.value })}
              onBlur={() => setCustomLabel(false)}
              onKeyDown={(e) => e.key === 'Enter' && setCustomLabel(false)}
            />
          ) : (
            <select
              className="ws-field h-6 w-auto py-0 text-[11px]"
              value={NOTE_LABELS.includes(card.data.label || '') || !card.data.label ? card.data.label || '' : '__custom'}
              onMouseDown={stop}
              onChange={(e) => {
                if (e.target.value === '__custom') setCustomLabel(true)
                else onData({ label: e.target.value })
              }}
            >
              <option value="">No label</option>
              {NOTE_LABELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
              {card.data.label && !NOTE_LABELS.includes(card.data.label) && <option value="__custom">{card.data.label}</option>}
              <option value="__custom">Custom…</option>
            </select>
          )}
        </div>
      ) : (
        <Label text={card.data.label} />
      )}
      {editing ? <NoteEditor {...p} /> : <div dir="auto" className="note-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(card.data.html || '') || '' }} />}
      {!editing && !card.data.html && !card.data.label && <div className="muted text-[13px] italic">Empty note</div>}
      <Tags tags={card.data.tags} />
    </div>
  )
}

// ---------------- Heading ----------------

function HeadingCard({ card, editing, onData }: CardContentProps) {
  const lvl = card.data.level ?? 1
  const style: React.CSSProperties = {
    fontSize: lvl === 1 ? 28 : 20,
    fontWeight: 650,
    lineHeight: 1.2,
    letterSpacing: lvl === 1 ? '-0.02em' : '-0.01em',
    color: 'var(--tint, var(--text))'
  }
  return (
    <div className="ws-outline rounded-md px-1 py-1">
      {editing ? (
        <AutoTextarea value={card.data.text || ''} onChange={(v) => onData({ text: v })} placeholder="Heading" autoFocus style={style} />
      ) : (
        <div dir="auto" style={style} className="whitespace-pre-wrap break-words">
          {card.data.text || <span className="muted">Heading</span>}
        </div>
      )}
    </div>
  )
}

// ---------------- Checklist ----------------

function CheckBox({ on, onToggle, readOnly }: { on: boolean; onToggle?: () => void; readOnly?: boolean }) {
  return (
    <span
      data-no-drag
      role="checkbox"
      aria-checked={on}
      className={`ws-check ${on ? 'on' : ''} ${readOnly ? '' : 'cursor-pointer'}`}
      onPointerDown={stop}
      onClick={(e) => {
        e.stopPropagation()
        if (!readOnly) onToggle?.()
      }}
    >
      {on && <Check size={11} strokeWidth={3.2} />}
    </span>
  )
}

function ChecklistCard({ card, editing, readOnly, onData }: CardContentProps) {
  const items = card.data.items ?? []
  const done = items.filter((i) => i.done).length
  const focusId = useRef<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focusId.current && listRef.current) {
      const el = listRef.current.querySelector<HTMLTextAreaElement>(`[data-item="${focusId.current}"] textarea`)
      el?.focus()
      focusId.current = null
    }
  })
  const setItems = (next: ChecklistItem[], history = false) => onData({ items: next }, history)
  return (
    <div className="surface px-4 py-3.5">
      {editing ? (
        <AutoTextarea
          className="mb-2 font-semibold"
          value={card.data.title || ''}
          onChange={(v) => onData({ title: v })}
          placeholder="To-do list"
          autoFocus={!card.data.title}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (items.length) {
                listRef.current?.querySelector<HTMLTextAreaElement>(`[data-item="${items[0].id}"] textarea`)?.focus()
              } else {
                const n = { id: uid(), text: '', done: false }
                focusId.current = n.id
                setItems([n])
              }
            }
          }}
        />
      ) : (
        <div dir="auto" className="mb-2 font-semibold">
          {card.data.title || 'To-do list'}
        </div>
      )}
      {items.length > 0 && (
        <div className="mb-2 h-1 overflow-hidden rounded-full" style={{ background: 'var(--card-2)' }}>
          <div className="h-full rounded-full" style={{ width: `${(done / items.length) * 100}%`, background: 'var(--tint, #6cc28a)' }} />
        </div>
      )}
      <div ref={listRef} className="flex flex-col gap-1">
        {items.map((it, i) => (
          <div key={it.id} data-item={it.id} className="flex items-start gap-2">
            <CheckBox on={it.done} readOnly={readOnly} onToggle={() => setItems(items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)), true)} />
            {editing ? (
              <AutoTextarea
                value={it.text}
                className={it.done ? 'line-through opacity-60' : ''}
                placeholder="To-do"
                onChange={(v) => setItems(items.map((x) => (x.id === it.id ? { ...x, text: v } : x)))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    const n = { id: uid(), text: '', done: false }
                    focusId.current = n.id
                    setItems([...items.slice(0, i + 1), n, ...items.slice(i + 1)])
                  } else if (e.key === 'Backspace' && !it.text) {
                    e.preventDefault()
                    if (i > 0) focusId.current = items[i - 1].id
                    setItems(items.filter((x) => x.id !== it.id))
                  }
                }}
              />
            ) : (
              <span dir="auto" className={`flex-1 break-words ${it.done ? 'line-through' : ''}`} style={it.done ? { color: 'var(--muted)' } : undefined}>
                {it.text || ' '}
              </span>
            )}
          </div>
        ))}
      </div>
      {editing && (
        <button
          data-no-drag
          className="mt-2 flex items-center gap-1.5 text-[12.5px]"
          style={{ color: 'var(--muted)' }}
          onPointerDown={stop}
          onClick={() => {
            const n = { id: uid(), text: '', done: false }
            focusId.current = n.id
            setItems([...items, n])
          }}
        >
          <Plus size={13} /> Add item
        </button>
      )}
      {!editing && items.length > 0 && (
        <div className="mt-2 text-[11px]" style={{ color: 'var(--muted)' }}>
          {done} of {items.length} done
        </div>
      )}
      <Tags tags={card.data.tags} />
    </div>
  )
}

// ---------------- Task ----------------

export function StatusPill({ status, onClick, readOnly }: { status: TaskStatus; onClick?: () => void; readOnly?: boolean }) {
  const m = STATUS_META[status]
  return (
    <span
      data-no-drag
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-[2px] text-[11px] font-medium ${readOnly ? '' : 'cursor-pointer'}`}
      style={{ background: `${m.color}22`, color: m.color, border: `1px solid ${m.color}44` }}
      title={readOnly ? undefined : 'Click to change status'}
      onPointerDown={stop}
      onClick={(e) => {
        e.stopPropagation()
        if (!readOnly) onClick?.()
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  )
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = { todo: 'doing', doing: 'done', done: 'todo' }

function TaskCard({ card, editing, readOnly, onData }: CardContentProps) {
  const d = card.data
  const status = d.status ?? 'todo'
  return (
    <div className="surface px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <StatusPill status={status} readOnly={readOnly} onClick={() => onData({ status: NEXT_STATUS[status] }, true)} />
        {!editing && d.due && (
          <span className="flex items-center gap-1 text-[11.5px]" style={{ color: 'var(--muted)' }}>
            <Calendar size={12} /> {formatDue(d.due)}
          </span>
        )}
      </div>
      {editing ? (
        <div className="mt-2 flex flex-col gap-2" onPointerDown={stop}>
          <AutoTextarea className="font-medium" value={d.title || ''} onChange={(v) => onData({ title: v })} placeholder="Task" autoFocus />
          <AutoTextarea className="text-[12.5px]" value={d.notes || ''} onChange={(v) => onData({ notes: v })} placeholder="Notes" style={{ color: 'var(--text-2)' }} />
          <div className="grid grid-cols-2 gap-2">
            <select className="ws-field" value={status} onChange={(e) => onData({ status: e.target.value as TaskStatus })}>
              <option value="todo">To Do</option>
              <option value="doing">In Progress</option>
              <option value="done">Done</option>
            </select>
            <input type="date" className="ws-field" value={d.due || ''} onChange={(e) => onData({ due: e.target.value })} />
          </div>
          <input className="ws-field" placeholder="Assignee" value={d.assignee || ''} onChange={(e) => onData({ assignee: e.target.value })} />
        </div>
      ) : (
        <>
          <div dir="auto" className={`mt-2 font-medium break-words ${status === 'done' ? 'line-through' : ''}`} style={status === 'done' ? { color: 'var(--muted)' } : undefined}>
            {d.title || <span className="muted">Untitled task</span>}
          </div>
          {d.notes && (
            <div dir="auto" className="mt-1 whitespace-pre-wrap text-[12.5px]" style={{ color: 'var(--text-2)' }}>
              {d.notes}
            </div>
          )}
          {d.assignee && (
            <div className="mt-2 flex items-center gap-1 text-[11.5px]" style={{ color: 'var(--muted)' }}>
              <User size={12} /> {d.assignee}
            </div>
          )}
        </>
      )}
      <Tags tags={d.tags} />
    </div>
  )
}

// ---------------- Image ----------------

function ImageCard({ card, editing, onData }: CardContentProps) {
  const [broken, setBroken] = useState(false)
  const d = card.data
  return (
    <div className="surface">
      {broken || !d.assetId ? (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-[12px]" style={{ color: 'var(--muted)', background: 'var(--card-2)' }}>
          <ImageOff size={20} /> Image unavailable
        </div>
      ) : (
        <img
          src={assetUrl(d.assetId)}
          draggable={false}
          className="block h-auto w-full"
          style={d.naturalW && d.naturalH ? { aspectRatio: `${d.naturalW} / ${d.naturalH}` } : undefined}
          onError={() => setBroken(true)}
          onLoad={(e) => {
            const img = e.currentTarget
            if (!d.naturalW && img.naturalWidth) onData({ naturalW: img.naturalWidth, naturalH: img.naturalHeight })
          }}
        />
      )}
      {editing ? (
        <div className="px-3 py-2" onPointerDown={stop}>
          <AutoTextarea className="text-[12.5px]" value={d.caption || ''} onChange={(v) => onData({ caption: v })} placeholder="Add a caption" autoFocus />
        </div>
      ) : d.caption || d.tags?.length ? (
        <div className="px-3 py-2">
          {d.caption && (
            <div dir="auto" className="text-[12.5px]" style={{ color: 'var(--text-2)' }}>
              {d.caption}
            </div>
          )}
          <Tags tags={d.tags} />
        </div>
      ) : null}
    </div>
  )
}

// ---------------- Link ----------------

function LinkCard({ card, editing, readOnly, onData }: CardContentProps) {
  const d = card.data
  const url = d.url ? normalizeUrl(d.url) : ''
  return (
    <div className="surface px-4 py-3.5">
      {editing ? (
        <div className="flex flex-col gap-2" onPointerDown={stop}>
          <input
            autoFocus
            className="ws-field"
            placeholder="https://"
            value={d.url || ''}
            onChange={(e) => onData({ url: e.target.value })}
            onBlur={(e) => e.target.value && onData({ url: normalizeUrl(e.target.value) })}
          />
          <input className="ws-field" placeholder="Title" value={d.title || ''} onChange={(e) => onData({ title: e.target.value })} />
          <AutoTextarea className="text-[12.5px]" value={d.description || ''} onChange={(v) => onData({ description: v })} placeholder="Description (optional)" />
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg" style={{ background: 'var(--card-2)', color: 'var(--tint, var(--muted))' }}>
            <Globe size={16} />
          </span>
          <div className="min-w-0 flex-1">
            {readOnly && url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" dir="auto" className="block break-words font-medium" style={{ color: 'var(--text)', textDecoration: 'none' }}>
                {d.title || hostOf(url) || 'Link'}
              </a>
            ) : (
              <div dir="auto" className="break-words font-medium">
                {d.title || hostOf(url) || 'Untitled link'}
              </div>
            )}
            {d.description && (
              <div dir="auto" className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-2)' }}>
                {d.description}
              </div>
            )}
            {readOnly ? (
              <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-[11.5px]" style={{ color: 'var(--link)' }}>
                {url}
              </a>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <span className="truncate text-[11.5px]" style={{ color: 'var(--muted)' }}>
                  {hostOf(url) || 'No URL'}
                </span>
                {url && (
                  <button
                    data-no-drag
                    className="ml-auto flex flex-none items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] hover:bg-white/5"
                    style={{ color: 'var(--link)' }}
                    onPointerDown={stop}
                    onClick={(e) => {
                      e.stopPropagation()
                      window.api.app.openExternal(url)
                    }}
                  >
                    Open <ExternalLink size={11} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <Tags tags={d.tags} />
    </div>
  )
}

// ---------------- File ----------------

const EXT_COLORS: Record<string, string> = {
  pdf: '#e5646e',
  blend: '#ec8a4b',
  aep: '#a58af0',
  prproj: '#a58af0',
  psd: '#6f9cf2',
  ai: '#e0b04f',
  docx: '#6f9cf2',
  doc: '#6f9cf2',
  xlsx: '#6cc28a',
  xls: '#6cc28a',
  pptx: '#ec8a4b',
  mp4: '#4fc1c0',
  mov: '#4fc1c0',
  zip: '#8a8a94'
}

function FileCard({ card, editing, readOnly, onData }: CardContentProps) {
  const d = card.data
  const ext = d.ext || fileExt(d.name)
  const col = EXT_COLORS[ext] || '#8a8a94'
  const act = async (kind: 'open' | 'reveal') => {
    const r = kind === 'open' ? await window.api.assets.open({ cardId: card.id }) : await window.api.assets.reveal({ cardId: card.id })
    if (!r.ok) {
      const { toast } = await import('../store/app')
      toast('error', r.error || 'Could not open the file')
    }
  }
  return (
    <div className="surface px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-9 flex-none flex-col items-center justify-center rounded-md text-[9px] font-bold uppercase" style={{ background: `${col}22`, color: col, border: `1px solid ${col}44` }}>
          <FileText size={14} />
          {ext.slice(0, 4)}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input autoFocus className="ws-field" value={d.name || ''} onPointerDown={stop} onChange={(e) => onData({ name: e.target.value })} />
          ) : (
            <div dir="auto" className="break-words font-medium">
              {d.name || 'File'}
            </div>
          )}
          <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--muted)' }}>
            {[formatBytes(d.size), d.assetId ? null : 'Reference'].filter(Boolean).join(' · ')}
          </div>
          {d.path && readOnly && (
            <div className="mt-1 break-all text-[10.5px]" style={{ color: 'var(--muted)' }}>
              {d.path}
            </div>
          )}
          {!readOnly && (
            <div className="mt-2 flex gap-1.5">
              <button data-no-drag className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11.5px] hover:bg-white/5" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-2)' }} onPointerDown={stop} onClick={(e) => (e.stopPropagation(), act('open'))}>
                <ExternalLink size={11} /> Open
              </button>
              <button data-no-drag className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11.5px] hover:bg-white/5" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-2)' }} onPointerDown={stop} onClick={(e) => (e.stopPropagation(), act('reveal'))}>
                <FolderOpen size={11} /> Show in folder
              </button>
            </div>
          )}
        </div>
      </div>
      <Tags tags={d.tags} />
    </div>
  )
}

// ---------------- Divider ----------------

function DividerCard() {
  return (
    <div className="ws-outline flex h-full items-center rounded-sm">
      <div className="h-px w-full" style={{ background: 'var(--tint, var(--border-strong))' }} />
    </div>
  )
}

// ---------------- Group ----------------

function GroupCard({ card, editing, onData }: CardContentProps) {
  return (
    <div
      className="ws-outline h-full w-full rounded-[14px] border"
      style={{
        background: card.color ? 'color-mix(in srgb, var(--tint) 5%, transparent)' : 'var(--group-bg)',
        borderColor: card.color ? 'color-mix(in srgb, var(--tint) 45%, var(--border))' : 'var(--border)'
      }}
    >
      <div className="px-4 pt-3">
        {editing ? (
          <input
            autoFocus
            className="ws-input text-[11.5px] font-semibold uppercase tracking-[0.12em]"
            value={card.data.title || ''}
            placeholder="Group"
            onPointerDown={stop}
            onChange={(e) => onData({ title: e.target.value })}
          />
        ) : (
          <div dir="auto" className="text-[11.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--tint, var(--muted))' }}>
            {card.data.title || 'Group'}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------- Swatch ----------------

function SwatchCard({ card, editing, onData }: CardContentProps) {
  const hex = card.data.hex || '#c9a96e'
  return (
    <div className="surface">
      <div style={{ background: hex, aspectRatio: '1 / 0.72' }} className="w-full" />
      <div className="px-3 py-2">
        {editing ? (
          <div className="flex flex-col gap-1.5" onPointerDown={stop}>
            <input autoFocus className="ws-field" placeholder="Name" value={card.data.name || ''} onChange={(e) => onData({ name: e.target.value })} />
            <div className="flex items-center gap-1.5">
              <input type="color" className="h-7 w-8 flex-none cursor-pointer rounded border-0 bg-transparent p-0" value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#c9a96e'} onChange={(e) => onData({ hex: e.target.value })} />
              <input className="ws-field font-mono" value={hex} onChange={(e) => onData({ hex: e.target.value })} />
            </div>
          </div>
        ) : (
          <>
            <div dir="auto" className="truncate text-[12.5px] font-medium">
              {card.data.name || 'Color'}
            </div>
            <div className="font-mono text-[11px] uppercase" style={{ color: 'var(--muted)' }}>
              {hex}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------- Shot list ----------------

function ShotlistCard({ card, editing, readOnly, onData }: CardContentProps) {
  const rows = card.data.rows ?? []
  const setRows = (next: ShotRow[], history = false) => onData({ rows: next }, history)
  const patchRow = (id: string, p: Partial<ShotRow>, history = false) => setRows(rows.map((r) => (r.id === id ? { ...r, ...p } : r)), history)
  const done = rows.filter((r) => r.done).length
  return (
    <div className="surface px-4 py-3.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        {editing ? (
          <input autoFocus className="ws-input font-semibold" value={card.data.title || ''} placeholder="Shot list" onPointerDown={stop} onChange={(e) => onData({ title: e.target.value })} />
        ) : (
          <div dir="auto" className="font-semibold">
            {card.data.title || 'Shot list'}
          </div>
        )}
        <span className="flex-none text-[11px]" style={{ color: 'var(--muted)' }}>
          {done}/{rows.length} shots
        </span>
      </div>
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="text-left text-[10.5px] uppercase tracking-[0.1em]" style={{ color: 'var(--muted)' }}>
            <th className="w-[54px] py-1 pr-2 font-semibold">Shot</th>
            <th className="py-1 pr-2 font-semibold">Description</th>
            <th className="w-[54px] py-1 pr-2 font-semibold">Dur.</th>
            <th className="w-[26px] py-1 font-semibold">✓</th>
            {editing && <th className="w-[22px]" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="align-top" style={{ borderTop: '1px solid var(--border)' }}>
              {editing ? (
                <>
                  <td className="py-1 pr-2" onPointerDown={stop}>
                    <input className="ws-input font-mono" value={r.shot} onChange={(e) => patchRow(r.id, { shot: e.target.value })} />
                  </td>
                  <td className="py-1 pr-2" onPointerDown={stop}>
                    <AutoTextarea value={r.desc} onChange={(v) => patchRow(r.id, { desc: v })} placeholder="Description" />
                  </td>
                  <td className="py-1 pr-2" onPointerDown={stop}>
                    <input className="ws-input" value={r.dur} onChange={(e) => patchRow(r.id, { dur: e.target.value })} />
                  </td>
                </>
              ) : (
                <>
                  <td className="py-1.5 pr-2 font-mono" style={{ color: 'var(--text-2)' }}>
                    {r.shot}
                  </td>
                  <td dir="auto" className={`py-1.5 pr-2 ${r.done ? 'line-through' : ''}`} style={r.done ? { color: 'var(--muted)' } : undefined}>
                    {r.desc}
                  </td>
                  <td className="py-1.5 pr-2" style={{ color: 'var(--text-2)' }}>
                    {r.dur}
                  </td>
                </>
              )}
              <td className="py-1.5">
                <CheckBox on={r.done} readOnly={readOnly} onToggle={() => patchRow(r.id, { done: !r.done }, true)} />
              </td>
              {editing && (
                <td className="py-1.5">
                  <button data-no-drag className="opacity-50 hover:opacity-100" onPointerDown={stop} onClick={() => setRows(rows.filter((x) => x.id !== r.id))}>
                    <Trash2 size={12} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <button
          data-no-drag
          className="mt-2 flex items-center gap-1.5 text-[12.5px]"
          style={{ color: 'var(--muted)' }}
          onPointerDown={stop}
          onClick={() => {
            const last = rows[rows.length - 1]
            const n = last && /^\d+$/.test(last.shot) ? String(Number(last.shot) + 10).padStart(last.shot.length, '0') : String((rows.length + 1) * 10).padStart(3, '0')
            setRows([...rows, { id: uid(), shot: n, desc: '', dur: '', done: false }])
          }}
        >
          <Plus size={13} /> Add shot
        </button>
      )}
      <Tags tags={card.data.tags} />
    </div>
  )
}

export function CardContent(p: CardContentProps) {
  switch (p.card.type) {
    case 'note':
      return <NoteCard {...p} />
    case 'heading':
      return <HeadingCard {...p} />
    case 'checklist':
      return <ChecklistCard {...p} />
    case 'task':
      return <TaskCard {...p} />
    case 'image':
      return <ImageCard {...p} />
    case 'link':
      return <LinkCard {...p} />
    case 'file':
      return <FileCard {...p} />
    case 'divider':
      return <DividerCard />
    case 'group':
      return <GroupCard {...p} />
    case 'swatch':
      return <SwatchCard {...p} />
    case 'shotlist':
      return <ShotlistCard {...p} />
    default:
      return (
        <div className="surface px-3 py-2 text-[12px]">
          <X size={12} /> Unknown card
        </div>
      )
  }
}
