import DOMPurify from 'dompurify'
import { customAlphabet } from 'nanoid'
import type { Card, CardType } from '@shared/types'

export const uid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12)

// The desktop app serves assets through its private protocol; the web viewer swaps in cloud URLs.
let assetResolver: ((id: string, kind: 'a' | 'p') => string) | null = null
export const setAssetResolver = (fn: (id: string, kind: 'a' | 'p') => string) => {
  assetResolver = fn
}
export const assetUrl = (id: string | undefined, kind: 'a' | 'p' = 'p'): string =>
  id ? (assetResolver ? assetResolver(id, kind) : `osama-asset://${kind}/${id}`) : ''

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v))

export const CARD_COLORS: { id: string; hex: string; name: string }[] = [
  { id: 'red', hex: '#e5646e', name: 'Red' },
  { id: 'orange', hex: '#ec8a4b', name: 'Orange' },
  { id: 'amber', hex: '#e0b04f', name: 'Amber' },
  { id: 'green', hex: '#6cc28a', name: 'Green' },
  { id: 'teal', hex: '#4fc1c0', name: 'Teal' },
  { id: 'blue', hex: '#6f9cf2', name: 'Blue' },
  { id: 'violet', hex: '#a58af0', name: 'Violet' },
  { id: 'pink', hex: '#e47ab8', name: 'Pink' },
  { id: 'grey', hex: '#8a8a94', name: 'Grey' }
]
export const colorHex = (id: string | null | undefined): string | null => (id ? CARD_COLORS.find((c) => c.id === id)?.hex ?? null : null)

export const PROJECT_COLORS = ['#c9a96e', '#e5646e', '#ec8a4b', '#6cc28a', '#4fc1c0', '#7aa2f7', '#a58af0', '#e47ab8', '#9a9aa4']
export const PROJECT_ICONS = ['✦', '🎬', '🦅', '📺', '🧊', '🎨', '💡', '🌙', '🏜️', '🌊', '✈️', '🚗', '🏛️', '📦', '🎞️', '📸', '🧪', '🪐', '🔥', '🌿', '⭐', '🗂️', '🎧', '🛰️']

export const NOTE_LABELS = ['Brief', 'Concept', 'Client feedback', 'Production note', 'Idea', 'Reference', 'Question']

export const STATUS_META = {
  todo: { label: 'To Do', color: '#8a8a94' },
  doing: { label: 'In Progress', color: '#e0b04f' },
  done: { label: 'Done', color: '#6cc28a' }
} as const

/** Card types whose height follows their content. */
export const isAutoHeight = (t: CardType): boolean => t !== 'group' && t !== 'divider'

export const MIN_W: Record<CardType, number> = {
  note: 160,
  heading: 120,
  checklist: 180,
  task: 200,
  image: 80,
  link: 200,
  file: 200,
  divider: 40,
  group: 160,
  swatch: 90,
  shotlist: 420
}

export const DEFAULT_SIZE: Record<CardType, { w: number; h: number }> = {
  note: { w: 300, h: 80 },
  heading: { w: 420, h: 50 },
  checklist: { w: 300, h: 120 },
  task: { w: 300, h: 100 },
  image: { w: 320, h: 220 },
  link: { w: 320, h: 110 },
  file: { w: 300, h: 80 },
  divider: { w: 480, h: 16 },
  group: { w: 520, h: 380 },
  swatch: { w: 130, h: 150 },
  shotlist: { w: 640, h: 220 }
}

export const sanitizeHtml = (html: string): string =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'div', 'span'],
    ALLOWED_ATTR: ['href', 'dir']
  })

export const htmlToText = (html: string): string => {
  const d = document.createElement('div')
  d.innerHTML = sanitizeHtml(html)
  return (d.textContent || '').replace(/\s+/g, ' ').trim()
}

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const textToHtml = (text: string): string =>
  text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')

export const formatBytes = (n: number | undefined): string => {
  if (!n && n !== 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export const timeAgo = (t: number | null | undefined): string => {
  if (!t) return 'never'
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d} d ago`
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export const formatDate = (t: number): string =>
  new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export const formatDue = (d: string | undefined): string => {
  if (!d) return ''
  const dt = new Date(`${d}T00:00:00`)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export const isUrl = (s: string): boolean => /^(https?:\/\/|www\.)[^\s]+$/i.test(s.trim())
export const normalizeUrl = (s: string): string => {
  const t = s.trim()
  if (!t) return ''
  return /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`
}
export const hostOf = (url: string | undefined): string => {
  if (!url) return ''
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export const cardTitle = (c: Card): string => {
  const d = c.data
  switch (c.type) {
    case 'note':
      return d.label || htmlToText(d.html || '').slice(0, 60) || 'Note'
    case 'heading':
      return d.text || 'Heading'
    case 'image':
      return d.caption || 'Image'
    case 'link':
      return d.title || hostOf(d.url) || 'Link'
    case 'file':
      return d.name || 'File'
    case 'swatch':
      return d.name || d.hex || 'Color'
    default:
      return d.title || c.type
  }
}

export const fileExt = (name: string | undefined): string => {
  const m = (name || '').match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : ''
}

export const greeting = (): string => {
  const h = new Date().getHours()
  if (h < 5) return 'Working late'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export const safeFileName = (s: string): string => s.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 150) || 'export'
