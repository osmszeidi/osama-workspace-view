import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { useApp } from '../store/app'

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#16161a" stroke="#2f2f37" />
      <circle cx="16" cy="16" r="8.2" fill="none" stroke="#ededf0" strokeWidth="2.6" />
      <circle cx="22.4" cy="9.6" r="2.4" fill="#c9a96e" />
    </svg>
  )
}

export function Modal({
  open,
  onClose,
  children,
  width = 480,
  className = ''
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  width?: number | string
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] fade-in" onMouseDown={onClose}>
      <div
        className={`pop-in rounded-xl border border-ink-700 bg-ink-850 shadow-pop text-ink-100 max-h-[92vh] flex flex-col ${className}`}
        style={{ width, maxWidth: '96vw' }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

export interface MenuItem {
  label?: string
  icon?: React.ReactNode
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  onClick?: () => void
  divider?: boolean
}

/** Dropdown menu anchored to an element or a point. */
export function Menu({
  anchor,
  items,
  onClose,
  align = 'left'
}: {
  anchor: { x: number; y: number } | HTMLElement
  items: MenuItem[]
  onClose: () => void
  align?: 'left' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: -9999, top: -9999 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let x: number, y: number
    if (anchor instanceof HTMLElement) {
      const r = anchor.getBoundingClientRect()
      x = align === 'right' ? r.right - el.offsetWidth : r.left
      y = r.bottom + 4
    } else {
      x = anchor.x
      y = anchor.y
    }
    x = Math.min(x, window.innerWidth - el.offsetWidth - 8)
    y = Math.min(y, window.innerHeight - el.offsetHeight - 8)
    setPos({ left: Math.max(8, x), top: Math.max(8, y) })
  }, [anchor, align])
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    setTimeout(() => window.addEventListener('mousedown', close), 0)
    window.addEventListener('keydown', key, true)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', key, true)
    }
  }, [onClose])
  return createPortal(
    <div
      ref={ref}
      className="fixed z-[120] min-w-[190px] rounded-lg border border-ink-700 bg-ink-850 p-1 shadow-pop pop-in"
      style={pos}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((it, i) =>
        it.divider ? (
          <div key={i} className="my-1 h-px bg-ink-750" />
        ) : (
          <button
            key={i}
            disabled={it.disabled}
            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 h-8 text-left text-[13px] disabled:opacity-40 ${
              it.danger ? 'text-[#ef7f88] hover:bg-[#e5646e1f]' : 'text-ink-200 hover:bg-ink-750 hover:text-ink-50'
            }`}
            onClick={() => {
              onClose()
              it.onClick?.()
            }}
          >
            <span className="w-4 flex items-center justify-center text-ink-400">{it.icon}</span>
            <span className="flex-1">{it.label}</span>
            {it.shortcut && <span className="text-[11px] text-ink-500">{it.shortcut}</span>}
          </button>
        )
      )}
    </div>,
    document.body
  )
}

export function useMenu() {
  const [menu, setMenu] = useState<{ anchor: HTMLElement | { x: number; y: number }; items: MenuItem[]; align?: 'left' | 'right' } | null>(null)
  const el = menu ? <Menu anchor={menu.anchor} items={menu.items} align={menu.align} onClose={() => setMenu(null)} /> : null
  return { open: setMenu, element: el }
}

export function Toasts() {
  const toasts = useApp((s) => s.toasts)
  const dismiss = useApp((s) => s.dismissToast)
  return (
    <div className="fixed bottom-4 right-4 z-[150] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          data-testid="toast"
          className="pointer-events-auto pop-in flex items-start gap-2.5 rounded-lg border border-ink-700 bg-ink-850 pl-3 pr-2 py-2.5 shadow-pop max-w-[420px] text-[13px] text-ink-100"
        >
          <span className="mt-0.5">
            {t.kind === 'success' ? (
              <Check size={15} className="text-[#6cc28a]" />
            ) : t.kind === 'error' ? (
              <AlertTriangle size={15} className="text-[#e5646e]" />
            ) : (
              <Info size={15} className="text-ink-400" />
            )}
          </span>
          <div className="flex-1 leading-snug">
            <div className="select-text">{t.text}</div>
            {t.actions && (
              <div className="mt-2 flex gap-1.5">
                {t.actions.map((a) => (
                  <button
                    key={a.label}
                    className="btn btn-outline h-7 text-[12px]"
                    onClick={() => {
                      a.run()
                      dismiss(t.id)
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="text-ink-500 hover:text-ink-200 p-0.5" onClick={() => dismiss(t.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function ConfirmDialog() {
  const req = useApp((s) => s.confirmReq)
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (req) setTimeout(() => btn.current?.focus(), 30)
  }, [req])
  return (
    <Modal open={!!req} onClose={() => req?.resolve(false)} width={420}>
      {req && (
        <div className="p-5">
          <div className="text-[15px] font-semibold text-ink-50">{req.title}</div>
          {req.body && <div className="mt-2 text-[13px] leading-relaxed text-ink-400">{req.body}</div>}
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => req.resolve(false)}>
              Cancel
            </button>
            <button ref={btn} data-testid="confirm-ok" className={`btn ${req.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => req.resolve(true)}>
              {req.confirmLabel || 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="h-12 w-12 rounded-xl border border-ink-700 bg-ink-850 flex items-center justify-center text-ink-400">{icon}</div>
      <div className="mt-4 text-[15px] font-semibold text-ink-100">{title}</div>
      {body && <div className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-400">{body}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Tip({ label, children }: { label: string; children: React.ReactElement }) {
  return <span title={label}>{children}</span>
}
